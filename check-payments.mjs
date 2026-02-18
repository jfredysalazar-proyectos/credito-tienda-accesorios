import { getDb } from './server/db.ts';
import { payments } from './drizzle/schema.ts';
import { eq } from 'drizzle-orm';

async function checkPayments() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  // Obtener todos los pagos del cliente 3
  const allPayments = await db.select().from(payments).where(eq(payments.clientId, 3));
  
  console.log('Pagos del cliente 3:');
  allPayments.forEach((p, i) => {
    console.log(`${i+1}. Crédito ${p.creditId}: $${p.amount} - ${p.createdAt}`);
  });
}

checkPayments().catch(console.error);
