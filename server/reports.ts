import { jsPDF } from "jspdf";
import { autoTable } from "jspdf-autotable";
import { getDb, getCompanyProfile } from "./db";
import { eq } from "drizzle-orm";
import { clients, credits, payments } from "../drizzle/schema";

async function addCompanyHeader(doc: jsPDF, userId: number): Promise<number> {
  const company = await getCompanyProfile(userId);
  let y = 15;
  
  if (company) {
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text(company.name, 105, y, { align: "center" });
    y += 7;
    
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`NIT/CC: ${company.nit}`, 105, y, { align: "center" });
    y += 5;
    
    doc.text(`${company.address}, ${company.city}`, 105, y, { align: "center" });
    y += 5;
    
    doc.text(`Tel: ${company.phone} | WhatsApp: ${company.whatsapp}`, 105, y, { align: "center" });
    y += 10;
    
    doc.setLineWidth(0.5);
    doc.line(14, y - 5, 196, y - 5);
  } else {
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text("CréditoTienda", 14, y);
    y += 10;
  }
  
  return y;
}

export async function generateOverdueCreditsReport(userId: number): Promise<Buffer> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const userClients = await db.select().from(clients).where(eq(clients.userId, userId));
  const clientIds = userClients.map(c => c.id);

  const allCredits = await db.select().from(credits);
  const overdueCredits = allCredits.filter(credit => {
    const dueDate = credit.dueDate ? new Date(credit.dueDate) : null;
    return dueDate && dueDate < new Date() && Number(credit.balance) > 0 && clientIds.includes(credit.clientId);
  });

  const doc = new jsPDF();
  let y = await addCompanyHeader(doc, userId);
  
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("Reporte de Créditos Vencidos", 14, y);
  y += 7;

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(`Fecha: ${new Date().toLocaleDateString("es-CO")}`, 14, y);
  y += 10;

  const tableData = overdueCredits.map(credit => {
    const client = userClients.find(c => c.id === credit.clientId);
    const dueDate = credit.dueDate ? new Date(credit.dueDate) : new Date();
    const daysOverdue = Math.floor((new Date().getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
    return [
      client?.name || "N/A",
      credit.concept,
      `$${Number(credit.amount).toLocaleString("es-CO")}`,
      `$${Number(credit.balance).toLocaleString("es-CO")}`,
      dueDate.toLocaleDateString("es-CO"),
      `${daysOverdue} días`,
    ];
  });

  autoTable(doc, {
    head: [["Cliente", "Concepto", "Monto Original", "Saldo", "Fecha Vencimiento", "Días Vencido"]],
    body: tableData,
    startY: y,
    styles: { fontSize: 9 },
  });

  return Buffer.from(doc.output("arraybuffer"));
}

export async function generateClientDebtReport(userId: number): Promise<Buffer> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const userClients = await db.select().from(clients).where(eq(clients.userId, userId));
  const allCredits = await db.select().from(credits);

  const clientDebts = userClients.map(client => {
    const clientCredits = allCredits.filter(c => c.clientId === client.id);
    const totalDebt = clientCredits.reduce((sum, c) => sum + Number(c.balance), 0);
    const totalCredit = clientCredits.reduce((sum, c) => sum + Number(c.amount), 0);
    return {
      ...client,
      totalDebt,
      totalCredit,
      utilizationPercent: totalCredit > 0 ? Math.round((totalDebt / Number(client.creditLimit)) * 100) : 0,
    };
  }).sort((a, b) => b.totalDebt - a.totalDebt);

  const doc = new jsPDF();
  let y = await addCompanyHeader(doc, userId);
  
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("Reporte de Deuda por Cliente", 14, y);
  y += 7;

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(`Fecha: ${new Date().toLocaleDateString("es-CO")}`, 14, y);
  y += 10;

  const tableData = clientDebts.map(client => [
    client.name,
    client.cedula,
    `$${Number(client.creditLimit).toLocaleString("es-CO")}`,
    `$${client.totalDebt.toLocaleString("es-CO")}`,
    `$${(Number(client.creditLimit) - client.totalDebt).toLocaleString("es-CO")}`,
    `${client.utilizationPercent}%`,
  ]);

  autoTable(doc, {
    head: [["Cliente", "Cédula", "Cupo Total", "Deuda Total", "Disponible", "% Utilización"]],
    body: tableData,
    startY: y,
    styles: { fontSize: 9 },
  });

  return Buffer.from(doc.output("arraybuffer"));
}

export async function generatePaymentAnalysisReport(userId: number): Promise<Buffer> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const userClients = await db.select().from(clients).where(eq(clients.userId, userId));
  const allPayments = await db.select().from(payments);
  const allCredits = await db.select().from(credits);

  const now = new Date();
  const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const thisYear = new Date(now.getFullYear(), 0, 1);

  const thisMonthPayments = allPayments.filter(p => new Date(p.createdAt) >= thisMonth);
  const lastMonthPayments = allPayments.filter(p => {
    const date = new Date(p.createdAt);
    return date >= lastMonth && date < thisMonth;
  });
  const thisYearPayments = allPayments.filter(p => new Date(p.createdAt) >= thisYear);

  const thisMonthTotal = thisMonthPayments.reduce((sum, p) => sum + Number(p.amount), 0);
  const lastMonthTotal = lastMonthPayments.reduce((sum, p) => sum + Number(p.amount), 0);
  const thisYearTotal = thisYearPayments.reduce((sum, p) => sum + Number(p.amount), 0);

  const doc = new jsPDF();
  let y = await addCompanyHeader(doc, userId);
  
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("Análisis de Pagos", 14, y);
  y += 7;

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(`Fecha: ${new Date().toLocaleDateString("es-CO")}`, 14, y);
  y += 10;

  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("Resumen de Pagos:", 14, y);
  y += 7;
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(`Pagos este mes: $${thisMonthTotal.toLocaleString("es-CO")}`, 14, y);
  y += 5;
  doc.text(`Pagos mes anterior: $${lastMonthTotal.toLocaleString("es-CO")}`, 14, y);
  y += 5;
  doc.text(`Pagos este año: $${thisYearTotal.toLocaleString("es-CO")}`, 14, y);
  y += 10;

  const paymentsByClient = userClients.map(client => {
    const clientPayments = allPayments.filter(p => {
      const credit = allCredits.find(c => c.id === p.creditId);
      return credit?.clientId === client.id;
    });
    const totalPaid = clientPayments.reduce((sum, p) => sum + Number(p.amount), 0);
    return [
      client.name,
      clientPayments.length.toString(),
      `$${totalPaid.toLocaleString("es-CO")}`,
    ];
  });

  autoTable(doc, {
    head: [["Cliente", "Cantidad de Pagos", "Total Pagado"]],
    body: paymentsByClient,
    startY: y,
    styles: { fontSize: 9 },
  });

  return Buffer.from(doc.output("arraybuffer"));
}
