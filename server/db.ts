import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertClient, InsertCredit, InsertPayment, InsertWhatsappLog, clients, credits, payments, users, whatsappLogs } from "../drizzle/schema";

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

// ============ CLIENT FUNCTIONS ============

export async function createClient(userId: number, data: Omit<InsertClient, 'userId'>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(clients).values({
    ...data,
    userId,
  });

  return result;
}

export async function getClientById(clientId: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db
    .select()
    .from(clients)
    .where(eq(clients.id, clientId))
    .limit(1);

  if (result.length === 0) return undefined;

  // Verificar que el cliente pertenece al usuario
  if (result[0].userId !== userId) return undefined;

  return result[0];
}

export async function listClients(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return db.select().from(clients).where(eq(clients.userId, userId));
}

export async function searchClients(userId: number, query: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Buscar por nombre o cédula
  const results = await db
    .select()
    .from(clients)
    .where(eq(clients.userId, userId));

  const lowerQuery = query.toLowerCase();
  return results.filter(
    (client) =>
      client.name.toLowerCase().includes(lowerQuery) ||
      client.cedula.toLowerCase().includes(lowerQuery)
  );
}

// ============ CREDIT FUNCTIONS ============

export async function createCredit(data: InsertCredit) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return db.insert(credits).values(data);
}

export async function getCreditById(creditId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db
    .select()
    .from(credits)
    .where(eq(credits.id, creditId))
    .limit(1);

  return result.length > 0 ? result[0] : undefined;
}

export async function getCreditsbyClientId(clientId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return db.select().from(credits).where(eq(credits.clientId, clientId));
}

export async function updateCredit(creditId: number, data: Partial<InsertCredit>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return db.update(credits).set(data).where(eq(credits.id, creditId));
}

export async function getActiveCredits(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Obtener todos los clientes del usuario
  const userClients = await db
    .select()
    .from(clients)
    .where(eq(clients.userId, userId));

  const clientIds = userClients.map((c) => c.id);

  if (clientIds.length === 0) return [];

  // Obtener créditos activos de esos clientes
  const allCredits = await db.select().from(credits);
  return allCredits.filter((c) => clientIds.includes(c.clientId) && c.status === "active");
}

// ============ PAYMENT FUNCTIONS ============

export async function createPayment(data: InsertPayment) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return db.insert(payments).values(data);
}

export async function getPaymentsByCreditId(creditId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return db.select().from(payments).where(eq(payments.creditId, creditId));
}

// ============ WHATSAPP LOG FUNCTIONS ============

export async function createWhatsappLog(data: InsertWhatsappLog) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return db.insert(whatsappLogs).values(data);
}

export async function updateWhatsappLog(logId: number, data: Partial<InsertWhatsappLog>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return db.update(whatsappLogs).set(data).where(eq(whatsappLogs.id, logId));
}

// ============ DASHBOARD FUNCTIONS ============

export async function getDashboardSummary(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Obtener clientes del usuario
  const userClients = await db
    .select()
    .from(clients)
    .where(eq(clients.userId, userId));

  const clientIds = userClients.map((c) => c.id);

  if (clientIds.length === 0) {
    return {
      totalClients: 0,
      totalActiveCredits: 0,
      totalActiveAmount: 0,
      totalPendingBalance: 0,
    };
  }

  // Obtener créditos activos
  const allCredits = await db.select().from(credits);
  const activeCredits = allCredits.filter((c) => clientIds.includes(c.clientId) && c.status === "active");

  const totalActiveAmount = activeCredits.reduce((sum, c) => sum + Number(c.amount), 0);
  const totalPendingBalance = activeCredits.reduce((sum, c) => sum + Number(c.balance), 0);

  return {
    totalClients: userClients.length,
    totalActiveCredits: activeCredits.length,
    totalActiveAmount,
    totalPendingBalance,
  };
}
