import { eq, and, like, desc, sum } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, users, clients, credits, payments, whatsappLogs, InsertClient, InsertCredit, InsertPayment, InsertWhatsappLog } from "../drizzle/schema";
import { ENV } from './_core/env';

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

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
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

export async function getClientsByUserId(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return db.select().from(clients).where(eq(clients.userId, userId)).orderBy(desc(clients.createdAt));
}

export async function searchClients(userId: number, query: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const searchTerm = `%${query}%`;
  return db
    .select()
    .from(clients)
    .where(
      and(
        eq(clients.userId, userId),
        like(clients.name, searchTerm),
      )
    )
    .orderBy(desc(clients.createdAt));
}

export async function searchClientsByCedula(userId: number, cedula: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return db
    .select()
    .from(clients)
    .where(
      and(
        eq(clients.userId, userId),
        eq(clients.cedula, cedula),
      )
    )
    .limit(1);
}

export async function getClientById(clientId: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db
    .select()
    .from(clients)
    .where(
      and(
        eq(clients.id, clientId),
        eq(clients.userId, userId),
      )
    )
    .limit(1);

  return result.length > 0 ? result[0] : null;
}

export async function updateClient(clientId: number, userId: number, data: Partial<InsertClient>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return db
    .update(clients)
    .set(data)
    .where(
      and(
        eq(clients.id, clientId),
        eq(clients.userId, userId),
      )
    );
}

// ============ CREDIT FUNCTIONS ============

export async function createCredit(data: InsertCredit) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(credits).values(data);
  return result;
}

export async function getCreditsByClientId(clientId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return db
    .select()
    .from(credits)
    .where(eq(credits.clientId, clientId))
    .orderBy(desc(credits.createdAt));
}

export async function getCreditById(creditId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db
    .select()
    .from(credits)
    .where(eq(credits.id, creditId))
    .limit(1);

  return result.length > 0 ? result[0] : null;
}

export async function updateCredit(creditId: number, data: Partial<InsertCredit>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return db
    .update(credits)
    .set(data)
    .where(eq(credits.id, creditId));
}

export async function getActiveCredits(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return db
    .select()
    .from(credits)
    .innerJoin(clients, eq(credits.clientId, clients.id))
    .where(
      and(
        eq(clients.userId, userId),
        eq(credits.status, "active"),
      )
    )
    .orderBy(desc(credits.createdAt));
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

  return db
    .select()
    .from(payments)
    .where(eq(payments.creditId, creditId))
    .orderBy(desc(payments.createdAt));
}

export async function getPaymentsByClientId(clientId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return db
    .select()
    .from(payments)
    .where(eq(payments.clientId, clientId))
    .orderBy(desc(payments.createdAt));
}

export async function getTotalPaidByCreditId(creditId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db
    .select({ total: sum(payments.amount) })
    .from(payments)
    .where(eq(payments.creditId, creditId));

  return result[0]?.total ? Number(result[0].total) : 0;
}

// ============ WHATSAPP LOG FUNCTIONS ============

export async function createWhatsappLog(data: InsertWhatsappLog) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return db.insert(whatsappLogs).values(data);
}

export async function getWhatsappLogsByClientId(clientId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return db
    .select()
    .from(whatsappLogs)
    .where(eq(whatsappLogs.clientId, clientId))
    .orderBy(desc(whatsappLogs.createdAt));
}

export async function updateWhatsappLog(logId: number, data: Partial<InsertWhatsappLog>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return db
    .update(whatsappLogs)
    .set(data)
    .where(eq(whatsappLogs.id, logId));
}
