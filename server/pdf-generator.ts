import PDFDocument from "pdfkit";

export async function generatePaymentHistoryPDF(client: any, history: any[], credits: any[] = []): Promise<Buffer> {
  return new Promise((resolve, reject) => {
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
      
      // Calcular saldo total adeudado (suma de todos los créditos activos)
      const balanceDue = credits.reduce((sum: number, credit: any) => {
        const creditBalance = typeof credit.balance === 'string' ? parseFloat(credit.balance) : credit.balance;
        return credit.status === 'active' ? sum + creditBalance : sum;
      }, 0);
      
      // Mapeo de métodos de pago al español
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
      doc.fontSize(14).font('Helvetica-Bold').text('CréditoTienda', { align: 'center' });
      doc.fontSize(10).font('Helvetica').text('Sistema de Gestión de Créditos', { align: 'center' });
      doc.fontSize(9).font('Helvetica').text('Teléfono: +57 1 234 5678 | Email: info@creditotienda.com', { align: 'center' });
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

        // Función para dibujar fila de créditos
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
          
          // Concepto
          doc.text(concepto, x, y, { width: colWidths.concepto, align: 'left' });
          x += colWidths.concepto + 5;
          
          // Monto
          doc.text(monto, x, y, { width: colWidths.monto, align: 'right' });
          x += colWidths.monto + 5;
          
          // Saldo
          doc.text(saldo, x, y, { width: colWidths.saldo, align: 'right' });
          x += colWidths.saldo + 5;
          
          // Vencimiento
          doc.text(vencimiento, x, y, { width: colWidths.vencimiento, align: 'center' });
          
          y += isBold ? headerRowHeight : rowHeight;
        };

        // Encabezados de créditos
        doc.fontSize(10).font('Helvetica-Bold');
        const headerY = y;
        drawCreditRow('Concepto', 'Monto', 'Saldo Actual', 'Vencimiento', true);
        y = headerY + headerRowHeight;
        
        // Línea separadora
        doc.moveTo(startX, y - 5).lineTo(startX + pageWidth - 10, y - 5).stroke();
        y += 5;

        // Filas de créditos activos
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

        // Línea separadora final
        doc.moveTo(startX, y - 5).lineTo(startX + pageWidth - 10, y - 5).stroke();
        doc.moveDown(1);
      }

      // ============ TABLA DE HISTORIAL DE PAGOS ============
      doc.fontSize(12).font('Helvetica-Bold').text('Historial de Pagos', { underline: true });
      doc.moveDown(0.3);

      // Tabla de pagos con mejor formato
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

      // Función para dibujar una fila
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
        
        // Dibujar cada celda
        let x = startX;
        
        // Fecha
        doc.text(fecha, x, y, { width: colWidths.fecha, align: 'left' });
        x += colWidths.fecha + 5;
        
        // Concepto
        doc.text(concepto, x, y, { width: colWidths.concepto, align: 'left' });
        x += colWidths.concepto + 5;
        
        // Saldo Anterior
        doc.text(saldoAnterior, x, y, { width: colWidths.saldoAnterior, align: 'right' });
        x += colWidths.saldoAnterior + 5;
        
        // Pago
        doc.text(pago, x, y, { width: colWidths.pago, align: 'right' });
        x += colWidths.pago + 5;
        
        // Nuevo Saldo
        doc.text(nuevoSaldo, x, y, { width: colWidths.nuevoSaldo, align: 'right' });
        x += colWidths.nuevoSaldo + 5;
        
        // Forma de Pago
        doc.text(formaPago, x, y, { width: colWidths.formaPago, align: 'left' });
        x += colWidths.formaPago + 5;
        
        // Notas
        doc.text(notas, x, y, { width: colWidths.notas, align: 'left' });
        
        y += isBold ? headerRowHeight : rowHeight;
      };

      // Encabezados
      doc.fontSize(10).font('Helvetica-Bold');
      const headerY = y;
      drawRow('Fecha', 'Item donde se aplicó Pago', 'Saldo Anterior', 'Pago', 'Nuevo Saldo', 'Forma de Pago', 'Notas', true);
      y = headerY + headerRowHeight;
      
      // Línea separadora
      doc.moveTo(startX, y - 5).lineTo(startX + pageWidth - 10, y - 5).stroke();
      y += 5;

      // Filas de datos
      doc.fontSize(9).font('Helvetica');
      history.forEach((payment: any) => {
        const fecha = new Date(payment.createdAt).toLocaleDateString("es-CO");
        const saldoAnterior = `$${Number(payment.previousBalance).toLocaleString("es-CO")}`;
        const pago = `$${Number(payment.amount).toLocaleString("es-CO")}`;
        const nuevoSaldo = `$${Number(payment.newBalance).toLocaleString("es-CO")}`;
        // Traducir método de pago al español
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

      // Línea separadora final
      doc.moveTo(startX, y - 5).lineTo(startX + pageWidth - 10, y - 5).stroke();
      doc.moveDown(1);

      // ============ RESUMEN FINANCIERO ============
      doc.fontSize(12).font('Helvetica-Bold');
      doc.text(`Total Pagado: $${totalPaid.toLocaleString("es-CO")}`, startX, doc.y, { align: 'left' });
      doc.moveDown(0.5);
      
      // Saldo Por Pagar en nueva línea
      doc.text(`Saldo Por Pagar: $${balanceDue.toLocaleString("es-CO")}`, startX, doc.y, { align: 'left' });
      doc.moveDown(2);

      // ============ PIE DE PÁGINA ============
      const footerY = Math.max(doc.y + 20, doc.page.height - 80);
      doc.fontSize(9).font('Helvetica');
      doc.moveTo(startX, footerY - 10).lineTo(doc.page.width - startX, footerY - 10).stroke();
      doc.text('Este reporte fue generado automáticamente por el Sistema de Gestión de Créditos.', startX, footerY, { 
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
