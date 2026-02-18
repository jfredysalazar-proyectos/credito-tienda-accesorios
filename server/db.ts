import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertClient, InsertCredit, InsertPayment, InsertWhatsappLog, clients, credits, payments, users, whatsappLogs } from "../drizzle/schema";

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db) {
    // Usar DATABASE_URL si está disponible, sino usar URL de fallback para Railway
    const dbUrl = process.env.DATABASE_URL || 
      (process.env.NODE_ENV === 'production' 
        ? 'mysql://root:XbTyOVFHuKfMCIQpkZTwPgATTciuirfi@ballast.proxy.rlwy.net:42043/railway'
        : null);
    
    if (dbUrl) {
      try {
        _db = drizzle(dbUrl);
        console.log("[Database] Connected successfully");
      } catch (error) {
        console.warn("[Database] Failed to connect:", error);
        _db = null;
      }
    } else {
      console.warn("[Database] No DATABASE_URL configured");
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

export async function updateClient(clientId: number, userId: number, data: Partial<Omit<InsertClient, 'userId'>>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Verificar que el cliente pertenece al usuario
  const client = await getClientById(clientId, userId);
  if (!client) throw new Error("Cliente no encontrado");

  const result = await db
    .update(clients)
    .set(data)
    .where(eq(clients.id, clientId));

  return result;
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


// ============ GENERAL PAYMENT FUNCTION ============

export async function createGeneralPayment(
  clientId: number,
  amount: number,
  userId: number,
  paymentMethod: string = "cash",
  notes?: string
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Verificar que el cliente pertenece al usuario
  const client = await getClientById(clientId, userId);
  if (!client) throw new Error("Client not found");

  // Obtener créditos activos del cliente
  const allCredits = await db.select().from(credits);
  const activeCredits = allCredits.filter(
    (c) => c.clientId === clientId && c.status === "active"
  );

  if (activeCredits.length === 0) {
    throw new Error("No active credits found for this client");
  }

  let remainingAmount = amount;
  const paymentsToCreate: InsertPayment[] = [];
  const creditsToUpdate: Array<{ id: number; newBalance: number }> = [];

  // Distribuir el pago entre los créditos activos
  for (const credit of activeCredits) {
    if (remainingAmount <= 0) break;

    const creditBalance = Number(credit.balance);
    const paymentAmount = Math.min(remainingAmount, creditBalance);
    const newBalance = Math.max(0, creditBalance - paymentAmount);

    // Crear pago para este crédito
    paymentsToCreate.push({
      creditId: credit.id,
      clientId: clientId,
      amount: paymentAmount.toString(),
      paymentMethod: paymentMethod,
      notes: notes,
      createdAt: new Date(),
    });

    // Registrar actualización de balance
    creditsToUpdate.push({
      id: credit.id,
      newBalance,
    });

    remainingAmount -= paymentAmount;
  }

  // Insertar todos los pagos
  if (paymentsToCreate.length > 0) {
    await db.insert(payments).values(paymentsToCreate);
  }

  // Actualizar balance de los créditos
  for (const credit of creditsToUpdate) {
    await db
      .update(credits)
      .set({ balance: credit.newBalance.toString() })
      .where(eq(credits.id, credit.id));
  }

  return {
    success: true,
    paymentsCreated: paymentsToCreate.length,
    totalPaid: amount,
  };
}

// ============ GET PAYMENTS BY CREDIT ============

export async function getPaymentsByCredit(creditId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db
    .select()
    .from(payments)
    .where(eq(payments.creditId, creditId));

  return result;
}

// ============ GET PAYMENT HISTORY FOR CLIENT ============

export async function getPaymentHistoryByClient(clientId: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Verificar que el cliente pertenece al usuario
  const client = await getClientById(clientId, userId);
  if (!client) throw new Error("Client not found");

  // Obtener todos los créditos del cliente
  const clientCredits = await db
    .select()
    .from(credits)
    .where(eq(credits.clientId, clientId));

  // Obtener todos los pagos de los créditos del cliente
  const allPayments = await db
    .select()
    .from(payments)
    .where(eq(payments.clientId, clientId));

  // Ordenar pagos por fecha
  const sortedPayments = allPayments.sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );

  // Calcular saldos anteriores y nuevos para cada pago
  const paymentHistory = sortedPayments.map((payment, index) => {
    // Encontrar el crédito asociado
    const credit = clientCredits.find((c) => c.id === payment.creditId);
    if (!credit) return null;

    // Calcular saldo anterior
    let previousBalance = Number(credit.amount);
    
    // Restar todos los pagos anteriores a este
    for (let i = 0; i < index; i++) {
      if (sortedPayments[i]?.creditId === payment.creditId) {
        previousBalance -= Number(sortedPayments[i]!.amount);
      }
    }

    const paymentAmount = Number(payment.amount);
    const newBalance = Math.max(0, previousBalance - paymentAmount);

    return {
      id: payment.id,
      creditId: payment.creditId,
      clientId: payment.clientId,
      amount: paymentAmount,
      paymentMethod: payment.paymentMethod,
      notes: payment.notes,
      createdAt: payment.createdAt,
      previousBalance,
      newBalance,
      concept: credit.concept,
    };
  }).filter((p) => p !== null);

  return paymentHistory;
}
