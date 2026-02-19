import PDFDocument from "pdfkit";
import axios from "axios";

export async function generatePaymentHistoryPDF(client: any, history: any[], credits: any[] = [], company?: any): Promise<Buffer> {
  return new Promise(async (resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 40 });
      const chunks: Buffer[] = [];

      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      const now = new Date();
      const formattedDate = now.toLocaleDateString("es-CO", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });

      const totalPaid = history.reduce((sum: number, p: any) => sum + Number(p.amount), 0);
      
      const balanceDue = credits.reduce((sum: number, credit: any) => {
        const creditBalance = typeof credit.balance === 'string' ? parseFloat(credit.balance) : credit.balance;
        return credit.status === 'active' ? sum + creditBalance : sum;
      }, 0);
      
      const paymentMethodMap: Record<string, string> = {
        'cash': 'Efectivo',
        'transfer': 'Transferencia',
        'check': 'Cheque',
        'credit_card': 'Tarjeta de Crédito',
        'debit_card': 'Tarjeta Débito',
        'general_payment': 'Pago General',
        'other': 'Otro'
      };

      // ============ ENCABEZADO CON MEMBRETE ============
      
      // Intentar cargar el logo si existe
      if (company?.logoUrl) {
        try {
          const response = await axios.get(company.logoUrl, { responseType: 'arraybuffer' });
          const logoBuffer = Buffer.from(response.data, 'binary');
          doc.image(logoBuffer, 40, 40, { width: 60 });
          doc.moveDown(1);
        } catch (e) {
          console.error("Error cargando logo:", e);
        }
      }

      const companyName = company?.name || 'CréditoTienda';
      const companyNit = company?.nit ? `NIT/CC: ${company.nit}` : '';
      const companyAddress = company?.address || '';
      const companyCity = company?.city || '';
      const companyPhone = company?.phone || '+57 1 234 5678';
      const companyWhatsapp = company?.whatsapp || '';

      doc.fontSize(14).font('Helvetica-Bold').text(companyName, { align: 'center' });
      if (companyNit) {
        doc.fontSize(10).font('Helvetica').text(companyNit, { align: 'center' });
      }
      
      let contactInfo = '';
      if (companyAddress) contactInfo += companyAddress;
      if (companyCity) contactInfo += (contactInfo ? `, ${companyCity}` : companyCity);
      if (contactInfo) doc.fontSize(9).font('Helvetica').text(contactInfo, { align: 'center' });

      let phoneInfo = `Tel: ${companyPhone}`;
      if (companyWhatsapp) phoneInfo += ` | WhatsApp: ${companyWhatsapp}`;
      doc.fontSize(9).font('Helvetica').text(phoneInfo, { align: 'center' });
      
      doc.moveDown(0.5);
      
      // Línea separadora
      doc.moveTo(40, doc.y).lineTo(doc.page.width - 40, doc.y).stroke();
      doc.moveDown(0.8);

      // ============ INFORMACIÓN DEL CLIENTE ============
      doc.fontSize(11).font('Helvetica');
      doc.text(`Cliente: ${client.name}`);
      doc.text(`Cédula: ${client.cedula}`);
      doc.text(`Teléfono: ${client.whatsappNumber}`);
      doc.text(`Fecha de Reporte: ${formattedDate}`);
      doc.moveDown(0.8);

      // ============ TABLA DE CRÉDITOS ACTIVOS ============
      if (credits.length > 0) {
        doc.fontSize(12).font('Helvetica-Bold').text('Créditos Activos', { underline: true });
        doc.moveDown(0.3);

        const pageWidth = doc.page.width - 80;
        const colWidths = {
          concepto: 150,
          monto: 80,
          saldo: 80,
          vencimiento: 90
        };

        const startX = 40;
        const rowHeight = 20;
        const headerRowHeight = 28;
        let y = doc.y;

        const drawCreditRow = (
          concepto: string,
          monto: string,
          saldo: string,
          vencimiento: string,
          isBold: boolean = false
        ) => {
          const font = isBold ? 'Helvetica-Bold' : 'Helvetica';
          const fontSize = isBold ? 10 : 9;
          
          doc.fontSize(fontSize).font(font);
          
          let x = startX;
          doc.text(concepto, x, y, { width: colWidths.concepto, align: 'left' });
          x += colWidths.concepto + 5;
          doc.text(monto, x, y, { width: colWidths.monto, align: 'right' });
          x += colWidths.monto + 5;
          doc.text(saldo, x, y, { width: colWidths.saldo, align: 'right' });
          x += colWidths.saldo + 5;
          doc.text(vencimiento, x, y, { width: colWidths.vencimiento, align: 'center' });
          
          y += isBold ? headerRowHeight : rowHeight;
        };

        doc.fontSize(10).font('Helvetica-Bold');
        const headerY = y;
        drawCreditRow('Concepto', 'Monto', 'Saldo Actual', 'Vencimiento', true);
        y = headerY + headerRowHeight;
        
        doc.moveTo(startX, y - 5).lineTo(startX + pageWidth - 10, y - 5).stroke();
        y += 5;

        doc.fontSize(9).font('Helvetica');
        credits.filter((c: any) => c.status === 'active').forEach((credit: any) => {
          const monto = `$${Number(credit.amount).toLocaleString("es-CO")}`;
          const saldo = `$${Number(credit.balance).toLocaleString("es-CO")}`;
          const vencimiento = credit.dueDate 
            ? new Date(credit.dueDate).toLocaleDateString("es-CO")
            : 'N/A';
          
          drawCreditRow(
            credit.concept || '-',
            monto,
            saldo,
            vencimiento
          );
        });

        doc.moveTo(startX, y - 5).lineTo(startX + pageWidth - 10, y - 5).stroke();
        doc.moveDown(2.5); // Espacio adicional después de la tabla de créditos
      }

      // ============ TABLA DE HISTORIAL DE PAGOS ============
      doc.fontSize(12).font('Helvetica-Bold').text('Historial de Pagos', 40, doc.y, { underline: true, align: 'left' });
      doc.moveDown(0.5);

      const pageWidth = doc.page.width - 80;
      const colWidths = {
        fecha: 50,
        concepto: 130,
        saldoAnterior: 85,
        pago: 65,
        nuevoSaldo: 65,
        formaPago: 70,
        notas: 70
      };

      const startX = 40;
      const rowHeight = 20;
      const headerRowHeight = 28;
      let y = doc.y;

      const drawRow = (
        fecha: string,
        concepto: string,
        saldoAnterior: string,
        pago: string,
        nuevoSaldo: string,
        formaPago: string,
        notas: string,
        isBold: boolean = false
      ) => {
        const font = isBold ? 'Helvetica-Bold' : 'Helvetica';
        const fontSize = isBold ? 10 : 9;
        
        doc.fontSize(fontSize).font(font);
        
        let x = startX;
        doc.text(fecha, x, y, { width: colWidths.fecha, align: 'left' });
        x += colWidths.fecha + 5;
        doc.text(concepto, x, y, { width: colWidths.concepto, align: 'left' });
        x += colWidths.concepto + 5;
        doc.text(saldoAnterior, x, y, { width: colWidths.saldoAnterior, align: 'right' });
        x += colWidths.saldoAnterior + 5;
        doc.text(pago, x, y, { width: colWidths.pago, align: 'right' });
        x += colWidths.pago + 5;
        doc.text(nuevoSaldo, x, y, { width: colWidths.nuevoSaldo, align: 'right' });
        x += colWidths.nuevoSaldo + 5;
        doc.text(formaPago, x, y, { width: colWidths.formaPago, align: 'left' });
        x += colWidths.formaPago + 5;
        doc.text(notas, x, y, { width: colWidths.notas, align: 'left' });
        
        y += isBold ? headerRowHeight : rowHeight;
      };

      doc.fontSize(10).font('Helvetica-Bold');
      const headerY = y;
      drawRow('Fecha', 'Item donde se aplicó Pago', 'Saldo Anterior', 'Pago', 'Nuevo Saldo', 'Forma de Pago', 'Notas', true);
      y = headerY + headerRowHeight;
      
      doc.moveTo(startX, y - 5).lineTo(startX + pageWidth - 10, y - 5).stroke();
      y += 5;

      doc.fontSize(9).font('Helvetica');
      history.forEach((payment: any) => {
        const fecha = new Date(payment.createdAt).toLocaleDateString("es-CO");
        const saldoAnterior = `$${Number(payment.previousBalance).toLocaleString("es-CO")}`;
        const pago = `$${Number(payment.amount).toLocaleString("es-CO")}`;
        const nuevoSaldo = `$${Number(payment.newBalance).toLocaleString("es-CO")}`;
        const formaPagoEspanol = paymentMethodMap[payment.paymentMethod] || payment.paymentMethod || '-';
        
        drawRow(
          fecha,
          payment.concept || '-',
          saldoAnterior,
          pago,
          nuevoSaldo,
          formaPagoEspanol,
          payment.notes || '-'
        );
      });

      doc.moveTo(startX, y - 5).lineTo(startX + pageWidth - 10, y - 5).stroke();
      doc.moveDown(1);

      // ============ RESUMEN FINANCIERO ============
      doc.fontSize(12).font('Helvetica-Bold');
      doc.text(`Total Pagado: $${totalPaid.toLocaleString("es-CO")}`, startX, doc.y, { align: 'left' });
      doc.moveDown(0.5);
      
      doc.text(`Saldo Por Pagar: $${balanceDue.toLocaleString("es-CO")}`, startX, doc.y, { align: 'left' });
      doc.moveDown(2);

      // ============ PIE DE PÁGINA ============
      const footerY = Math.max(doc.y + 20, doc.page.height - 80);
      doc.fontSize(9).font('Helvetica');
      doc.moveTo(startX, footerY - 10).lineTo(doc.page.width - startX, footerY - 10).stroke();
      doc.text(`Este reporte fue generado automáticamente por ${companyName}.`, startX, footerY, { 
        width: pageWidth, 
        align: 'center' 
      });
      doc.text(`Generado el ${formattedDate}`, startX, footerY + 12, { 
        width: pageWidth, 
        align: 'center' 
      });

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}

