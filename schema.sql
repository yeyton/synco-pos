-- ==============================================================================
-- DEFINITIVE POSTGRESQL SCHEMAS FOR HIGH-CONCURRENCY OMNICHANNEL POS & DTE (CHILE)
-- Compatible with Supabase (Free Tier) & Railway / VPS PostgreSQL 13+
-- ==============================================================================

-- 0. EXTENSIONS & DOMAINS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm"; -- Fast text search for POS search bar

-- Custom Domains & Types
DO $$ BEGIN
    CREATE TYPE order_source_enum AS ENUM ('POS', 'SHOPIFY', 'WOOCOMMERCE', 'MANUAL');
    CREATE TYPE order_status_enum AS ENUM ('PENDING', 'COMPLETED', 'CANCELLED', 'REFUNDED');
    CREATE TYPE payment_status_enum AS ENUM ('PENDING', 'PAID', 'PARTIALLY_REFUNDED', 'REFUNDED');
    CREATE TYPE payment_method_enum AS ENUM ('CASH', 'DEBIT_CARD', 'CREDIT_CARD', 'TRANSFER', 'WEBPAY', 'OTHER');
    CREATE TYPE inventory_movement_type_enum AS ENUM (
        'PURCHASE_IN',       -- Entrada por compra/proveedor
        'POS_SALE_OUT',      -- Salida por venta física
        'WEB_SALE_OUT',      -- Salida por venta e-commerce
        'SHRINKAGE_OUT',     -- Salida por merma/pérdida/daño
        'RETURN_IN',         -- Entrada por devolución
        'RESERVE_LOCK',      -- Bloqueo temporal por carrito web
        'RESERVE_UNLOCK',    -- Desbloqueo por carrito abandonado
        'ADJUSTMENT'         -- Ajuste manual de inventario
    );
    CREATE TYPE dte_type_enum AS ENUM (
        '33', -- Factura Electrónica
        '34', -- Factura Non-Afecta o Exenta
        '39', -- Boleta Electrónica
        '41', -- Boleta Non-Afecta o Exenta
        '56', -- Nota de Débito Electrónica
        '61'  -- Nota de Crédito Electrónica
    );
    CREATE TYPE dte_sii_status_enum AS ENUM (
        'DRAFT',
        'OFFLINE_QUEUED',
        'PENDING_SII',
        'ACCEPTED_SII',
        'REJECTED_SII',
        'ERROR_RETRY'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- ==============================================================================
-- 1. CATÁLOGO Y PRODUCTOS
-- ==============================================================================

CREATE TABLE categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(120) NOT NULL UNIQUE,
    parent_id UUID REFERENCES categories(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
    name VARCHAR(255) NOT NULL,
    brand VARCHAR(100),
    description TEXT,
    attributes JSONB DEFAULT '{}',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE product_variants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    sku VARCHAR(64) NOT NULL UNIQUE,
    barcode VARCHAR(64) UNIQUE,
    variant_name VARCHAR(100), -- ej: "Talla M / Azul" o "Default"
    
    -- Precios estrictos (numeric)
    net_price NUMERIC(14, 4) NOT NULL CHECK (net_price >= 0),
    vat_rate NUMERIC(5, 2) NOT NULL DEFAULT 19.00 CHECK (vat_rate >= 0), -- IVA Chile 19%
    gross_price NUMERIC(14, 4) NOT NULL CHECK (gross_price >= net_price),
    cost_price NUMERIC(14, 4) NOT NULL DEFAULT 0.0000 CHECK (cost_price >= 0),
    
    track_inventory BOOLEAN NOT NULL DEFAULT TRUE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==============================================================================
-- 2. INFRAESTRUCTURA DE TIENDAS E INVENTARIO (KARDEX AUDITABLE)
-- ==============================================================================

CREATE TABLE stores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(32) NOT NULL UNIQUE,
    name VARCHAR(150) NOT NULL,
    rut VARCHAR(12) NOT NULL, -- RUT de la sucursal/empresa ej: 76123456-7
    address VARCHAR(255) NOT NULL,
    city VARCHAR(100) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE warehouses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    is_default BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Estado actual de stock por bodega y variante
CREATE TABLE inventory (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    warehouse_id UUID NOT NULL REFERENCES warehouses(id) ON DELETE CASCADE,
    variant_id UUID NOT NULL REFERENCES product_variants(id) ON DELETE CASCADE,
    
    stock_physical NUMERIC(12, 3) NOT NULL DEFAULT 0.000,
    stock_reserved NUMERIC(12, 3) NOT NULL DEFAULT 0.000,
    reorder_point NUMERIC(12, 3) DEFAULT 5.000,
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Restricciones de integridad críticas
    CONSTRAINT check_stock_physical_non_negative CHECK (stock_physical >= 0),
    CONSTRAINT check_stock_reserved_non_negative CHECK (stock_reserved >= 0),
    CONSTRAINT check_reserved_not_exceed_physical CHECK (stock_reserved <= stock_physical),
    CONSTRAINT uq_warehouse_variant UNIQUE (warehouse_id, variant_id)
);

-- Reservas temporales para carritos de compras e-commerce
CREATE TABLE inventory_reservations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    warehouse_id UUID NOT NULL REFERENCES warehouses(id) ON DELETE CASCADE,
    variant_id UUID NOT NULL REFERENCES product_variants(id) ON DELETE CASCADE,
    quantity NUMERIC(12, 3) NOT NULL CHECK (quantity > 0),
    cart_token VARCHAR(128) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'COMMITTED', 'EXPIRED', 'RELEASED')),
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Kardex Inmutable
CREATE TABLE inventory_movements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    warehouse_id UUID NOT NULL REFERENCES warehouses(id) ON DELETE RESTRICT,
    variant_id UUID NOT NULL REFERENCES product_variants(id) ON DELETE RESTRICT,
    movement_type inventory_movement_type_enum NOT NULL,
    
    quantity NUMERIC(12, 3) NOT NULL, -- Positivo para entradas, negativo para salidas
    previous_stock NUMERIC(12, 3) NOT NULL,
    new_stock NUMERIC(12, 3) NOT NULL,
    
    reference_type VARCHAR(50), -- 'ORDER', 'PURCHASE', 'RESERVATION_EXPIRED', 'MANUAL_ADJUSTMENT'
    reference_id UUID,
    notes TEXT,
    created_by UUID, -- ID de usuario cajero/bodeguero/sistema
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==============================================================================
-- 3. CAJAS REGISTRADORAS, TURNOS Y VENTA POS
-- ==============================================================================

