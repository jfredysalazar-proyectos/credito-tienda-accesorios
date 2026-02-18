import PDFDocument from "pdfkit";

export async function generatePaymentHistoryPDF(client: any, history: any[]): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument();
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

      const totalPaid = history.reduce((sum, p) => sum + p.amount, 0);

      // Encabezado
      doc.fontSize(20).font('Helvetica-Bold').text('Historial de Pagos', { align: 'center' });
      doc.moveDown(0.5);
      doc.fontSize(12).font('Helvetica').text(`Cliente: ${client.name}`);
      doc.text(`Cédula: ${client.cedula}`);
      doc.text(`Teléfono: ${client.whatsappNumber}`);
      doc.text(`Fecha de Reporte: ${formattedDate}`);
      doc.moveDown(1);

      // Tabla de pagos
      const tableTop = doc.y;
      const col1 = 50;
      const col2 = 120;
      const col3 = 200;
      const col4 = 280;
      const col5 = 360;
      const col6 = 420;
      const col7 = 480;

      // Encabezados de tabla
      doc.fontSize(10).font('Helvetica-Bold');
      doc.text('Fecha', col1, tableTop);
      doc.text('Concepto', col2, tableTop);
      doc.text('Saldo Anterior', col3, tableTop);
      doc.text('Pago', col4, tableTop);
      doc.text('Nuevo Saldo', col5, tableTop);
      doc.text('Forma de Pago', col6, tableTop);
      doc.text('Notas', col7, tableTop);

      doc.moveTo(50, tableTop + 15).lineTo(550, tableTop + 15).stroke();
      doc.moveDown(1);

      // Filas de datos
      doc.fontSize(9).font('Helvetica');
      history.forEach((payment) => {
        const y = doc.y;
        const fecha = new Date(payment.createdAt).toLocaleDateString("es-CO");
        doc.text(fecha, col1, y, { width: 60 });
        doc.text(payment.concept, col2, y, { width: 70 });
        doc.text(`$${payment.previousBalance.toLocaleString("es-CO")}`, col3, y, { width: 70, align: 'right' });
        doc.text(`$${payment.amount.toLocaleString("es-CO")}`, col4, y, { width: 70, align: 'right' });
        doc.text(`$${payment.newBalance.toLocaleString("es-CO")}`, col5, y, { width: 70, align: 'right' });
        doc.text(payment.paymentMethod, col6, y, { width: 60 });
        doc.text(payment.notes || "-", col7, y, { width: 50 });
        doc.moveDown(0.8);
      });

      doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
      doc.moveDown(0.5);

      // Resumen
      doc.fontSize(12).font('Helvetica-Bold');
      doc.text(`Total Pagado: $${totalPaid.toLocaleString("es-CO")}`);
      doc.moveDown(1);

      // Pie de página
      doc.fontSize(10).font('Helvetica').text('Este reporte fue generado automáticamente por el Sistema de Gestión de Créditos.', { align: 'center' });
      doc.text(`Generado el ${formattedDate}`, { align: 'center' });

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}
