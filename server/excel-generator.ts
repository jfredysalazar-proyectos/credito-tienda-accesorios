import ExcelJS from 'exceljs';

export async function generateClientBackupExcel(client: any, transactions: any[]) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Credito Tienda Accesorios';
  workbook.lastModifiedBy = 'Credito Tienda Accesorios';
  workbook.created = new Date();
  workbook.modified = new Date();

  const sheet = workbook.addWorksheet('Historial de Cuenta');

  // Estilos
  const titleStyle: Partial<ExcelJS.Style> = {
    font: { bold: true, size: 14 },
    alignment: { horizontal: 'center' }
  };

  const headerStyle: Partial<ExcelJS.Style> = {
    font: { bold: true, color: { argb: 'FFFFFFFF' } },
    fill: {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF1E293B' } // Slate-800
    },
    alignment: { horizontal: 'center' }
  };

  // Información del Cliente
  sheet.mergeCells('A1:E1');
  const titleCell = sheet.getCell('A1');
  titleCell.value = `BACKUP DE CUENTA - ${client.name.toUpperCase()}`;
  titleCell.style = titleStyle;

  sheet.addRow(['Cédula/NIT:', client.cedula]);
  sheet.addRow(['WhatsApp:', client.whatsappNumber]);
  sheet.addRow(['Fecha de Backup:', new Date().toLocaleString()]);
  sheet.addRow([]); // Espacio

  // Tabla de Transacciones
  const headers = ['Fecha', 'Tipo', 'Concepto / Medio de Pago', 'Monto', 'Saldo Acumulado'];
  const headerRow = sheet.addRow(headers);
  headerRow.eachCell((cell) => {
    cell.style = headerStyle;
  });

  // Agregar transacciones
  transactions.forEach((t) => {
    const row = sheet.addRow([
      new Date(t.createdAt).toLocaleDateString(),
      t.type === 'prestamo' ? 'CRÉDITO' : 'ABONO',
      t.concept,
      t.amount,
      t.runningBalance
    ]);

    // Formato de moneda para columnas D y E
    const amountCell = row.getCell(4);
    const balanceCell = row.getCell(5);
    amountCell.numFmt = '"$"#,##0';
    balanceCell.numFmt = '"$"#,##0';

    // Color según tipo
    if (t.type === 'prestamo') {
      row.getCell(2).font = { color: { argb: 'FFDC2626' } }; // Rojo
    } else {
      row.getCell(2).font = { color: { argb: 'FF16A34A' } }; // Verde
    }
  });

  // Ajustar ancho de columnas
  sheet.getColumn(1).width = 15;
  sheet.getColumn(2).width = 12;
  sheet.getColumn(3).width = 40;
  sheet.getColumn(4).width = 15;
  sheet.getColumn(5).width = 18;

  // Generar buffer
  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

export async function generateGeneralBackupExcel(clientsWithData: any[]) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Credito Tienda Accesorios';
  workbook.created = new Date();

  const sheet = workbook.addWorksheet('Resumen General de Créditos');

  // Estilos
  const titleStyle: Partial<ExcelJS.Style> = {
    font: { bold: true, size: 16, color: { argb: 'FF1E3A8A' } },
    alignment: { horizontal: 'center' }
  };

  const headerStyle: Partial<ExcelJS.Style> = {
    font: { bold: true, color: { argb: 'FFFFFFFF' } },
    fill: {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF1E293B' }
    },
    alignment: { horizontal: 'center' }
  };

  // Título
  sheet.mergeCells('A1:G1');
  const titleCell = sheet.getCell('A1');
  titleCell.value = 'BACKUP GENERAL DE CLIENTES Y CRÉDITOS';
  titleCell.style = titleStyle;

  sheet.addRow(['Fecha de Generación:', new Date().toLocaleString()]);
  sheet.addRow([]);

  // Encabezados
  const headers = ['Nombre Cliente', 'Cédula/NIT', 'WhatsApp', 'Ciudad', 'Cupo Total', 'Saldo Adeudado', 'Cupo Disponible'];
  const headerRow = sheet.addRow(headers);
  headerRow.eachCell((cell) => {
    cell.style = headerStyle;
  });

  // Datos de Clientes
  clientsWithData.forEach((client) => {
    const row = sheet.addRow([
      client.name,
      client.cedula,
      client.whatsappNumber,
      client.city || 'N/A',
      client.creditLimit,
      client.totalDebt,
      client.creditLimit - client.totalDebt
    ]);

    // Formato moneda
    [5, 6, 7].forEach(col => {
      row.getCell(col).numFmt = '"$"#,##0';
    });

    // Color rojo si tiene deuda
    if (client.totalDebt > 0) {
      row.getCell(6).font = { color: { argb: 'FFDC2626' }, bold: true };
    }
  });

  // Totales al final
  sheet.addRow([]);
  const totalDebt = clientsWithData.reduce((acc, c) => acc + c.totalDebt, 0);
  const totalLimit = clientsWithData.reduce((acc, c) => acc + c.creditLimit, 0);
  
  const totalRow = sheet.addRow(['TOTALES GENERALES', '', '', '', totalLimit, totalDebt, totalLimit - totalDebt]);
  totalRow.font = { bold: true };
  [5, 6, 7].forEach(col => {
    totalRow.getCell(col).numFmt = '"$"#,##0';
  });

  // Ajustar anchos
  sheet.getColumn(1).width = 30;
  sheet.getColumn(2).width = 15;
  sheet.getColumn(3).width = 15;
  sheet.getColumn(4).width = 15;
  sheet.getColumn(5).width = 18;
  sheet.getColumn(6).width = 18;
  sheet.getColumn(7).width = 18;

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}