CREATE TABLE cash_registers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
    name VARCHAR(50) NOT NULL, -- Ej: "Caja 1 Express"
    mac_address VARCHAR(64),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE cash_register_shifts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cash_register_id UUID NOT NULL REFERENCES cash_registers(id) ON DELETE RESTRICT,
    user_id UUID NOT NULL, -- Usuario que abre el turno
    opened_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    closed_at TIMESTAMPTZ,
    
    initial_cash NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    expected_cash NUMERIC(14, 2) DEFAULT 0.00,
    actual_cash NUMERIC(14, 2) DEFAULT 0.00,
    difference_cash NUMERIC(14, 2) DEFAULT 0.00,
    
    status VARCHAR(20) NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'CLOSED')),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rut VARCHAR(12) UNIQUE, -- Para Factura Electrónica en Chile
    name VARCHAR(200) NOT NULL,
    email VARCHAR(150),
    phone VARCHAR(30),
    address TEXT,
    commune VARCHAR(100),
    business_line VARCHAR(200), -- Giro comercial (necesario para Facturas en Chile)
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE pos_drafts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
    user_id UUID,
    customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
    items JSONB NOT NULL,
    total_amount NUMERIC(14, 2) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_number VARCHAR(64) NOT NULL UNIQUE,
    store_id UUID NOT NULL REFERENCES stores(id) ON DELETE RESTRICT,
    warehouse_id UUID NOT NULL REFERENCES warehouses(id) ON DELETE RESTRICT,
    shift_id UUID REFERENCES cash_register_shifts(id) ON DELETE RESTRICT,
    customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
    
    source order_source_enum NOT NULL DEFAULT 'POS',
    external_order_id VARCHAR(128), -- ID de orden en Shopify/WooCommerce
    
    delivery_type VARCHAR(20) DEFAULT 'IMMEDIATE', -- 'IMMEDIATE', 'DISPATCH'
    shipping_amount NUMERIC(14, 2) NOT NULL DEFAULT 0.00 CHECK (shipping_amount >= 0),
    
    -- Montos consolidados en CLP (Pesos Chilenos, sin decimales en total final)
    net_amount NUMERIC(14, 2) NOT NULL CHECK (net_amount >= 0),
    vat_amount NUMERIC(14, 2) NOT NULL CHECK (vat_amount >= 0),
    discount_amount NUMERIC(14, 2) NOT NULL DEFAULT 0.00 CHECK (discount_amount >= 0),
    coupon_code VARCHAR(50), -- Código promocional usado
    total_amount NUMERIC(14, 2) NOT NULL CHECK (total_amount >= 0),
    
    status order_status_enum NOT NULL DEFAULT 'COMPLETED',
    payment_status payment_status_enum NOT NULL DEFAULT 'PAID',
    
    created_by UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    variant_id UUID NOT NULL REFERENCES product_variants(id) ON DELETE RESTRICT,
    
    quantity NUMERIC(12, 3) NOT NULL CHECK (quantity > 0),
    unit_net_price NUMERIC(14, 4) NOT NULL CHECK (unit_net_price >= 0),
    vat_rate NUMERIC(5, 2) NOT NULL DEFAULT 19.00,
    unit_gross_price NUMERIC(14, 4) NOT NULL CHECK (unit_gross_price >= unit_net_price),
    
    discount_amount NUMERIC(14, 2) NOT NULL DEFAULT 0.00 CHECK (discount_amount >= 0),
    total_net NUMERIC(14, 2) NOT NULL CHECK (total_net >= 0),
    total_gross NUMERIC(14, 2) NOT NULL CHECK (total_gross >= 0)
);

