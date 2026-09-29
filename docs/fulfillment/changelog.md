# Changelog del Módulo de Fulfillment

## [Validación Completa Fase 2] - 2026-09-22
### Añadido & Probado
- **Seguridad de PIN:**
  - Verificación de bloqueo de 15 minutos tras 5 intentos fallidos consecutivos (`ACCOUNT_LOCKED`).
  - Identificación y advertencia documentada sobre la cuenta de prueba dev (`bodega@synco.cl`).
- **Autorización RBAC (HTTP 403 Forbidden):**
  - Pruebas estrictas confirmando que tokens sin `fulfillment:prepare`, `fulfillment:confirm_prepared`, `fulfillment:dispatch` o `fulfillment:deliver` son rechazados con 403 Forbidden.
- **Pago Contra Entrega (COD):**
  - Validación de entrega rechazada (HTTP 400) si `requires_collection = true` y no se confirma el pago.
  - Registro exitoso de `collection_status = 'COLLECTED'` al confirmar recaudación.
- **Diferenciación PICKUP vs DISPATCH:**
  - Confirmado que los pedidos `PICKUP` finalizan en `PICKED_UP` y rechazan la acción `/dispatch` con HTTP 400.
- **Idempotencia (Double Tap):**
  - Confirmado que solicitudes duplicadas simultáneas retornan HTTP 409 Conflict sin generar eventos redundantes de auditoría.
- **Batería de Pruebas Automáticas Profunda (`test_fulfillment_phase2_deep.ts`):**
  - Ejecutada con 100% de éxito.

## [Fase 2] - 2026-09-22
### Añadido
- **Autenticación JWT & PIN:**
  - Endpoint `POST /api/v1/fulfillment/auth/login-pin` para inicio de sesión por PIN numérico con hash `bcrypt` y protección de intentos fallidos.
- **Servidor y Lógica de Negocio (`FulfillmentService.ts`):**
  - Implementación de máquina de estados estricta (`PENDING` ➔ `PREPARING` ➔ `PREPARED` ➔ `IN_TRANSIT` ➔ `DELIVERED` / `PICKED_UP`).
  - Control de concurrencia atómico con bloqueo 409 Conflict si un operario intenta preparar un pedido ya tomado por otro.
  - Validación estricta de checklist al 100% antes de confirmar preparación o entrega.
  - Validación obligatoria de cobro en pedidos con Pago Contra Entrega (COD).
  - Integración en `process_pos_sale` para auto-creación inmediata de fulfillment y checklist al vender con despacho o retiro.
- **Prueba de Integración E2E (`test_fulfillment_api.ts`):**
  - Validación automatizada de los 11 escenarios de la API (login, auto-creación, concurrencia 409, checklist 400, cambio a ruta y entrega final con auditoría).

## [Fase 1] - 2026-09-22
### Añadido
- **Migración DDL (`migration_fulfillment.sql`):**
  - Creación de enums: `fulfillment_type_enum`, `fulfillment_status_enum`.
  - Creación de tabla `users` con soporte de hash de PIN numérico y RBAC (`permissions JSONB`).
  - Creación de tabla `fulfillments` con columnas de trazabilidad de tiempo, usuarios responsables y flags de cobro contra entrega (`requires_collection`, `collection_amount`).
  - Creación de tabla `fulfillment_items` con restricción `UNIQUE (fulfillment_id, order_item_id)` y columnas generadas `is_prepared` e `is_delivered`.
  - Creación de tabla `fulfillment_status_history` para auditoría.
  - Implementación del trigger anti-manipulación `prevent_history_tampering()`.
- **Script de Verificación (`apply_fulfillment_migration.ts`):**
  - Verificación de conexión segura a Supabase.
  - Pruebas automáticas de rechazo de `UPDATE` y `DELETE` en la tabla de auditoría.
- **Documentación Completa (`docs/fulfillment/`):**
  - `architecture.md`, `database.md`, `api.md`, `workflows.md`, `decisions.md`, `changelog.md`.
## Fase 3 - Etapa 1: Arquitectura Base y Regresión del POS

- **Fecha:** 2026-09-22
- **Cambios Principales:**
  - Instalación de `react-router-dom` para manejar la navegación en el frontend.
  - Implementación de `AuthContext` usando Context API nativa de React (sin Zustand) para manejar la sesión global de manera sencilla.
  - Creación de vista de Login (`/login`) con teclado numérico táctil (Touch-First) conectado al endpoint `/api/v1/fulfillment/auth/login-pin`.
  - Creación del Hub Central (`/hub`) donde el usuario elige entre "Caja / POS" y "Preparación", validando roles (`hasFulfillmentPermission`).
  - Lógica de sesión estricta (logout limpia `localStorage` y el estado del `Context`, asegurando que no se mezclen usuarios).
  - Migración limpia de `App.tsx` original hacia `/pos` (`POSView`), reemplazando la constante quemada `DEFAULT_USER_ID` por el `user.id` del contexto autenticado en todo el flujo de ventas, borradores y checkout.
  - Creación de un esqueleto inicial para `/fulfillment`.
- **Estado Actual:** Listo para pruebas manuales de regresión en POS (ventas normales, con retiro, con despacho) y pruebas de inicio de sesión/cambio de usuario antes de proceder a la construcción de la UI de Fulfillment (Etapa 2).

## Fase 3 - Etapa 3: Mejora Radical de UI/UX (Operaci�n en Fulfillment)
- **Fecha:** 2026-09-22
- **Cambios Principales:**
  - Implementaci�n de Split-Pane din�mico en FulfillmentView.tsx para celulares y tablets.
  - Redise�o de FulfillmentList.tsx: Mayor contraste (border-l-8, scale), estado COD parpadeante y tarjetas totalmente seleccionables.
  - Redise�o de FulfillmentDetail.tsx: Priorizaci�n visual (Orden, Cliente, M�todo, Alerta), Checklist inmediato de solo lectura, y bot�n de acci�n principal [ INICIAR ] gigante.
  - Modificaci�n de Checklist.tsx a interacci�n de 1 solo toque, sin necesidad de +/-.
  - Creaci�n de botones filtros primarios (Retiros vs Despachos) y adaptaci�n de filtros secundarios de estado.
  - Correcci�n de tipado en componentes de frontend heredados de Fase 2 (CustomerSearchSection, CatalogSection).
