# Sistema de Gestión de Créditos - TODO

## Base de Datos y Backend
- [x] Crear esquema de base de datos con tablas: clientes, créditos, pagos
- [x] Implementar procedimientos de lectura/escritura en server/db.ts
- [x] Crear procedimientos tRPC para gestión de clientes
- [x] Crear procedimientos tRPC para gestión de créditos
- [x] Crear procedimientos tRPC para gestión de pagos
- [x] Implementar cálculos de saldo, días de crédito y cupo disponible

## Integración WhatsApp
- [x] Investigar opciones de integración con WhatsApp (API, servicios terceros)
- [ ] Configurar credenciales y secretos de WhatsApp
- [x] Implementar función para enviar mensajes por WhatsApp
- [x] Crear plantillas de mensajes de estado de cuenta

## Frontend - Autenticación
- [ ] Verificar que autenticación OAuth esté funcionando
- [ ] Crear página de login si es necesario

## Frontend - Gestión de Clientes
- [x] Crear página de listado de clientes
- [x] Crear formulario para crear nuevo cliente
- [ ] Crear formulario para editar cliente
- [x] Implementar búsqueda de clientes por nombre o cédula
- [x] Implementar búsqueda en tiempo real

## Frontend - Gestión de Créditos
- [x] Crear página de detalle de cliente con historial de créditos
- [x] Crear formulario para registrar nuevo crédito
- [x] Crear formulario para registrar abono/pago
- [x] Mostrar cálculos de saldo, días de crédito y cupo disponible

## Frontend - Dashboard
- [x] Crear dashboard con resumen de créditos activos
- [ ] Mostrar pagos pendientes
- [ ] Mostrar alertas de cupo
- [x] Mostrar estadísticas generales

## Frontend - Notificaciones WhatsApp
- [x] Implementar botón para enviar estado de cuenta manual
- [x] Integrar envío automático al registrar crédito
- [x] Integrar envío automático al registrar pago

## Testing
- [ ] Escribir tests para procedimientos tRPC
- [x] Escribir tests para funciones de WhatsApp
- [ ] Realizar pruebas de integración completa

## Documentación
- [x] Documentar configuración de WhatsApp
- [x] Documentar estructura de base de datos
- [x] Crear guía de uso del sistema