CREATE TABLE order_payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    payment_method payment_method_enum NOT NULL,
    amount NUMERIC(14, 2) NOT NULL CHECK (amount > 0),
    transaction_reference VARCHAR(128), -- Voucher Transbank / Stripe / etc.
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==============================================================================
-- 4. FACTURACIÓN ELECTRÓNICA DTE (CHILE - SII)
-- ==============================================================================

-- Tracking de Código de Autorización de Folios (CAF) cargados por el contribuyente
CREATE TABLE dte_caf (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
    dte_type dte_type_enum NOT NULL,
    folio_start INT NOT NULL CHECK (folio_start > 0),
    folio_end INT NOT NULL CHECK (folio_end >= folio_start),
    last_used_folio INT NOT NULL CHECK (last_used_folio >= folio_start - 1),
    caf_xml TEXT NOT NULL, -- Contenido XML con la firma del SII
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    CONSTRAINT check_folio_range CHECK (last_used_folio <= folio_end)
);

-- Documentos Tributarios Electrónicos Emitidos
CREATE TABLE dte_invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL UNIQUE REFERENCES orders(id) ON DELETE RESTRICT,
    dte_type dte_type_enum NOT NULL,
    folio INT NOT NULL CHECK (folio > 0),
    
    sii_status dte_sii_status_enum NOT NULL DEFAULT 'DRAFT',
    track_id VARCHAR(64), -- ID de envío retornado por la API DTE / SII
    sii_response_message TEXT,
    
    xml_payload TEXT,      -- DTE XML firmado digitalmente
    ted_xml TEXT,          -- Timbre Electrónico DTE (para código 2D / PDF)
    pdf_url TEXT,          -- URL para reimpresión de boleta/factura
    
    retry_count INT NOT NULL DEFAULT 0,
    last_retry_at TIMESTAMPTZ,
    issued_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    CONSTRAINT uq_dte_type_folio UNIQUE (dte_type, folio)
);

-- ==============================================================================
-- 5. EVENT OUTBOX (PARA APLICAR ARCHITECTURE DESIGN PATTERNS Y CONEXIÓN A WEBHOOKS)
-- ==============================================================================

CREATE TABLE outbox_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    aggregate_type VARCHAR(50) NOT NULL, -- 'ORDER', 'INVENTORY', 'DTE'
    aggregate_id UUID NOT NULL,
    event_type VARCHAR(100) NOT NULL,    -- 'ORDER_COMPLETED', 'STOCK_UPDATED', 'DTE_EMITTED'
    payload JSONB NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'PROCESSING', 'PROCESSED', 'FAILED')),
    error_message TEXT,
    retry_count INT DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    processed_at TIMESTAMPTZ
);

-- ==============================================================================
-- 6. TABLA PUENTE PARA SINCRONIZACIÓN OMNICANAL Y MARKETPLACES
-- ==============================================================================

CREATE TABLE IF NOT EXISTS marketplace_mappings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    variant_id UUID NOT NULL REFERENCES product_variants(id) ON DELETE CASCADE,
    platform VARCHAR(50) NOT NULL, -- 'MERCADOLIBRE', 'SHOPIFY', 'WHATSAPP', 'WOOCOMMERCE'
    external_item_id VARCHAR(100) NOT NULL,
    external_variation_id VARCHAR(100),
    is_sync_enabled BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(platform, external_item_id, external_variation_id)
);

-- ==============================================================================
-- ÍNDICES OPTIMIZADOS PARA LATENCIA <50ms EN PUNTO DE VENTA Y BÚSQUEDAS
-- ==============================================================================

-- 1. Búsqueda por SKU y Código de Barras (Escaneo en POS)
CREATE UNIQUE INDEX idx_product_variants_barcode ON product_variants(barcode) WHERE barcode IS NOT NULL;
CREATE UNIQUE INDEX idx_product_variants_sku ON product_variants(sku);

-- 2. Búsqueda rápida de productos por Nombre/SKU/Barcode usando pg_trgm (Búsqueda predictiva POS)
CREATE INDEX idx_products_name_trgm ON products USING gin (name gin_trgm_ops);
CREATE INDEX idx_variants_sku_trgm ON product_variants USING gin (sku gin_trgm_ops);
CREATE INDEX idx_products_brand ON products(brand);
CREATE INDEX idx_products_attributes ON products USING gin (attributes);

