import axios from "axios";
import { updateWhatsappLog } from "./db";

const WHATSAPP_API_URL = "https://graph.facebook.com/v24.0";
const PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID;
const ACCESS_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN;

/**
 * Enviar mensaje de texto por WhatsApp
 */
export async function sendWhatsAppMessage(
  phoneNumber: string,
  message: string,
  logId?: number
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    if (!PHONE_NUMBER_ID || !ACCESS_TOKEN) {
      console.warn("[WhatsApp] Credenciales no configuradas");
      if (logId) {
        await updateWhatsappLog(logId, {
          status: "failed",
          errorMessage: "Credenciales de WhatsApp no configuradas",
        });
      }
      return {
        success: false,
        error: "WhatsApp no está configurado",
      };
    }

    // Formatear número de teléfono (remover caracteres especiales)
    const formattedPhone = phoneNumber.replace(/\D/g, "");

    const response = await axios.post(
      `${WHATSAPP_API_URL}/${PHONE_NUMBER_ID}/messages`,
      {
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: formattedPhone,
        type: "text",
        text: {
          preview_url: false,
          body: message,
        },
      },
      {
        headers: {
          Authorization: `Bearer ${ACCESS_TOKEN}`,
          "Content-Type": "application/json",
        },
      }
    );

    const messageId = response.data?.messages?.[0]?.id;

    if (logId) {
      await updateWhatsappLog(logId, {
        status: "sent",
        sentAt: new Date(),
      });
    }

    return {
      success: true,
      messageId,
    };
  } catch (error: any) {
    const errorMessage = error.response?.data?.error?.message || error.message;
    console.error("[WhatsApp] Error sending message:", errorMessage);

    if (logId) {
      await updateWhatsappLog(logId, {
        status: "failed",
        errorMessage,
      });
    }

    return {
      success: false,
      error: errorMessage,
    };
  }
}

/**
 * Generar mensaje de estado de cuenta
 */
export function generateStatementMessage(
  clientName: string,
  credits: Array<{
    concept: string;
    amount: number;
    balance: number;
    dueDate?: Date;
  }>,
  totalBalance: number,
  creditLimit: number
): string {
  let message = `📋 *Estado de Cuenta - ${clientName}*\n\n`;

  if (credits.length === 0) {
    message += "✅ No tienes créditos activos.\n";
  } else {
    message += "*Créditos Activos:*\n";
    credits.forEach((credit, index) => {
      message += `${index + 1}. ${credit.concept}\n`;
      message += `   Monto: $${credit.amount.toLocaleString("es-CO")}\n`;
      message += `   Saldo: $${credit.balance.toLocaleString("es-CO")}\n`;
      if (credit.dueDate) {
        const dueDate = new Date(credit.dueDate);
        message += `   Vencimiento: ${dueDate.toLocaleDateString("es-CO")}\n`;
      }
      message += "\n";
    });
  }

  message += `*Resumen:*\n`;
  message += `Total Adeudado: $${totalBalance.toLocaleString("es-CO")}\n`;
  message += `Cupo Disponible: $${(creditLimit - totalBalance).toLocaleString("es-CO")}\n`;
  message += `Cupo Total: $${creditLimit.toLocaleString("es-CO")}\n\n`;
  message += `Para más información, contáctanos.\n`;
  message += `_Mensaje automático - No responder a este número_`;

  return message;
}

/**
 * Generar mensaje de nuevo crédito
 */
export function generateNewCreditMessage(
  clientName: string,
  concept: string,
  amount: number,
  creditDays: number,
  dueDate?: Date
): string {
  let message = `✅ *Nuevo Crédito Registrado*\n\n`;
  message += `Hola ${clientName},\n\n`;
  message += `Se ha registrado un nuevo crédito en tu cuenta:\n\n`;
  message += `*Concepto:* ${concept}\n`;
  message += `*Monto:* $${amount.toLocaleString("es-CO")}\n`;

  if (creditDays > 0) {
    message += `*Días de Crédito:* ${creditDays} días\n`;
  }

  if (dueDate) {
    const formattedDate = new Date(dueDate).toLocaleDateString("es-CO");
    message += `*Vencimiento:* ${formattedDate}\n`;
  }

  message += `\nPara ver tu estado de cuenta completo, accede a tu portal.\n`;
  message += `_Mensaje automático - No responder a este número_`;

  return message;
}

/**
 * Generar mensaje de pago recibido
 */
export function generatePaymentReceivedMessage(
  clientName: string,
  amount: number,
  newBalance: number,
  concept: string
): string {
  let message = `💰 *Pago Recibido*\n\n`;
  message += `Hola ${clientName},\n\n`;
  message += `Hemos recibido tu pago:\n\n`;
  message += `*Concepto:* ${concept}\n`;
  message += `*Monto Pagado:* $${amount.toLocaleString("es-CO")}\n`;
  message += `*Saldo Pendiente:* $${newBalance.toLocaleString("es-CO")}\n\n`;

  if (newBalance === 0) {
    message += `✅ ¡Crédito pagado completamente!\n\n`;
  }

  message += `Gracias por tu pago.\n`;
  message += `_Mensaje automático - No responder a este número_`;

  return message;
}
