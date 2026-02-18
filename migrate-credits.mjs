import { getDb } from './server/db.ts';
import { credits } from './drizzle/schema.ts';
import { eq, lte } from 'drizzle-orm';

async function migrateCredits() {
  try {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    // Actualizar todos los créditos con saldo <= 0 a estado "paid"
    const result = await db
      .update(credits)
      .set({ status: 'paid' })
      .where(lte(credits.balance, '0'));

    console.log('✅ Migración completada: créditos con saldo $0 actualizados a "Pagado"');
  } catch (error) {
    console.error('❌ Error en migración:', error);
    process.exit(1);
  }
}

migrateCredits();