export async function generateAccountStatementPDF(client: any, transactions: any[], summary: any, company?: any): Promise<Buffer> {
  return new Promise(async (resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 40, size: 'A4' });
      const chunks: Buffer[] = [];

      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      const now = new Date();
      const formattedDate = now.toLocaleDateString("es-CO", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      });

      // Colores y Estilos
      const primaryColor = "#004d40"; // Verde oscuro bancario
      const textColor = "#333333";

      // ============ ENCABEZADO ============
      let logoHeight = 0;
      if (company?.logoUrl) {
        try {
          const response = await axios.get(company.logoUrl, { responseType: 'arraybuffer' });
          const logoBuffer = Buffer.from(response.data, 'binary');
          doc.image(logoBuffer, 40, 40, { width: 50 });
          logoHeight = 55;
        } catch (e) {
          doc.fontSize(20).fillColor(primaryColor).font('Helvetica-Bold').text('III', 40, 40);
          logoHeight = 25;
        }
      } else {
        doc.fontSize(20).fillColor(primaryColor).font('Helvetica-Bold').text('III', 40, 40);
        logoHeight = 25;
      }

      doc.fontSize(22).fillColor(primaryColor).font('Helvetica-Bold').text('Estado de Cuenta', 200, 45, { align: 'right' });
      
      // Información de la Empresa (Debajo del Logo)
      const companyY = 40 + logoHeight + 5;
      doc.fontSize(9).fillColor(textColor).font('Helvetica-Bold').text(company?.name || 'CréditoTienda', 40, companyY);
      doc.font('Helvetica').fontSize(8);
      if (company?.nit) doc.text(`NIT/CC: ${company.nit}`, 40, doc.y + 2);
      if (company?.address) doc.text(company.address, 40, doc.y + 2);
      if (company?.city || company?.phone) doc.text(`${company?.city || ''} ${company?.phone || ''}`, 40, doc.y + 2);
      if (company?.whatsapp) doc.text(`WhatsApp: ${company.whatsapp}`, 40, doc.y + 2);

      // Información del Cliente y Periodo (Columna Derecha)
      const rightColX = 350;
      const clientY = 85; // Alineado con el bloque de la empresa aproximadamente
      
      doc.fontSize(10).fillColor(primaryColor).font('Helvetica-Bold').text('DATOS DEL CLIENTE', rightColX, clientY);
      doc.fontSize(10).fillColor(textColor).font('Helvetica-Bold').text(client.name.toUpperCase(), rightColX, doc.y + 5);
      doc.font('Helvetica').fontSize(9);
      doc.text(`C.C./NIT: ${client.cedula}`, rightColX, doc.y + 2);
      doc.text(`Tel: ${client.whatsappNumber}`, rightColX, doc.y + 2);
      
      doc.moveDown(1);
      doc.font('Helvetica-Bold').text('PERIODO DE CUENTA', rightColX);
      doc.font('Helvetica').text(`Fecha de corte: ${formattedDate}`, rightColX, doc.y + 2);
      doc.text(`ID Cliente: C-${client.id.toString().padStart(5, '0')}`, rightColX, doc.y + 2);

      doc.y = Math.max(doc.y, companyY + 60);
      doc.moveDown(1);
      doc.moveTo(40, doc.y).lineTo(555, doc.y).strokeColor('#cccccc').lineWidth(0.5).stroke();
      doc.moveDown(1);

      // ============ RESUMEN DE MOVIMIENTOS (Cuadros) ============
      const summaryY = doc.y;
      doc.fontSize(11).fillColor(primaryColor).font('Helvetica-Bold').text('Resumen de movimientos y saldo', 40, summaryY);
      doc.moveTo(40, summaryY + 15).lineTo(280, summaryY + 15).strokeColor(primaryColor).lineWidth(1).stroke();
      
      doc.fontSize(10).fillColor(textColor).font('Helvetica');
      doc.text('Cupo Total', 40, summaryY + 25);
      doc.text(`$${Number(client.creditLimit).toLocaleString("es-CO")}`, 200, summaryY + 25, { align: 'right', width: 80 });
      
      const row1Y = doc.y + 5;
      doc.text('Saldo Adeudado', 40, row1Y);
      doc.fillColor('#d32f2f').text(`$${summary.totalBalance.toLocaleString("es-CO")}`, 200, row1Y, { align: 'right', width: 80 });
      
      const row2Y = row1Y + 15;
      doc.fillColor(textColor).text('Cupo Disponible', 40, row2Y);
      const disponible = Number(client.creditLimit) - summary.totalBalance;
      doc.fillColor(disponible < 0 ? '#d32f2f' : '#2e7d32').text(`$${disponible.toLocaleString("es-CO")}`, 200, row2Y, { align: 'right', width: 80 });

      // Mensaje de estado
      doc.fontSize(11).fillColor(primaryColor).font('Helvetica-Bold').text('Estado de su Crédito', 315, summaryY);
      doc.moveTo(315, summaryY + 15).lineTo(555, summaryY + 15).strokeColor(primaryColor).lineWidth(1).stroke();
      
      doc.fontSize(10).fillColor(textColor).font('Helvetica');
      const statusText = summary.totalBalance > 0 ? "Cuenta con saldo pendiente" : "Cuenta al día";
      doc.text(statusText, 315, summaryY + 25);
      if (summary.totalBalance > 0) {
        doc.fontSize(8).text("Recuerde realizar sus abonos oportunamente para mantener su cupo disponible.", 315, doc.y + 5, { width: 240 });
      }

      doc.moveDown(4);

      // ============ DETALLE DE TRANSACCIONES ============
      doc.fontSize(12).fillColor(primaryColor).font('Helvetica-Bold').text('DETALLE DE TRANSACCIONES', 40, doc.y, { align: 'center' });
      doc.moveDown(0.5);

      // Encabezado de Tabla
      const tableTop = doc.y;
      doc.rect(40, tableTop, 515, 20).fill(primaryColor);
      doc.fontSize(9).fillColor('#ffffff').font('Helvetica-Bold');
      doc.text('Fecha', 45, tableTop + 6);
      doc.text('Concepto', 110, tableTop + 6);
      doc.text('Tipo', 330, tableTop + 6);
      doc.text('Monto', 410, tableTop + 6, { align: 'right', width: 60 });
      doc.text('Saldo', 485, tableTop + 6, { align: 'right', width: 60 });

      let currentY = tableTop + 20;
      doc.fontSize(9).fillColor(textColor).font('Helvetica');

      transactions.forEach((t, index) => {
        if (currentY > 700) {
          doc.addPage();
          currentY = 50;
          doc.rect(40, currentY, 515, 20).fill(primaryColor);
          doc.fillColor('#ffffff').font('Helvetica-Bold');
          doc.text('Fecha', 45, currentY + 6);
          doc.text('Concepto', 110, currentY + 6);
          doc.text('Tipo', 330, currentY + 6);
          doc.text('Monto', 410, currentY + 6, { align: 'right', width: 60 });
          doc.text('Saldo', 485, currentY + 6, { align: 'right', width: 60 });
          currentY += 20;
          doc.fillColor(textColor).font('Helvetica');
        }

        if (index % 2 === 0) {
          doc.rect(40, currentY, 515, 18).fill('#f9f9f9');
        }

        doc.fillColor(textColor);
        const dateStr = new Date(t.createdAt).toLocaleDateString("es-CO");
        doc.text(dateStr, 45, currentY + 5);
        doc.text(t.concept || '', 110, currentY + 5, { width: 210, height: 10, ellipsis: true });
        
        const isAbono = t.type === 'abono';
        doc.fillColor(isAbono ? '#2e7d32' : '#d32f2f');
        doc.text(isAbono ? 'Abono' : 'Préstamo', 330, currentY + 5);
        
        const montoStr = `${isAbono ? '' : '-'}$${Number(t.amount).toLocaleString("es-CO")}`;
        doc.text(montoStr, 410, currentY + 5, { align: 'right', width: 60 });
        
        doc.fillColor(textColor);
        doc.text(`$${Number(t.runningBalance).toLocaleString("es-CO")}`, 485, currentY + 5, { align: 'right', width: 60 });

        currentY += 18;
      });

      const footerY = 750;
      doc.fontSize(8).fillColor('#999999').font('Helvetica-Oblique');
      doc.rect(40, footerY, 515, 40).fill('#f5f5f5');
      doc.fillColor('#666666');
      const footerText = "Revisar las operaciones y transacciones de este estado de cuenta. Si dentro de los 25 días siguientes a su fecha de corte no hemos recibido sus observaciones por escrito, consideramos que han sido aceptadas y aprobadas por su persona.";
      doc.text(footerText, 50, footerY + 10, { width: 495, align: 'center' });

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}
