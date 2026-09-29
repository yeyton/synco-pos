-- ==============================================================================
-- STRATEGIES & PROCEDURES FOR ATOMIC HIGH-CONCURRENCY INVENTORY MANAGEMENT
-- POS Retail & Omnichannel E-commerce Stock Deductions without Race Conditions
-- ==============================================================================

-- ==============================================================================
-- 1. ATOMIC DEDUCTION PROCEDURE FOR DIRECT POS SALE (ZERO RACE CONDITIONS)
-- ==============================================================================

CREATE OR REPLACE FUNCTION process_pos_sale(
    p_store_id UUID,
    p_warehouse_id UUID,
    p_shift_id UUID,
    p_customer_id UUID,
    p_source order_source_enum,
    p_items JSONB,              -- Array of {variant_id, quantity, unit_net_price, unit_gross_price}
    p_payments JSONB,           -- Array of {payment_method, amount, transaction_reference}
    p_user_id UUID,
    p_external_order_id VARCHAR DEFAULT NULL,
    p_delivery_type VARCHAR DEFAULT 'IMMEDIATE',
    p_shipping_amount NUMERIC DEFAULT 0.00,
    p_requires_collection BOOLEAN DEFAULT false,
    p_collection_amount NUMERIC DEFAULT 0.00,
    p_collection_method VARCHAR DEFAULT NULL
)
RETURNS TABLE (
    out_order_id UUID,
    out_order_number VARCHAR,
    out_total_amount NUMERIC
) AS $$
DECLARE
    v_order_id UUID := gen_random_uuid();
    v_order_number VARCHAR(64);
    v_total_net NUMERIC(14,2) := 0;
    v_total_vat NUMERIC(14,2) := 0;
    v_total_gross NUMERIC(14,2) := 0;
    
    v_item JSONB;
    v_variant_id UUID;
    v_qty NUMERIC(12,3);
    v_net_price NUMERIC(14,4);
    v_gross_price NUMERIC(14,4);
    v_item_net NUMERIC(14,2);
    v_item_gross NUMERIC(14,2);
    
    v_prev_stock NUMERIC(12,3);
    v_new_stock NUMERIC(12,3);
    v_rows_updated INT;
    
    v_payment JSONB;
    v_payment_status payment_status_enum := 'PAID';
BEGIN
    -- Generar Número de Orden Único secuencial/timestamp
    v_order_number := 'ORD-' || TO_CHAR(NOW(), 'YYYYMMDD-HH24MISS') || '-' || SUBSTRING(v_order_id::text, 1, 4);

    -- 1. Iterar sobre los ítems para validar stock y descontar de forma ATÓMICA
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
        v_variant_id := (v_item->>'variant_id')::UUID;
        v_qty        := (v_item->>'quantity')::NUMERIC;
        v_net_price  := (v_item->>'unit_net_price')::NUMERIC;
        v_gross_price:= (v_item->>'unit_gross_price')::NUMERIC;
        
        v_item_net   := ROUND((v_net_price * v_qty)::numeric, 2);
        v_item_gross := ROUND((v_gross_price * v_qty)::numeric, 2);
        
        v_total_net   := v_total_net + v_item_net;
        v_total_gross := v_total_gross + v_item_gross;

        -- DEDUCCIÓN ATÓMICA CON VERIFICACIÓN DISPONIBLE (Stock Físico - Stock Reservado >= Cantidad)
        -- Esta sola consulta garantiza que NUNCA dos clientes compren el último ítem
        UPDATE inventory 
        SET stock_physical = stock_physical - v_qty,
            updated_at = NOW()
        WHERE warehouse_id = p_warehouse_id 
          AND variant_id = v_variant_id 
          AND (stock_physical - stock_reserved) >= v_qty
        RETURNING (stock_physical + v_qty), stock_physical INTO v_prev_stock, v_new_stock;

        GET DIAGNOSTICS v_rows_updated = ROW_COUNT;

        IF v_rows_updated = 0 THEN
            -- Excepción explícita si el stock ya fue consumido por otra caja o web hace 1 milisegundo
            RAISE EXCEPTION 'INSUFFICIENT_STOCK: Stock insuficiente para la variante % en la bodega %', v_variant_id, p_warehouse_id
                USING ERRCODE = 'P0001';
        END IF;

        -- Registrar Movimiento en Kardex Auditable (Inmutable)
        INSERT INTO inventory_movements (
            warehouse_id, variant_id, movement_type, quantity, 
            previous_stock, new_stock, reference_type, reference_id, created_by
        ) VALUES (
            p_warehouse_id, v_variant_id, 
            CASE WHEN p_source = 'POS' THEN 'POS_SALE_OUT'::inventory_movement_type_enum ELSE 'WEB_SALE_OUT'::inventory_movement_type_enum END,
            -v_qty, v_prev_stock, v_new_stock, 'ORDER', v_order_id, p_user_id
        );
    END LOOP;

    v_total_vat := v_total_gross - v_total_net;

    -- 2. Insertar Orden Principal
    -- El total general incluye el costo de envío
    v_total_gross := v_total_gross + p_shipping_amount;

    IF p_requires_collection THEN
        v_payment_status := 'PENDING';
    END IF;

    INSERT INTO orders (
        id, order_number, store_id, warehouse_id, shift_id, customer_id,
        source, external_order_id, delivery_type, shipping_amount, net_amount, vat_amount, total_amount,
        status, payment_status, created_by
    ) VALUES (
        v_order_id, v_order_number, p_store_id, p_warehouse_id, p_shift_id, p_customer_id,
        p_source, p_external_order_id, p_delivery_type, p_shipping_amount, v_total_net, v_total_vat, v_total_gross,
        'COMPLETED', v_payment_status, p_user_id
    );

    -- 3. Insertar Detalle de Items
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
        v_variant_id := (v_item->>'variant_id')::UUID;
        v_qty        := (v_item->>'quantity')::NUMERIC;
        v_net_price  := (v_item->>'unit_net_price')::NUMERIC;
        v_gross_price:= (v_item->>'unit_gross_price')::NUMERIC;

        INSERT INTO order_items (
            order_id, variant_id, quantity, unit_net_price, unit_gross_price,
            total_net, total_gross
        ) VALUES (
            v_order_id, v_variant_id, v_qty, v_net_price, v_gross_price,
            ROUND((v_net_price * v_qty)::numeric, 2), ROUND((v_gross_price * v_qty)::numeric, 2)
        );
    END LOOP;

    -- 4. Registrar Métodos de Pago
    FOR v_payment IN SELECT * FROM jsonb_array_elements(p_payments)
    LOOP
        INSERT INTO order_payments (
            order_id, payment_method, amount, transaction_reference
        ) VALUES (
            v_order_id, 
            (v_payment->>'payment_method')::payment_method_enum,
            (v_payment->>'amount')::NUMERIC,
            v_payment->>'transaction_reference'
        );
    END LOOP;

    -- 5. Auto-crear Fulfillment y Checklist si requiere Despacho o Retiro en Local
    IF p_delivery_type IN ('DISPATCH', 'PICKUP') THEN
        INSERT INTO fulfillments (order_id, type, status, requires_collection, collection_amount, collection_method, collection_status)
        VALUES (
            v_order_id, 
            p_delivery_type::fulfillment_type_enum, 
            'PENDING', 
            p_requires_collection, 
            p_collection_amount, 
            p_collection_method,
            CASE WHEN p_requires_collection THEN 'PENDING' ELSE NULL END
        );

        INSERT INTO fulfillment_items (fulfillment_id, order_item_id, variant_id, required_qty)
        SELECT f.id, oi.id, oi.variant_id, oi.quantity
        FROM fulfillments f
        JOIN order_items oi ON oi.order_id = f.order_id
        WHERE f.order_id = v_order_id;
    END IF;

    -- 6. Insertar Evento en OUTBOX para Notificar a Shopify/WooCommerce y Queue de DTE sin bloquear el commit
    INSERT INTO outbox_events (aggregate_type, aggregate_id, event_type, payload)
    VALUES ('ORDER', v_order_id, 'ORDER_COMPLETED', jsonb_build_object(
        'order_id', v_order_id,
        'store_id', p_store_id,
        'warehouse_id', p_warehouse_id,
        'total_amount', v_total_gross,
        'source', p_source
    ));

    out_order_id := v_order_id;
    out_order_number := v_order_number;
    out_total_amount := v_total_gross;
    RETURN NEXT;
