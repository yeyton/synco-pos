# Registro de Decisiones de Arquitectura (ADR) - Fulfillment

## ADR-001: Desacoplamiento de `fulfillments` de `orders`
*   **Decisión:** Crear las tablas `fulfillments` y `fulfillment_items` separadas de `orders` y `order_items`.
*   **Motivo:** Mantener intactos los registros contables/tributarios históricos de la venta (`orders`), permitiendo al mismo tiempo el manejo dinámico de operaciones físicas (reintentos de entrega, auditoría de tiempos, firmas y fotos).

## ADR-002: Estado `PICKED_UP` para Retiro en Local
*   **Decisión:** Usar `PICKED_UP` en lugar de `DELIVERED` para los pedidos de tipo `PICKUP`.
*   **Motivo:** Evitar distorsionar los indicadores SLA de transporte/ruta (los retiros en local no entran en estado `IN_TRANSIT`).

## ADR-003: Columnas Generadas para Consistencia de Checklist
*   **Decisión:** Definir `is_prepared` e `is_delivered` como `GENERATED ALWAYS AS (...) STORED` en PostgreSQL.
*   **Motivo:** Eliminar cualquier riesgo de desincronización entre las cantidades numéricas (`prepared_qty`) y los flags booleanos.

## ADR-004: Inmutabilidad de Auditoría por Trigger PL/pgSQL
*   **Decisión:** Implementar un trigger que cancele `UPDATE` o `DELETE` sobre `fulfillment_status_history`.
*   **Motivo:** Garantizar que los registros de auditoría sean legal y técnicamente inalterables por cualquier usuario o código de aplicación.

## ADR-005: Control de Concurrencia al Iniciar Alistamiento
*   **Decisión:** Usar `UPDATE ... WHERE status = 'PENDING'` atómico con respuesta HTTP 409 Conflict.
*   **Motivo:** Prevenir que dos trabajadores preparen el mismo pedido simultáneamente en bodegas concurridas.
