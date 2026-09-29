# Flujos Operativos y Experiencia de Usuario (Workflows)

## 1. Flujo de Despacho a Domicilio (DISPATCH)

1.  **Ingreso del Pedido:** Se crea la orden en estado `PENDING` (`type = 'DISPATCH'`).
2.  **Alistamiento (Bodega):**
    *   El bodeguero inicia sesión con su PIN.
    *   Presiona **"Iniciar Alistamiento"** (Pasa a `PREPARING` y arranca el cronómetro).
    *   Marca cada ítem a medida que lo encuentra en los estantes.
    *   Presiona **"Confirmar Todo Preparado"** (Pasa a `PREPARED`).
3.  **Salida a Ruta (Repartidor):**
    *   El repartidor selecciona los paquetes listos.
    *   Presiona el botón **"Salir a ruta"** (Pasa a `IN_TRANSIT`, badge en UI: *"En camino"*).
4.  **Entrega en Domicilio:**
    *   Al llegar, la pantalla prioriza: Cliente, Dirección, Teléfono y la **Alerta Fija de Cobro**: `⚠️ COBRAR AL ENTREGAR: $50.000 (POS/Efectivo)`.
    *   Realiza el checklist de entrega.
    *   Solicita Nombre, RUT y Firma Digital del cliente (Foto opcional).
    *   Presiona **"Confirmar Entrega"** (Pasa a `DELIVERED`).

---

## 2. Flujo de Retiro en Local (PICKUP)

1.  **Ingreso del Pedido:** Se crea la orden en estado `PENDING` (`type = 'PICKUP'`).
2.  **Alistamiento:** Mismo checklist de preparación en bodega. Pasa a `PREPARED`.
3.  **Entrega en Mostrador:**
    *   El cliente se presenta en el local.
    *   El cajero busca la orden lista (`PREPARED`).
    *   Marca el checklist de entrega en el mostrador.
    *   Solicita firma digital del cliente.
    *   Presiona **"Confirmar Entrega en Mostrador"** (Pasa a `PICKED_UP`).