END;
$$ LANGUAGE plpgsql;

-- ==============================================================================
-- 2. RESERVA TEMPORAL PARA CARRITOS DE COMPRA WEB (PREVIENE ABANDONOS Y OVERSELLING)
-- ==============================================================================

CREATE OR REPLACE FUNCTION reserve_web_cart_stock(
    p_warehouse_id UUID,
    p_variant_id UUID,
    p_quantity NUMERIC(12,3),
    p_cart_token VARCHAR,
    p_ttl_minutes INT DEFAULT 15
)
RETURNS BOOLEAN AS $$
DECLARE
    v_rows INT;
BEGIN
    -- Incrementar stock_reserved atómicamente si hay stock libre suficiente (stock_physical - stock_reserved >= quantity)
    UPDATE inventory
    SET stock_reserved = stock_reserved + p_quantity,
        updated_at = NOW()
    WHERE warehouse_id = p_warehouse_id
      AND variant_id = p_variant_id
      AND (stock_physical - stock_reserved) >= p_quantity;

    GET DIAGNOSTICS v_rows = ROW_COUNT;

    IF v_rows > 0 THEN
        -- Registrar la reserva con tiempo de expiración
        INSERT INTO inventory_reservations (
            warehouse_id, variant_id, quantity, cart_token, expires_at
        ) VALUES (
            p_warehouse_id, p_variant_id, p_quantity, p_cart_token, NOW() + (p_ttl_minutes || ' minutes')::INTERVAL
        );
        RETURN TRUE;
    ELSE
        RETURN FALSE; -- No hay stock libre suficiente
    END IF;
END;
$$ LANGUAGE plpgsql;

-- ==============================================================================
-- 3. LIMPIEZA AUTOMÁTICA DE RESERVAS EXPIRADAS (RECOLECCIÓN DE BASURA DE CARRITOS)
-- ==============================================================================

CREATE OR REPLACE FUNCTION release_expired_inventory_reservations()
RETURNS INT AS $$
DECLARE
    v_res RECORD;
    v_count INT := 0;
BEGIN
    FOR v_res IN 
        SELECT id, warehouse_id, variant_id, quantity 
        FROM inventory_reservations
        WHERE status = 'ACTIVE' AND expires_at < NOW()
        FOR UPDATE SKIP LOCKED -- Garantiza ejecución limpia si corren múltiples replicas de workers
    LOOP
        -- Liberar el stock reservado
        UPDATE inventory
        SET stock_reserved = GREATEST(0, stock_reserved - v_res.quantity),
            updated_at = NOW()
        WHERE warehouse_id = v_res.warehouse_id
          AND variant_id = v_res.variant_id;

        -- Marcar reserva como EXPIRADA
        UPDATE inventory_reservations
        SET status = 'EXPIRED'
        WHERE id = v_res.id;

        v_count := v_count + 1;
    END LOOP;

    RETURN v_count;
END;
$$ LANGUAGE plpgsql;
