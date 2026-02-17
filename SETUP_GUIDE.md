# Guía de Configuración - Sistema de Gestión de Créditos

## Requisitos Previos

- Node.js 18+
- MySQL 8.0+ o TiDB compatible
- Cuenta de Meta (Facebook) para WhatsApp Cloud API
- Número de teléfono verificado para WhatsApp Business

## Instalación Inicial

### 1. Clonar el Repositorio

```bash
git clone <repository-url>
cd credito-tienda-accesorios
```

### 2. Instalar Dependencias

```bash
pnpm install
```

### 3. Configurar Variables de Entorno

Crear archivo `.env` en la raíz del proyecto con las siguientes variables:

```env
# Base de Datos
DATABASE_URL=mysql://usuario:contraseña@localhost:3306/credito_tienda

# Autenticación OAuth (Manus)
VITE_APP_ID=tu_app_id
OAUTH_SERVER_URL=https://api.manus.im
VITE_OAUTH_PORTAL_URL=https://login.manus.im
JWT_SECRET=tu_jwt_secret_aqui

# Información del Propietario
OWNER_OPEN_ID=tu_open_id
OWNER_NAME=Tu Nombre

# WhatsApp Cloud API
WHATSAPP_PHONE_NUMBER_ID=tu_phone_number_id
WHATSAPP_ACCESS_TOKEN=tu_access_token_aqui
WHATSAPP_BUSINESS_ACCOUNT_ID=tu_business_account_id

# APIs Internas de Manus
BUILT_IN_FORGE_API_URL=https://api.manus.im
BUILT_IN_FORGE_API_KEY=tu_api_key
VITE_FRONTEND_FORGE_API_URL=https://api.manus.im
VITE_FRONTEND_FORGE_API_KEY=tu_frontend_api_key

# Aplicación
PORT=3000
NODE_ENV=development
```

### 4. Configurar Base de Datos

```bash
pnpm db:push
```

Esto creará todas las tablas necesarias en la base de datos.

## Configuración de WhatsApp Cloud API

### Paso 1: Crear Aplicación Meta

1. Ir a https://developers.facebook.com/apps
2. Crear nueva aplicación
3. Seleccionar caso de uso "Conecta con los clientes a través de WhatsApp"
4. Crear o seleccionar un Business Portfolio

### Paso 2: Obtener Credenciales

1. En el panel de la aplicación, ir a "Casos de uso"
2. Seleccionar "Conecta con tus clientes a través de WhatsApp"
3. Hacer clic en "Personalizar" y seguir el inicio rápido
4. Obtener:
   - **WHATSAPP_PHONE_NUMBER_ID**: ID del número de teléfono
   - **WHATSAPP_BUSINESS_ACCOUNT_ID**: ID de la cuenta de negocio

### Paso 3: Crear Usuario del Sistema

1. Ir a Meta Business Suite
2. Configuración de la empresa → Usuarios del sistema
3. Crear nuevo usuario del sistema
4. Asignar activos (aplicación y cuenta de WhatsApp)
5. Generar token de acceso permanente con permisos:
   - `business_management`
   - `whatsapp_business_messaging`
   - `whatsapp_business_management`
6. Copiar el token en **WHATSAPP_ACCESS_TOKEN**

### Paso 4: Verificar Número de Teléfono

1. En el panel de WhatsApp, verificar el número de teléfono
2. Enviar mensaje de prueba para confirmar que funciona

## Ejecutar la Aplicación

### Desarrollo

```bash
pnpm dev
```

La aplicación estará disponible en `http://localhost:3000`

### Producción

```bash
pnpm build
pnpm start
```

## Estructura de la Aplicación

### Backend

- **`server/routers.ts`**: Procedimientos tRPC para todas las operaciones
- **`server/db.ts`**: Funciones de acceso a base de datos
- **`server/whatsapp.ts`**: Servicio de WhatsApp y generadores de mensajes
- **`server/whatsappWorker.ts`**: Worker que procesa la cola de mensajes

