# Especificación Técnica de Base de Datos - Fulfillment

## Tablas Creadas en la Fase 1

### 1. `users`
Mantiene la información de usuarios/empleados del sistema con autenticación rápida basada en PIN para dispositivos compartidos.

> [!WARNING]
> **Seguridad en Producción / Cuenta DEV:**
> El usuario con ID `99999999-8888-7777-6666-555555555555` (email: `bodega@synco.cl`) fue creado con el PIN por defecto `'1234'` únicamente para pruebas de desarrollo local. **Antes de desplegar en producción, esta cuenta debe ser desactivada o su PIN debe ser rotado obligatoriamente.**

| Columna | Tipo | Restricciones | Descripción |
| :--- | :--- | :--- | :--- |
| `id` | `UUID` | `PRIMARY KEY DEFAULT gen_random_uuid()` | Identificador único. |
| `name` | `VARCHAR(150)` | `NOT NULL` | Nombre completo del trabajador. |
| `email` | `VARCHAR(150)` | `UNIQUE` | Correo electrónico opcional. |
| `pin_hash` | `VARCHAR(255)` | `NOT NULL` | Hash bcrypt del PIN numérico (10 rounds). |
| `role` | `VARCHAR(50)` | `NOT NULL DEFAULT 'OPERATOR'` | Rol del usuario (`ADMIN`, `PICKER`, `DRIVER`, `OPERATOR`). |
| `permissions` | `JSONB` | `NOT NULL DEFAULT '[]'` | Permisos RBAC (`fulfillment:prepare`, `fulfillment:confirm_prepared`, `fulfillment:dispatch`, `fulfillment:deliver`). |
| `failed_pin_attempts` | `INT` | `NOT NULL DEFAULT 0` | Contador de intentos fallidos consecutivos de PIN. |
| `locked_until` | `TIMESTAMPTZ` | | Timestamp hasta el cual la cuenta se encuentra bloqueada tras 5 fallos. |
| `is_active` | `BOOLEAN` | `NOT NULL DEFAULT TRUE` | Desactivación lógica de la cuenta. |

---

### 2. `fulfillments`
Cabecera principal de la operación logística.

| Columna | Tipo | Restricciones | Descripción |
| :--- | :--- | :--- | :--- |
| `id` | `UUID` | `PRIMARY KEY DEFAULT gen_random_uuid()` | ID de fulfillment. |
| `order_id` | `UUID` | `NOT NULL UNIQUE REFERENCES orders(id)` | Vínculo 1 a 1 con la orden. |
| `type` | `fulfillment_type_enum` | `NOT NULL DEFAULT 'DISPATCH'` | `'DISPATCH'` o `'PICKUP'`. |
| `status` | `fulfillment_status_enum` | `NOT NULL DEFAULT 'PENDING'` | Estado de la máquina de estados. |
| `requires_collection` | `BOOLEAN` | `NOT NULL DEFAULT FALSE` | Flag de pago contra entrega (COD). |
| `collection_amount` | `NUMERIC(14,2)` | `CHECK (collection_amount >= 0)` | Monto a cobrar en la entrega. |
| `collection_method` | `VARCHAR(50)` | | `'CASH_ON_DELIVERY'`, `'POS_ON_DELIVERY'`, etc. |
| `collection_status` | `VARCHAR(20)` | `CHECK (collection_status IN ('PENDING', 'COLLECTED'))` | Estado del cobro. |
| `preparing_started_at` | `TIMESTAMPTZ` | | Inicio de preparación (Inicio del cronómetro). |
| `prepared_at` | `TIMESTAMPTZ` | | Término de preparación. |
| `dispatched_at` | `TIMESTAMPTZ` | | Salida a ruta. |
| `delivered_at` | `TIMESTAMPTZ` | | Entrega final / Retiro. |
| `version` | `INT` | `NOT NULL DEFAULT 1` | Control de concurrencia optimista. |

---

### 3. `fulfillment_items`
Items del checklist operativo independientes de `order_items`.

| Columna | Tipo | Restricciones | Descripción |
| :--- | :--- | :--- | :--- |
| `id` | `UUID` | `PRIMARY KEY DEFAULT gen_random_uuid()` | ID del item. |
| `fulfillment_id` | `UUID` | `NOT NULL REFERENCES fulfillments(id)` | Vínculo con cabecera. |
| `order_item_id` | `UUID` | `NOT NULL REFERENCES order_items(id)` | Vínculo con item de orden original. |
| `required_qty` | `NUMERIC(12,3)` | `NOT NULL CHECK (required_qty > 0)` | Cantidad requerida. |
| `prepared_qty` | `NUMERIC(12,3)` | `CHECK (prepared_qty >= 0 AND <= required_qty)` | Cantidad preparada. |
| `delivered_qty` | `NUMERIC(12,3)` | `CHECK (delivered_qty >= 0 AND <= required_qty)` | Cantidad entregada. |
| `is_prepared` | `BOOLEAN` | `GENERATED ALWAYS AS (prepared_qty >= required_qty) STORED` | Booleano calculado automáticamente. |
| `is_delivered` | `BOOLEAN` | `GENERATED ALWAYS AS (delivered_qty >= required_qty) STORED` | Booleano calculado automáticamente. |

*   **Restricción Única:** `UNIQUE (fulfillment_id, order_item_id)` para garantizar exactamente 1 registro por item de venta.

---

### 4. `fulfillment_status_history`
Registro inmutable de auditoría.

| Columna | Tipo | Restricciones | Descripción |
| :--- | :--- | :--- | :--- |
| `id` | `UUID` | `PRIMARY KEY DEFAULT gen_random_uuid()` | ID del registro. |
| `fulfillment_id` | `UUID` | `NOT NULL REFERENCES fulfillments(id)` | ID de fulfillment. |
| `previous_status` | `fulfillment_status_enum` | | Estado anterior. |
| `new_status` | `fulfillment_status_enum` | `NOT NULL` | Estado nuevo. |
| `changed_by` | `UUID` | `NOT NULL REFERENCES users(id)` | Usuario autenticado actuante. |
| `notes` | `TEXT` | | Notas / Motivo. |

---

## Trigger Anti-Manipulación de Auditoría
```sql
CREATE OR REPLACE FUNCTION prevent_history_tampering()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'EL HISTORIAL DE AUDITORÍA ES INMUTABLE: No se permite editar o eliminar registros de auditoría (ID: %).', OLD.id;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_prevent_history_tampering
BEFORE UPDATE OR DELETE ON fulfillment_status_history
FOR EACH ROW EXECUTE FUNCTION prevent_history_tampering();
```
