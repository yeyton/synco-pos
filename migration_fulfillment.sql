-- ==============================================================================
-- MIGRATION: FULFILLMENT & DESPACHOS (CONSEGURIDAD, AUDITORÍA Y CONCURRENCIA)
-- ==============================================================================

-- 1. TIPOS Y ENUMS
DO $$ BEGIN
    CREATE TYPE fulfillment_type_enum AS ENUM ('DISPATCH', 'PICKUP');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE fulfillment_status_enum AS ENUM (
        'PENDING', 
        'PREPARING', 
        'PREPARED', 
        'IN_TRANSIT', 
        'DELIVERED', 
        'PICKED_UP', 
        'CANCELLED'
    );
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- 2. TABLA DE USUARIOS Y EMPLEADOS
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(150) NOT NULL,
    email VARCHAR(150) UNIQUE,
    pin_hash VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'OPERATOR',
    permissions JSONB NOT NULL DEFAULT '[]',
    failed_pin_attempts INT NOT NULL DEFAULT 0,
    locked_until TIMESTAMPTZ,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Insertar usuario por defecto si no existe (PIN por defecto: 1234)
INSERT INTO users (id, name, email, pin_hash, role, permissions)
VALUES (
    '99999999-8888-7777-6666-555555555555',
    'Operador Bodega',
    'bodega@synco.cl',
    '$2b$10$YaE5zULgQB1X0ocPwH7qBeRDOjFwwytpWxh7sB4iL0YkY8bl6EuVq', -- Hash bcrypt para '1234'
    'ADMIN',
    '["fulfillment:prepare", "fulfillment:confirm_prepared", "fulfillment:dispatch", "fulfillment:deliver"]'::jsonb
) ON CONFLICT (id) DO UPDATE SET pin_hash = EXCLUDED.pin_hash;

-- 3. CABECERA DE FULFILLMENT
CREATE TABLE IF NOT EXISTS fulfillments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL UNIQUE REFERENCES orders(id) ON DELETE CASCADE,
    type fulfillment_type_enum NOT NULL DEFAULT 'DISPATCH',
    status fulfillment_status_enum NOT NULL DEFAULT 'PENDING',
    
    -- Cobro contra entrega (COD)
    requires_collection BOOLEAN NOT NULL DEFAULT FALSE,
    collection_amount NUMERIC(14, 2) DEFAULT 0.00 CHECK (collection_amount >= 0),
    collection_method VARCHAR(50),
    collection_status VARCHAR(20) DEFAULT 'PENDING' CHECK (collection_status IN ('PENDING', 'COLLECTED')),
    
    -- Trazabilidad de Tiempos
    preparing_started_at TIMESTAMPTZ,
    prepared_at TIMESTAMPTZ,
    dispatched_at TIMESTAMPTZ,
    delivered_at TIMESTAMPTZ,
    
    -- Responsables
    preparing_started_by UUID REFERENCES users(id),
    prepared_by UUID REFERENCES users(id),
    dispatched_by UUID REFERENCES users(id),
    delivered_by UUID REFERENCES users(id),
    
    -- Entrega / Comprobante
    recipient_name VARCHAR(200),
    recipient_rut VARCHAR(12),
    recipient_signature_url TEXT,
    delivery_photo_url TEXT,
    delivery_notes TEXT,
    
    -- Control de Concurrencia Optimista
    version INT NOT NULL DEFAULT 1,
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. ITEMS DE CHECKLIST CON CONSISTENCIA MATEMÁTICA EN DB
CREATE TABLE IF NOT EXISTS fulfillment_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    fulfillment_id UUID NOT NULL REFERENCES fulfillments(id) ON DELETE CASCADE,
    order_item_id UUID NOT NULL REFERENCES order_items(id) ON DELETE RESTRICT,
    variant_id UUID NOT NULL REFERENCES product_variants(id) ON DELETE RESTRICT,
    
    required_qty NUMERIC(12, 3) NOT NULL CHECK (required_qty > 0),
    prepared_qty NUMERIC(12, 3) NOT NULL DEFAULT 0.000 CHECK (prepared_qty >= 0 AND prepared_qty <= required_qty),
    delivered_qty NUMERIC(12, 3) NOT NULL DEFAULT 0.000 CHECK (delivered_qty >= 0 AND delivered_qty <= required_qty),
    
    is_prepared BOOLEAN GENERATED ALWAYS AS (prepared_qty >= required_qty) STORED,
    is_delivered BOOLEAN GENERATED ALWAYS AS (delivered_qty >= required_qty) STORED,
    
    prepared_at TIMESTAMPTZ,
    prepared_by UUID REFERENCES users(id),
    delivered_at TIMESTAMPTZ,
    delivered_by UUID REFERENCES users(id),
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    CONSTRAINT uq_fulfillment_order_item UNIQUE (fulfillment_id, order_item_id)
);

-- 5. HISTORIAL DE AUDITORÍA INMUTABLE
CREATE TABLE IF NOT EXISTS fulfillment_status_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    fulfillment_id UUID NOT NULL REFERENCES fulfillments(id) ON DELETE CASCADE,
    previous_status fulfillment_status_enum,
    new_status fulfillment_status_enum NOT NULL,
    changed_by UUID NOT NULL REFERENCES users(id),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Trigger anti-manipulación de historial
CREATE OR REPLACE FUNCTION prevent_history_tampering()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'EL HISTORIAL DE AUDITORÍA ES INMUTABLE: No se permite editar o eliminar registros de auditoría (ID: %).', OLD.id;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_prevent_history_tampering ON fulfillment_status_history;
CREATE TRIGGER trg_prevent_history_tampering
BEFORE UPDATE OR DELETE ON fulfillment_status_history
FOR EACH ROW EXECUTE FUNCTION prevent_history_tampering();

-- ÍNDICES OPTIMIZADOS
CREATE INDEX IF NOT EXISTS idx_fulfillments_status ON fulfillments(status);
CREATE INDEX IF NOT EXISTS idx_fulfillments_order_id ON fulfillments(order_id);
CREATE INDEX IF NOT EXISTS idx_fulfillment_items_fulfillment ON fulfillment_items(fulfillment_id);
CREATE INDEX IF NOT EXISTS idx_fulfillment_history_fulfillment ON fulfillment_status_history(fulfillment_id);
