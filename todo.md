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


## Autenticación Independiente (Nueva)
- [x] Reemplazar OAuth de Manus con sistema de login propio
- [x] Crear tabla de usuarios con email/username y contraseña hasheada
- [x] Implementar procedimiento de login con validación
- [ ] Implementar procedimiento de registro de usuarios
- [x] Crear página de login con formulario
- [x] Crear usuario administrador por defecto (admin/admin123)
- [x] Implementar logout
- [x] Agregar validación de sesión en todas las rutas protegidas


### Correcciones Pendientes
- [x] Corregir menú de navegación lateral (mostrar opciones correctas en lugar de Page 1, Page 2)
- [x] Corregir error 404 después del login (redireccionamiento a ruta incorrecta)

- [x] Corregir error React #321 al crear crédito y registrar abono


## Nuevas Funcionalidades Solicitadas
- [x] Corregir error 404 en página raíz (redirigir a dashboard)
- [x] Agregar acceso rápido "Nuevo Crédito" en menú lateral con selector de cliente
- [x] Dashboard como página principal en la raíz
- [x] Agregar edición de clientes con formulario modal
- [x] Crear reportes exportables en PDF
- [ ] Implementar alertas de vencimiento por WhatsApp

- [x] Agregar fecha de creación del crédito en tabla de Créditos Registrados


## Nuevas Mejoras Solicitadas
- [x] Implementar historial de pagos expandible en tabla de créditos
- [x] Agregar opción de pago general a la deuda del cliente
- [x] Distribuir pagos generales entre créditos activos automáticamente
- [x] Registrar todos los pagos con fecha exacta

## Optimización Responsive para Móvil
- [x] Ajustar layouts para pantallas pequeñas (< 640px)
- [x] Optimizar tablas para visualización móvil
- [x] Ajustar tamaños de botones y espacios
- [x] Hacer responsive los diálogos modales
- [x] Optimizar formularios para móvil
- [x] Ajustar navegación lateral para móvil
- [ ] Probar en dispositivos reales