### Frontend

- **`client/src/pages/Dashboard.tsx`**: Panel principal con estadísticas
- **`client/src/pages/ClientsList.tsx`**: Listado y búsqueda de clientes
- **`client/src/pages/NewClient.tsx`**: Formulario para crear clientes
- **`client/src/pages/ClientDetail.tsx`**: Detalle de cliente con créditos y pagos

### Base de Datos

- **`users`**: Usuarios del sistema
- **`clients`**: Clientes registrados
- **`credits`**: Créditos otorgados
- **`payments`**: Pagos realizados
- **`whatsappLogs`**: Auditoría de mensajes de WhatsApp

## Flujos Principales

### 1. Crear Cliente

1. Ir a "Clientes" → "Nuevo Cliente"
2. Completar formulario con:
   - Nombre completo
   - Cédula (única)
   - Número de WhatsApp (con código de país)
   - Cupo de crédito máximo
3. Hacer clic en "Crear Cliente"

### 2. Registrar Crédito

1. Ir a detalle del cliente
2. Hacer clic en "Nuevo Crédito"
3. Completar:
   - Concepto (descripción del producto/servicio)
   - Monto del crédito
   - Días de crédito (plazo)
4. Hacer clic en "Registrar Crédito"
5. **Automáticamente** se enviará mensaje de WhatsApp al cliente

### 3. Registrar Pago

1. En detalle del cliente, buscar el crédito activo
2. Hacer clic en "Registrar Pago"
3. Completar:
   - Monto a pagar
   - Método de pago (efectivo, transferencia, etc)
   - Notas (opcional)
4. Hacer clic en "Registrar Pago"
5. **Automáticamente** se enviará confirmación de pago por WhatsApp

### 4. Enviar Estado de Cuenta Manual

1. En detalle del cliente
2. Hacer clic en "Enviar Estado de Cuenta"
3. Se enviará estado de cuenta completo por WhatsApp

## Monitoreo de Mensajes de WhatsApp

Los mensajes se procesan automáticamente cada 30 segundos. Para ver el estado:

1. Ir a base de datos → tabla `whatsappLogs`
2. Verificar estado: `pending`, `sent`, o `failed`
3. Si hay errores, revisar columna `errorMessage`

## Solución de Problemas

### Los mensajes de WhatsApp no se envían

1. Verificar que `WHATSAPP_ACCESS_TOKEN` es válido
2. Verificar que `WHATSAPP_PHONE_NUMBER_ID` es correcto
3. Verificar que el número de teléfono del cliente tiene formato correcto (con código de país)
4. Revisar logs en `whatsappLogs` para ver mensajes de error

### El cliente no recibe mensajes

1. Verificar que el número de WhatsApp es correcto
2. Verificar que el cliente tiene WhatsApp Business activo
3. Verificar que la cuenta de WhatsApp está verificada
4. Revisar que no hay límites de rate limiting

### Error de base de datos

1. Verificar conexión: `pnpm db:push`
2. Verificar que `DATABASE_URL` es correcta
3. Verificar credenciales de base de datos

## Seguridad

- **Autenticación**: Sistema OAuth de Manus
- **Autorización**: Cada usuario solo ve sus propios clientes y créditos
- **Datos sensibles**: Almacenar tokens en variables de entorno
- **HTTPS**: Usar en producción
- **Validación**: Todos los inputs se validan con Zod

## Mantenimiento

### Respaldar Base de Datos

```bash
mysqldump -u usuario -p credito_tienda > backup.sql
```

### Restaurar Base de Datos

```bash
mysql -u usuario -p credito_tienda < backup.sql
```

### Limpiar Logs Antiguos

```sql
DELETE FROM whatsappLogs WHERE createdAt < DATE_SUB(NOW(), INTERVAL 90 DAY);
```

## Soporte

Para reportar problemas o sugerencias, contactar al equipo de desarrollo.

## Licencia

Este proyecto es privado y confidencial.
