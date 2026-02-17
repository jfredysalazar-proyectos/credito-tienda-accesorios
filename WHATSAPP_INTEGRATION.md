# Integración con WhatsApp Cloud API

## Resumen

Para implementar el envío de mensajes de WhatsApp en esta aplicación, usaremos la **WhatsApp Cloud API** de Meta (Facebook). Esta es la solución oficial y recomendada para enviar mensajes automáticos.

## Requisitos Previos

1. Cuenta de Facebook o Meta
2. Registro como desarrollador en https://developers.facebook.com
3. Crear una aplicación de Meta con caso de uso "Conecta con los clientes a través de WhatsApp"
4. Número de teléfono de prueba para testing
5. Crear un usuario del sistema con token de acceso permanente

## Pasos de Configuración

### 1. Crear Aplicación Meta y Configurar WhatsApp

- Ir a https://developers.facebook.com/apps
- Crear nueva aplicación
- Seleccionar caso de uso "Conecta con los clientes a través de WhatsApp"
- Crear o seleccionar un Business Portfolio

### 2. Obtener Credenciales

Necesitaremos:
- `WHATSAPP_BUSINESS_ACCOUNT_ID`: ID de la cuenta de negocio de WhatsApp
- `WHATSAPP_PHONE_NUMBER_ID`: ID del número de teléfono de prueba
- `WHATSAPP_ACCESS_TOKEN`: Token de acceso permanente del usuario del sistema
- `WHATSAPP_PHONE_NUMBER`: Número de teléfono en formato internacional (ej: +57 para Colombia)

### 3. Crear Usuario del Sistema

En Meta Business Suite:
1. Ir a Configuración de la empresa → Usuarios del sistema
2. Crear nuevo usuario del sistema
3. Asignar activos (aplicación y cuenta de WhatsApp)
4. Generar token de acceso permanente con permisos:
   - `business_management`
   - `whatsapp_business_messaging`
   - `whatsapp_business_management`

## API Endpoints

### Enviar Mensaje de Texto

```bash
POST https://graph.facebook.com/v24.0/{PHONE_NUMBER_ID}/messages
Authorization: Bearer {ACCESS_TOKEN}
Content-Type: application/json

{
  "messaging_product": "whatsapp",
  "recipient_type": "individual",
  "to": "{RECIPIENT_PHONE_NUMBER}",
  "type": "text",
  "text": {
    "preview_url": true,
    "body": "Tu mensaje aquí"
  }
}
```

### Enviar Mensaje de Plantilla

```bash
POST https://graph.facebook.com/v24.0/{PHONE_NUMBER_ID}/messages
Authorization: Bearer {ACCESS_TOKEN}
Content-Type: application/json

{
  "messaging_product": "whatsapp",
  "to": "{RECIPIENT_PHONE_NUMBER}",
  "type": "template",
  "template": {
    "name": "template_name",
    "language": {
      "code": "es_ES"
    },
    "components": [
      {
        "type": "body",
        "parameters": [
          {
            "type": "text",
            "text": "parameter_value"
          }
        ]
      }
    ]
  }
}
```

## Respuesta Exitosa

```json
{
  "messaging_product": "whatsapp",
  "contacts": [
    {
      "input": "+57XXXXXXXXXX",
      "wa_id": "57XXXXXXXXXX"
    }
  ],
  "messages": [
    {
      "id": "wamid.XXX"
    }
  ]
}
```

## Webhooks

Para recibir notificaciones de estado de mensajes (entregado, leído, fallido):

1. Configurar endpoint de webhook en la aplicación Meta
2. Verificar token (webhook verification)
3. Procesar eventos de cambio de estado

Ejemplo de evento webhook:

```json
{
  "object": "whatsapp_business_account",
  "entry": [
    {
      "id": "215589313241560883",
      "changes": [
        {
          "value": {
            "messaging_product": "whatsapp",
            "metadata": {
              "display_phone_number": "15551797781",
              "phone_number_id": "7794189252778687"
            },
            "statuses": [
              {
                "id": "wamid.XXX",
                "status": "delivered",
                "timestamp": "1758254144"
              }
            ]
          },
          "field": "message_status"
        }
      ]
    }
  ]
}
```

## Tipos de Mensajes Soportados

- **Texto**: Mensajes simples de texto
- **Plantilla**: Mensajes pre-aprobados para marketing/notificaciones
- **Imagen**: Enviar imágenes
- **Audio**: Enviar archivos de audio
- **Documento**: Enviar documentos
- **Video**: Enviar videos
- **Ubicación**: Enviar coordenadas GPS
- **Contacto**: Enviar información de contacto
- **Interactivo**: Botones, listas, etc.

## Limitaciones

- Mensajes de texto fuera de ventana de 24h requieren plantillas pre-aprobadas
- Número de teléfono debe estar verificado
- Máximo 80 caracteres por línea en algunos tipos de mensajes
- Rate limiting: depende del nivel de negocio

## Implementación en Node.js

Usaremos `axios` o `node-fetch` para hacer las llamadas HTTP a la API de Meta.

```typescript
async function sendWhatsAppMessage(
  phoneNumber: string,
  message: string
): Promise<boolean> {
  try {
    const response = await axios.post(
      `https://graph.facebook.com/v24.0/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`,
      {
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: phoneNumber,
        type: "text",
        text: {
          preview_url: true,
          body: message,
        },
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}`,
          "Content-Type": "application/json",
        },
      }
    );
    return response.status === 200;
  } catch (error) {
    console.error("Error sending WhatsApp message:", error);
    return false;
  }
}
```

## Referencias

- Documentación oficial: https://developers.facebook.com/documentation/business-messaging/whatsapp/get-started
- API de envío de mensajes: https://developers.facebook.com/documentation/business-messaging/whatsapp/messages/send-messages
- Webhooks: https://developers.facebook.com/documentation/business-messaging/whatsapp/webhooks/overview/
