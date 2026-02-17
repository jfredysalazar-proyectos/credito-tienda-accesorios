# Sistema de Gestión de Créditos - Tienda de Accesorios

Un sistema web moderno y completo para gestionar créditos de clientes, con notificaciones automáticas por WhatsApp.

## 🎯 Características Principales

### Gestión de Clientes
- ✅ Crear y registrar clientes con información completa
- ✅ Búsqueda en tiempo real por nombre o cédula
- ✅ Gestión de cupo de crédito por cliente
- ✅ Contacto directo por WhatsApp

### Gestión de Créditos
- ✅ Registrar créditos manuales con concepto y valor
- ✅ Definir días de crédito (plazo de pago)
- ✅ Cálculo automático de saldo pendiente
- ✅ Seguimiento de estado de créditos (activo, pagado, vencido)

### Gestión de Pagos
- ✅ Registrar abonos y pagos parciales
- ✅ Múltiples métodos de pago (efectivo, transferencia, etc)
- ✅ Actualización automática de saldo
- ✅ Historial completo de pagos

### Notificaciones por WhatsApp
- ✅ Envío automático al registrar nuevo crédito
- ✅ Notificación automática de pago recibido
- ✅ Envío manual de estado de cuenta en cualquier momento
- ✅ Auditoría completa de mensajes enviados

### Dashboard
- ✅ Resumen de estadísticas principales
- ✅ Total de clientes y créditos activos
- ✅ Montos totales y saldos pendientes
- ✅ Acceso rápido a funciones principales

## 🚀 Tecnología

- **Frontend**: React 19 + Tailwind CSS 4 + TypeScript
- **Backend**: Express.js + tRPC + Node.js
- **Base de Datos**: MySQL/TiDB
- **Autenticación**: OAuth (Manus)
- **Notificaciones**: WhatsApp Cloud API (Meta)
- **UI Components**: shadcn/ui

## 📋 Requisitos Previos

- Node.js 18+
- MySQL 8.0+ o TiDB
- Cuenta de Meta para WhatsApp Business
- Número de teléfono verificado

## 🔧 Instalación Rápida

```bash
# Clonar repositorio
git clone <repository-url>
cd credito-tienda-accesorios

# Instalar dependencias
pnpm install

# Configurar variables de entorno
cp .env.example .env
# Editar .env con tus credenciales

# Crear base de datos
pnpm db:push

# Ejecutar en desarrollo
pnpm dev
```

La aplicación estará disponible en `http://localhost:3000`

## 📖 Documentación

- **[SETUP_GUIDE.md](./SETUP_GUIDE.md)** - Guía completa de configuración
- **[WHATSAPP_INTEGRATION.md](./WHATSAPP_INTEGRATION.md)** - Detalles de integración con WhatsApp

## 📱 Uso Principal

### 1. Crear Cliente
Registra un nuevo cliente con su nombre, cédula, número de WhatsApp y cupo de crédito.

### 2. Registrar Crédito
Crea un nuevo crédito especificando el concepto, monto y días de plazo. Se enviará notificación automática.

### 3. Registrar Pago
Registra un pago o abono. El saldo se actualiza automáticamente y se envía confirmación por WhatsApp.

### 4. Ver Estado de Cuenta
Visualiza en cualquier momento el estado completo del cliente o envía por WhatsApp.

## 🔐 Seguridad

- Autenticación OAuth integrada
- Autorización por usuario (cada usuario ve solo sus datos)
- Validación de todos los inputs
- Encriptación de datos sensibles
- HTTPS recomendado en producción

## 📊 Base de Datos

El sistema utiliza 5 tablas principales:

- **users**: Usuarios del sistema
- **clients**: Información de clientes
- **credits**: Créditos otorgados
- **payments**: Pagos realizados
- **whatsappLogs**: Auditoría de mensajes

## 🔄 Flujo de Notificaciones

1. **Nuevo Crédito**: Se crea un log pendiente
2. **Worker**: Procesa logs cada 30 segundos
3. **Generación**: Crea mensaje personalizado
4. **Envío**: Envía por WhatsApp Cloud API
5. **Actualización**: Marca como enviado o fallido

## 🐛 Solución de Problemas

### Los mensajes no se envían
- Verificar credenciales de WhatsApp en `.env`
- Revisar tabla `whatsappLogs` para errores
- Confirmar que el número de teléfono tiene formato correcto

### Error de base de datos
- Ejecutar `pnpm db:push` nuevamente
- Verificar conexión a MySQL
- Revisar credenciales en `DATABASE_URL`

## 📈 Próximas Mejoras

- [ ] Reportes y análisis avanzados
- [ ] Integración con métodos de pago en línea
- [ ] Notificaciones de vencimiento próximo
- [ ] Exportación de datos a Excel
- [ ] Aplicación móvil

## 📞 Soporte

Para reportar problemas o sugerencias, contactar al equipo de desarrollo.

## 📄 Licencia

Este proyecto es privado y confidencial.

---

**Versión**: 1.0.0  
**Última actualización**: Febrero 2026
