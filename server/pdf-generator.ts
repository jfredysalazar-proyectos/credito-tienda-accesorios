import PDFDocument from "pdfkit";

export async function generatePaymentHistoryPDF(client: any, history: any[]): Promise<Buffer> {
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

      // Encabezado
      doc.fontSize(18).font('Helvetica-Bold').text('Historial de Pagos', { align: 'center' });
      doc.moveDown(0.3);
      
      doc.fontSize(11).font('Helvetica');
      doc.text(`Cliente: ${client.name}`);
      doc.text(`Cédula: ${client.cedula}`);
      doc.text(`Teléfono: ${client.whatsappNumber}`);
      doc.text(`Fecha de Reporte: ${formattedDate}`);
      doc.moveDown(0.8);

      // Tabla de pagos con mejor formato
      const pageWidth = doc.page.width - 80; // 40 de margen en cada lado
      const colWidths = {
        fecha: 55,
        concepto: 110,
        saldoAnterior: 65,
        pago: 65,
        nuevoSaldo: 65,
        formaPago: 80,
        notas: 80
      };

      const startX = 40;
      const rowHeight = 20;
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
        
        y += rowHeight;
      };

      // Encabezados
      doc.fontSize(10).font('Helvetica-Bold');
      drawRow('Fecha', 'Concepto', 'Saldo Anterior', 'Pago', 'Nuevo Saldo', 'Forma de Pago', 'Notas', true);
      
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
        
        drawRow(
          fecha,
          payment.concept || '-',
          saldoAnterior,
          pago,
          nuevoSaldo,
          payment.paymentMethod || '-',
          payment.notes || '-'
        );
      });

      // Línea separadora final
      doc.moveTo(startX, y - 5).lineTo(startX + pageWidth - 10, y - 5).stroke();
      doc.moveDown(1);

      // Resumen - Total Pagado en su propia línea
      doc.fontSize(12).font('Helvetica-Bold');
      doc.text(`Total Pagado: $${totalPaid.toLocaleString("es-CO")}`, startX, doc.y, { align: 'left' });
      doc.moveDown(2);

      // Pie de página - ancho completo, centrado, siempre dentro de la página
      const footerY = Math.max(doc.y + 20, doc.page.height - 80); // Mínimo 80 puntos desde el fondo
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