-- 3. Consulta de Stock en Tiempo Real por Bodega y Variante
CREATE UNIQUE INDEX idx_inventory_wh_variant ON inventory(warehouse_id, variant_id);

-- 4. Reservas de Carrito Web por Token y Expiración
CREATE INDEX idx_reservations_status_expires ON inventory_reservations(status, expires_at) WHERE status = 'ACTIVE';
CREATE INDEX idx_reservations_cart_token ON inventory_reservations(cart_token);

-- 5. Kardex Audit (Cronológico por Variante)
CREATE INDEX idx_kardex_variant_created ON inventory_movements(variant_id, created_at DESC);

-- 6. Consultas de Cierre de Caja y Cuadraturas
CREATE INDEX idx_orders_shift_id ON orders(shift_id) WHERE shift_id IS NOT NULL;
CREATE INDEX idx_orders_created_at_store ON orders(store_id, created_at DESC);

-- 7. Outbox Queue Polling Optimization
CREATE INDEX idx_outbox_pending ON outbox_events(status, created_at) WHERE status = 'PENDING';

-- 8. Búsqueda de Mapeos de Marketplace
CREATE INDEX IF NOT EXISTS idx_marketplace_lookup ON marketplace_mappings(platform, external_item_id);

-- ==============================================================================
-- 7. DESPACHOS Y GUÍAS DE DESPACHO
-- ==============================================================================

CREATE TABLE dispatches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL UNIQUE REFERENCES orders(id) ON DELETE CASCADE,
    dispatch_type VARCHAR(50) NOT NULL, -- Ej: 'Operación constituye venta', 'Entrega gratuita'
    dispatch_date DATE NOT NULL,
    recipient_name VARCHAR(200) NOT NULL,
    address VARCHAR(255) NOT NULL,
    commune VARCHAR(100) NOT NULL,
    city VARCHAR(100) NOT NULL,
    region VARCHAR(100),
    document_number VARCHAR(50),
    departure_date DATE NOT NULL,
    departure_time VARCHAR(10),
    arrival_date DATE,
    carrier_rut VARCHAR(12),
    driver_rut VARCHAR(12),
    driver_name VARCHAR(200),
    transport_plate VARCHAR(20),
    total_amount NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    status VARCHAR(50) NOT NULL DEFAULT 'CONFIRMED',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==============================================================================
-- 8. FULFILLMENT, ALISTAMIENTO Y DESPACHOS (AUDITORÍA & CONCURRENCIA)
-- ==============================================================================

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

CREATE TABLE IF NOT EXISTS fulfillments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL UNIQUE REFERENCES orders(id) ON DELETE CASCADE,
    type fulfillment_type_enum NOT NULL DEFAULT 'DISPATCH',
    status fulfillment_status_enum NOT NULL DEFAULT 'PENDING',
    
    requires_collection BOOLEAN NOT NULL DEFAULT FALSE,
    collection_amount NUMERIC(14, 2) DEFAULT 0.00 CHECK (collection_amount >= 0),
    collection_method VARCHAR(50),
    collection_status VARCHAR(20) DEFAULT 'PENDING' CHECK (collection_status IN ('PENDING', 'COLLECTED')),
    
    preparing_started_at TIMESTAMPTZ,
    prepared_at TIMESTAMPTZ,
    dispatched_at TIMESTAMPTZ,
    delivered_at TIMESTAMPTZ,
    
    preparing_started_by UUID REFERENCES users(id),
    prepared_by UUID REFERENCES users(id),
    dispatched_by UUID REFERENCES users(id),
    delivered_by UUID REFERENCES users(id),
    
    recipient_name VARCHAR(200),
    recipient_rut VARCHAR(12),
    recipient_signature_url TEXT,
    delivery_photo_url TEXT,
    delivery_notes TEXT,
    
    version INT NOT NULL DEFAULT 1,
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

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

CREATE TABLE IF NOT EXISTS fulfillment_status_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    fulfillment_id UUID NOT NULL REFERENCES fulfillments(id) ON DELETE CASCADE,
    previous_status fulfillment_status_enum,
    new_status fulfillment_status_enum NOT NULL,
    changed_by UUID NOT NULL REFERENCES users(id),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

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

CREATE INDEX IF NOT EXISTS idx_fulfillments_status ON fulfillments(status);
CREATE INDEX IF NOT EXISTS idx_fulfillments_order_id ON fulfillments(order_id);
CREATE INDEX IF NOT EXISTS idx_fulfillment_items_fulfillment ON fulfillment_items(fulfillment_id);
CREATE INDEX IF NOT EXISTS idx_fulfillment_history_fulfillment ON fulfillment_status_history(fulfillment_id);

