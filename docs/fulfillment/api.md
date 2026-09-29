# Especificación de API Backend - Fulfillment

## Especificación de Endpoints (Fase 2)

Todos los endpoints requerirán la cabecera `Authorization: Bearer <JWT>` generada tras el inicio de sesión.

### Autenticación
*   `POST /api/v1/fulfillment/auth/login-pin`
    *   **Body:** `{ "pin": "1234" }`
    *   **Respuesta:** `{ "token": "jwt_token...", "user": { "id": "...", "name": "...", "role": "..." } }`

### Operaciones de Fulfillment
*   `GET /api/v1/fulfillment`
    *   Filtros query: `status`, `type` (`DISPATCH`/`PICKUP`), `search`.
*   `GET /api/v1/fulfillment/:id`
    *   Retorna detalle del fulfillment, checklist de preparación/entrega, alertas de cobro COD y auditoría.
*   `POST /api/v1/fulfillment/:id/start-preparing`
    *   Transición `PENDING` ➔ `PREPARING`.
    *   Responde 409 Conflict si ya está en preparación por otro usuario.
*   `PUT /api/v1/fulfillment/:id/items/:itemId/prepare`
    *   Actualiza `prepared_qty` para un ítem del checklist.
*   `POST /api/v1/fulfillment/:id/confirm-prepared`
    *   Transición `PREPARING` ➔ `PREPARED`. Valida 100% checklist.
*   `POST /api/v1/fulfillment/:id/dispatch`
    *   Transición `PREPARED` ➔ `IN_TRANSIT` (Acción UI: "Salir a ruta").
*   `PUT /api/v1/fulfillment/:id/items/:itemId/deliver`
    *   Actualiza `delivered_qty` para el checklist de entrega.
*   `POST /api/v1/fulfillment/:id/deliver`
    *   Transición `IN_TRANSIT` ➔ `DELIVERED` (Despacho) o `PREPARED` ➔ `PICKED_UP` (Retiro).
    *   Requiere firma, foto opcional y confirmación de cobro si era COD.
