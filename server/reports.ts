import { jsPDF } from "jspdf";
import "jspdf-autotable";
import { getDb } from "./db";
import { eq } from "drizzle-orm";
import { clients, credits, payments } from "../drizzle/schema";

interface CreditWithPayments {
  id: number;
  clientId: number;
  concept: string;
  amount: string;
  balance: string;
  creditDays: number;
  createdAt: Date;
  dueDate: Date;
}

interface ClientInfo {
  id: number;
  name: string;
  cedula: string;
  creditLimit: string;
}

export async function generateOverdueCreditsReport(userId: number): Promise<Buffer> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Obtener créditos vencidos
  const userClients = await db.select().from(clients).where(eq(clients.userId, userId));
  const clientIds = userClients.map(c => c.id);

  const allCredits = await db.select().from(credits);
  const overdueCredits = allCredits.filter(credit => {
    const dueDate = credit.dueDate ? new Date(credit.dueDate) : null;
    return dueDate && dueDate < new Date() && Number(credit.balance) > 0 && clientIds.includes(credit.clientId);
  });

  // Crear PDF
  const doc = new jsPDF();
  doc.setFontSize(16);
  doc.text("Reporte de Créditos Vencidos", 14, 15);

  doc.setFontSize(10);
  doc.text(`Fecha: ${new Date().toLocaleDateString("es-CO")}`, 14, 25);

  // Tabla de créditos vencidos
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

  (doc as any).autoTable({
    head: [["Cliente", "Concepto", "Monto Original", "Saldo", "Fecha Vencimiento", "Días Vencido"]],
    body: tableData,
    startY: 35,
    styles: { fontSize: 9 },
  });

  return Buffer.from(doc.output("arraybuffer"));
}

export async function generateClientDebtReport(userId: number): Promise<Buffer> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const userClients = await db.select().from(clients).where(eq(clients.userId, userId));
  const allCredits = await db.select().from(credits);

  // Calcular deuda por cliente
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

  // Crear PDF
  const doc = new jsPDF();
  doc.setFontSize(16);
  doc.text("Reporte de Deuda por Cliente", 14, 15);

  doc.setFontSize(10);
  doc.text(`Fecha: ${new Date().toLocaleDateString("es-CO")}`, 14, 25);

  // Tabla de deudas
  const tableData = clientDebts.map(client => [
    client.name,
    client.cedula,
    `$${Number(client.creditLimit).toLocaleString("es-CO")}`,
    `$${client.totalDebt.toLocaleString("es-CO")}`,
    `$${(Number(client.creditLimit) - client.totalDebt).toLocaleString("es-CO")}`,
    `${client.utilizationPercent}%`,
  ]);

  (doc as any).autoTable({
    head: [["Cliente", "Cédula", "Cupo Total", "Deuda Total", "Disponible", "% Utilización"]],
    body: tableData,
    startY: 35,
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

  // Análisis de pagos por período
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

  // Crear PDF
  const doc = new jsPDF();
  doc.setFontSize(16);
  doc.text("Análisis de Pagos", 14, 15);

  doc.setFontSize(10);
  doc.text(`Fecha: ${new Date().toLocaleDateString("es-CO")}`, 14, 25);

  // Resumen
  doc.setFontSize(11);
  doc.text("Resumen de Pagos:", 14, 40);
  doc.setFontSize(10);
  doc.text(`Pagos este mes: $${thisMonthTotal.toLocaleString("es-CO")}`, 14, 50);
  doc.text(`Pagos mes anterior: $${lastMonthTotal.toLocaleString("es-CO")}`, 14, 60);
  doc.text(`Pagos este año: $${thisYearTotal.toLocaleString("es-CO")}`, 14, 70);

  // Tabla de pagos por cliente
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

  (doc as any).autoTable({
    head: [["Cliente", "Cantidad de Pagos", "Total Pagado"]],
    body: paymentsByClient,
    startY: 85,
    styles: { fontSize: 9 },
  });

  return Buffer.from(doc.output("arraybuffer"));
}
