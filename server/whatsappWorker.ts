import { getDb } from "./db";
import { eq } from "drizzle-orm";
import { whatsappLogs, credits, clients, payments } from "../drizzle/schema";
import {
  sendWhatsAppMessage,
  generateStatementMessage,
  generateNewCreditMessage,
  generatePaymentReceivedMessage,
} from "./whatsapp";

/**
 * Procesar logs de WhatsApp pendientes y enviar mensajes
 */
export async function processWhatsAppQueue() {
  const db = await getDb();
  if (!db) {
    console.warn("[WhatsApp Worker] Database not available");
    return;
  }

  try {
    // Obtener logs pendientes
    const pendingLogs = await db
      .select()
      .from(whatsappLogs)
      .where(eq(whatsappLogs.status, "pending"))
      .limit(10); // Procesar máximo 10 a la vez

    for (const log of pendingLogs) {
      try {
        let messageContent = "";

        if (log.messageType === "new_credit" && log.creditId) {
          // Obtener información del crédito
          const credit = await db
            .select()
            .from(credits)
            .where(eq(credits.id, log.creditId))
            .limit(1);

          if (credit.length > 0) {
            const client = await db
              .select()
              .from(clients)
              .where(eq(clients.id, credit[0].clientId))
              .limit(1);

            if (client.length > 0) {
              messageContent = generateNewCreditMessage(
                client[0].name,
                credit[0].concept,
                Number(credit[0].amount),
                credit[0].creditDays,
                credit[0].dueDate || undefined
              );
            }
          }
        } else if (log.messageType === "payment_received" && log.creditId) {
          // Obtener información del pago
          const credit = await db
            .select()
            .from(credits)
            .where(eq(credits.id, log.creditId))
            .limit(1);

          if (credit.length > 0) {
            const client = await db
              .select()
              .from(clients)
              .where(eq(clients.id, credit[0].clientId))
              .limit(1);

            if (client.length > 0) {
              messageContent = generatePaymentReceivedMessage(
                client[0].name,
                Number(log.messageContent) || 0, // El monto se pasa en messageContent temporalmente
                Number(credit[0].balance),
                credit[0].concept
              );
            }
          }
        } else if (log.messageType === "manual_statement") {
          // Obtener estado de cuenta completo
          const client = await db
            .select()
            .from(clients)
            .where(eq(clients.id, log.clientId))
            .limit(1);

          if (client.length > 0) {
            const clientCredits = await db
              .select()
              .from(credits)
              .where(eq(credits.clientId, log.clientId));

            const totalBalance = clientCredits.reduce(
              (sum, credit) => sum + Number(credit.balance),
              0
            );

            messageContent = generateStatementMessage(
              client[0].name,
              clientCredits.map((credit) => ({
                concept: credit.concept,
                amount: Number(credit.amount),
                balance: Number(credit.balance),
                dueDate: credit.dueDate || undefined,
              })),
              totalBalance,
              Number(client[0].creditLimit)
            );
          }
        }

        if (messageContent) {
          // Enviar mensaje
          const result = await sendWhatsAppMessage(
            log.phoneNumber,
            messageContent,
            log.id
          );

          if (!result.success) {
            console.error(`[WhatsApp Worker] Failed to send message ${log.id}:`, result.error);
          }
        }
      } catch (error) {
        console.error(`[WhatsApp Worker] Error processing log ${log.id}:`, error);
        // Marcar como fallido
        await db
          .update(whatsappLogs)
          .set({
            status: "failed",
            errorMessage: error instanceof Error ? error.message : "Unknown error",
          })
          .where(eq(whatsappLogs.id, log.id));
      }
    }
  } catch (error) {
    console.error("[WhatsApp Worker] Error processing queue:", error);
  }
}

/**
 * Iniciar worker que procesa la cola de WhatsApp cada 30 segundos
 */
export function startWhatsAppWorker() {
  // Procesar inmediatamente
  processWhatsAppQueue();

  // Luego cada 30 segundos
  setInterval(() => {
    processWhatsAppQueue();
  }, 30000);

  console.log("[WhatsApp Worker] Started");
}
