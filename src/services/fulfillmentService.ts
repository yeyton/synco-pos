import { dbPool } from '../db.js';

export interface FulfillmentFilter {
  status?: string;
  type?: 'DISPATCH' | 'PICKUP';
  search?: string;
}

export interface DeliveryConfirmationPayload {
  recipient_name: string;
  recipient_rut?: string;
  recipient_signature_url?: string;
  delivery_photo_url?: string;
  delivery_notes?: string;
  collection_received?: boolean;
  collection_reference?: string;
  delivery_mode: 'QUICK' | 'CHECKLIST';
}

export class FulfillmentService {
  /**
   * Obtiene la lista de fulfillments con filtros y progreso del checklist
   */
  static async getFulfillments(filters: FulfillmentFilter) {
    const client = await dbPool.connect();
    try {
      let query = `
        SELECT 
          f.id,
          f.order_id,
          o.order_number,
          o.total_amount AS order_total_amount,
          f.type AS fulfillment_type,
          f.status,
          f.requires_collection,
          f.collection_amount,
          f.collection_method,
          f.collection_status,
          f.preparing_started_at,
          f.prepared_at,
          f.dispatched_at,
          f.delivered_at,
          f.recipient_name,
          f.created_at,
          c.name AS customer_name,
          c.phone AS customer_phone,
          c.address AS customer_address,
          u_prep.name AS preparing_started_by_name,
          u_ready.name AS prepared_by_name,
          u_deliv.name AS delivered_by_name,
          COUNT(fi.id) AS total_items,
          COUNT(CASE WHEN fi.is_prepared THEN 1 END) AS prepared_items,
          COUNT(CASE WHEN fi.is_delivered THEN 1 END) AS delivered_items
        FROM fulfillments f
        JOIN orders o ON o.id = f.order_id
        LEFT JOIN customers c ON c.id = o.customer_id
        LEFT JOIN users u_prep ON u_prep.id = f.preparing_started_by
        LEFT JOIN users u_ready ON u_ready.id = f.prepared_by
        LEFT JOIN users u_deliv ON u_deliv.id = f.delivered_by
        LEFT JOIN fulfillment_items fi ON fi.fulfillment_id = f.id
        WHERE 1=1
      `;

      const params: any[] = [];
      let paramCount = 1;

      if (filters.status) {
        query += ` AND f.status = $${paramCount++}`;
        params.push(filters.status);
      }

      if (filters.type) {
        query += ` AND f.type = $${paramCount++}`;
        params.push(filters.type);
      }

      if (filters.search) {
        query += ` AND (o.order_number ILIKE $${paramCount} OR c.name ILIKE $${paramCount} OR f.recipient_name ILIKE $${paramCount})`;
        params.push(`%${filters.search}%`);
        paramCount++;
      }

      query += `
        GROUP BY f.id, o.id, c.id, u_prep.id, u_ready.id, u_deliv.id
        ORDER BY f.created_at DESC;
      `;

      const result = await client.query(query, params);
      return result.rows;
    } finally {
      client.release();
    }
  }

  /**
   * Obtiene el detalle completo de un fulfillment por ID
   */
  static async getFulfillmentById(id: string) {
    const client = await dbPool.connect();
    try {
      // Cabecera
      const fulRes = await client.query(`
        SELECT 
          f.*,
          o.order_number,
          o.total_amount AS order_total_amount,
          o.payment_status AS order_payment_status,
          c.name AS customer_name,
          c.phone AS customer_phone,
          c.email AS customer_email,
          c.address AS customer_address,
          c.commune AS customer_commune,
          u_prep.name AS preparing_started_by_name,
          u_ready.name AS prepared_by_name,
          u_disp.name AS dispatched_by_name,
          u_deliv.name AS delivered_by_name
        FROM fulfillments f
        JOIN orders o ON o.id = f.order_id
        LEFT JOIN customers c ON c.id = o.customer_id
        LEFT JOIN users u_prep ON u_prep.id = f.preparing_started_by
        LEFT JOIN users u_ready ON u_ready.id = f.prepared_by
        LEFT JOIN users u_disp ON u_disp.id = f.dispatched_by
        LEFT JOIN users u_deliv ON u_deliv.id = f.delivered_by
        WHERE f.id = $1;
      `, [id]);

      if (fulRes.rows.length === 0) {
        return null;
      }

      const fulfillment = fulRes.rows[0];

      // Checklist de ítems
      const itemsRes = await client.query(`
        SELECT 
          fi.id,
          fi.fulfillment_id,
          fi.order_item_id,
          fi.variant_id,
          fi.required_qty,
          fi.prepared_qty,
          fi.delivered_qty,
          fi.is_prepared,
          fi.is_delivered,
          fi.prepared_at,
          fi.delivered_at,
          p.name AS product_name,
          pv.sku,
          pv.barcode,
          pv.variant_name,
          u_prep.name AS prepared_by_name,
          u_deliv.name AS delivered_by_name,
          inv.location
        FROM fulfillment_items fi
        JOIN product_variants pv ON pv.id = fi.variant_id
        JOIN products p ON p.id = pv.product_id
        LEFT JOIN (
          SELECT variant_id, MAX(location) as location 
          FROM inventory 
          GROUP BY variant_id
        ) inv ON inv.variant_id = pv.id
        LEFT JOIN users u_prep ON u_prep.id = fi.prepared_by
        LEFT JOIN users u_deliv ON u_deliv.id = fi.delivered_by
        WHERE fi.fulfillment_id = $1
        ORDER BY inv.location ASC NULLS LAST, p.name ASC;
      `, [id]);

      // Historial de auditoría
      const historyRes = await client.query(`
        SELECT 
          h.id,
          h.previous_status,
          h.new_status,
          h.notes,
          h.created_at,
          u.name AS changed_by_name,
          u.role AS changed_by_role
        FROM fulfillment_status_history h
        JOIN users u ON u.id = h.changed_by
        WHERE h.fulfillment_id = $1
        ORDER BY h.created_at ASC;
      `, [id]);

      return {
        ...fulfillment,
        items: itemsRes.rows,
        audit_history: historyRes.rows,
      };
    } finally {
      client.release();
    }
  }

  /**
   * Inicia el alistamiento (PENDING -> PREPARING) con control de concurrencia
   */
  static async startPreparing(fulfillmentId: string, userId: string) {
    const client = await dbPool.connect();
    try {
      await client.query('BEGIN;');

      const updateRes = await client.query(`
        UPDATE fulfillments 
        SET status = 'PREPARING',
            preparing_started_at = NOW(),
            preparing_started_by = $2,
            version = version + 1,
            updated_at = NOW()
        WHERE id = $1 AND status = 'PENDING'
        RETURNING id, version;
      `, [fulfillmentId, userId]);

      if (updateRes.rows.length === 0) {
        // Consultar quién lo está preparando para lanzar el mensaje 409
        const checkRes = await client.query(`
          SELECT f.status, u.name AS preparing_user, f.preparing_started_at
          FROM fulfillments f
          LEFT JOIN users u ON u.id = f.preparing_started_by
          WHERE f.id = $1;
        `, [fulfillmentId]);

        await client.query('ROLLBACK;');

        if (checkRes.rows.length > 0 && checkRes.rows[0].status === 'PREPARING') {
          const worker = checkRes.rows[0].preparing_user || 'otro operario';
          const startTime = new Date(checkRes.rows[0].preparing_started_at).toLocaleTimeString('es-CL');
          throw {
            statusCode: 409,
            code: 'CONCURRENCY_LOCK',
            message: `El pedido ya está siendo preparado por ${worker} desde las ${startTime}.`,
          };
        }

        throw {
          statusCode: 400,
          code: 'INVALID_STATUS_TRANSITION',
          message: 'Solo se puede iniciar alistamiento en pedidos en estado PENDING.',
        };
      }

      // Registrar auditoría
      await client.query(`
        INSERT INTO fulfillment_status_history (fulfillment_id, previous_status, new_status, changed_by, notes)
        VALUES ($1, 'PENDING', 'PREPARING', $2, 'Inicio de alistamiento de productos');
      `, [fulfillmentId, userId]);

      await client.query('COMMIT;');
      return { success: true, status: 'PREPARING' };
    } catch (e) {
      await client.query('ROLLBACK;');
      throw e;
    } finally {
      client.release();
    }
  }

  /**
   * Marca o actualiza la cantidad preparada de un ítem del checklist
   */
  static async updatePreparedItem(fulfillmentId: string, itemId: string, preparedQty: number, userId: string) {
    const client = await dbPool.connect();
    try {
      // Verificar estado
      const fulRes = await client.query(`SELECT status FROM fulfillments WHERE id = $1;`, [fulfillmentId]);
      if (fulRes.rows.length === 0 || fulRes.rows[0].status !== 'PREPARING') {
        throw {
          statusCode: 400,
          code: 'INVALID_STATUS',
          message: 'Solo se pueden preparar productos mientras el pedido esté en estado PREPARING.',
        };
      }

      const updateRes = await client.query(`
        UPDATE fulfillment_items
        SET prepared_qty = $3,
            prepared_at = NOW(),
            prepared_by = $4
        WHERE id = $2 AND fulfillment_id = $1
        RETURNING *, is_prepared;
      `, [fulfillmentId, itemId, preparedQty, userId]);

      if (updateRes.rows.length === 0) {
        throw { statusCode: 404, code: 'ITEM_NOT_FOUND', message: 'El ítem no pertenece a este fulfillment.' };
      }

      return updateRes.rows[0];
    } finally {
      client.release();
    }
  }

  /**
   * Confirma que el 100% fue preparado (PREPARING -> PREPARED)
   */
  static async confirmPrepared(fulfillmentId: string, userId: string) {
    const client = await dbPool.connect();
    try {
      await client.query('BEGIN;');

      // Validar 100% checklist de preparación
      const checkRes = await client.query(`
        SELECT 
          COUNT(*) AS total_items,
          COUNT(CASE WHEN is_prepared THEN 1 END) AS prepared_items
        FROM fulfillment_items
        WHERE fulfillment_id = $1;
      `, [fulfillmentId]);

      const { total_items, prepared_items } = checkRes.rows[0];

      if (parseInt(total_items, 10) === 0 || parseInt(prepared_items, 10) < parseInt(total_items, 10)) {
        await client.query('ROLLBACK;');
        throw {
          statusCode: 400,
          code: 'CHECKLIST_INCOMPLETE',
          message: `No se puede confirmar: aún faltan productos por marcar en el checklist (${prepared_items}/${total_items}).`,
        };
      }

      // Transición a PREPARED
      const updateRes = await client.query(`
        UPDATE fulfillments
        SET status = 'PREPARED',
            prepared_at = NOW(),
            prepared_by = $2,
            version = version + 1,
            updated_at = NOW()
        WHERE id = $1 AND status = 'PREPARING'
        RETURNING id;
      `, [fulfillmentId, userId]);

      if (updateRes.rows.length === 0) {
        await client.query('ROLLBACK;');
        throw {
          statusCode: 400,
          code: 'INVALID_STATUS_TRANSITION',
          message: 'Solo se puede confirmar la preparación de un pedido en estado PREPARING.',
        };
      }

      // Auditoría
      await client.query(`
        INSERT INTO fulfillment_status_history (fulfillment_id, previous_status, new_status, changed_by, notes)
        VALUES ($1, 'PREPARING', 'PREPARED', $2, '100% de productos alistados y verificados');
      `, [fulfillmentId, userId]);

      await client.query('COMMIT;');
      return { success: true, status: 'PREPARED' };
    } catch (e) {
      await client.query('ROLLBACK;');
      throw e;
    } finally {
      client.release();
    }
  }

  /**
   * Salir a ruta (PREPARED -> IN_TRANSIT, solo para DISPATCH)
   */
  static async dispatchToRoute(fulfillmentId: string, userId: string) {
    const client = await dbPool.connect();
    try {
      await client.query('BEGIN;');

      const updateRes = await client.query(`
        UPDATE fulfillments
        SET status = 'IN_TRANSIT',
            dispatched_at = NOW(),
            dispatched_by = $2,
            version = version + 1,
            updated_at = NOW()
        WHERE id = $1 AND status = 'PREPARED' AND type = 'DISPATCH'
        RETURNING id;
      `, [fulfillmentId, userId]);

      if (updateRes.rows.length === 0) {
        await client.query('ROLLBACK;');
        throw {
          statusCode: 400,
          code: 'INVALID_STATUS_TRANSITION',
          message: 'Solo pedidos de despacho en estado PREPARED pueden salir a ruta.',
        };
      }

      // Auditoría
      await client.query(`
        INSERT INTO fulfillment_status_history (fulfillment_id, previous_status, new_status, changed_by, notes)
        VALUES ($1, 'PREPARED', 'IN_TRANSIT', $2, 'Repartidor salió a ruta con el pedido');
      `, [fulfillmentId, userId]);

      await client.query('COMMIT;');
      return { success: true, status: 'IN_TRANSIT' };
    } catch (e) {
      await client.query('ROLLBACK;');
      throw e;
    } finally {
      client.release();
    }
  }

  /**
   * Actualiza cantidad entregada de un ítem en el checklist final
   */
  static async updateDeliveredItem(fulfillmentId: string, itemId: string, deliveredQty: number, userId: string) {
    const client = await dbPool.connect();
    try {
      const fulRes = await client.query(`SELECT status, type FROM fulfillments WHERE id = $1;`, [fulfillmentId]);
      if (fulRes.rows.length === 0) {
        throw { statusCode: 404, code: 'NOT_FOUND', message: 'Fulfillment no encontrado.' };
      }

      const { status, type } = fulRes.rows[0];
      const isValidStatus = (type === 'DISPATCH' && status === 'IN_TRANSIT') || (type === 'PICKUP' && status === 'PREPARED');

      if (!isValidStatus) {
        throw {
          statusCode: 400,
          code: 'INVALID_STATUS',
          message: 'No se puede modificar el checklist de entrega en el estado actual del pedido.',
        };
      }

      const updateRes = await client.query(`
        UPDATE fulfillment_items
        SET delivered_qty = $3,
            delivered_at = NOW(),
            delivered_by = $4
        WHERE id = $2 AND fulfillment_id = $1
        RETURNING *, is_delivered;
      `, [fulfillmentId, itemId, deliveredQty, userId]);

      return updateRes.rows[0];
    } finally {
      client.release();
    }
  }

  /**
   * Confirma la entrega final (IN_TRANSIT -> DELIVERED para DISPATCH, o PREPARED -> PICKED_UP para PICKUP)
   */
  static async deliverFulfillment(fulfillmentId: string, userId: string, payload: DeliveryConfirmationPayload) {
    const client = await dbPool.connect();
    try {
      await client.query('BEGIN;');

      const fulRes = await client.query(`SELECT * FROM fulfillments WHERE id = $1;`, [fulfillmentId]);
      if (fulRes.rows.length === 0) {
        await client.query('ROLLBACK;');
        throw { statusCode: 404, code: 'NOT_FOUND', message: 'Fulfillment no encontrado.' };
      }

      const ful = fulRes.rows[0];

      // Validar 100% checklist de entrega SOLO si mode es CHECKLIST
      if (payload.delivery_mode === 'CHECKLIST') {
        const checkRes = await client.query(`
          SELECT 
            COUNT(*) AS total_items,
            COUNT(CASE WHEN is_delivered THEN 1 END) AS delivered_items
          FROM fulfillment_items
          WHERE fulfillment_id = $1;
        `, [fulfillmentId]);

        const { total_items, delivered_items } = checkRes.rows[0];
        if (parseInt(total_items, 10) === 0 || parseInt(delivered_items, 10) < parseInt(total_items, 10)) {
          await client.query('ROLLBACK;');
          throw {
            statusCode: 400,
            code: 'CHECKLIST_DELIVERY_INCOMPLETE',
            message: `Faltan productos por confirmar en el checklist de entrega (${delivered_items}/${total_items}).`,
          };
        }
      }

      // Validar Pago Contra Entrega (COD)
      if (ful.requires_collection && ful.collection_status !== 'COLLECTED') {
        if (!payload.collection_received) {
          await client.query('ROLLBACK;');
          throw {
            statusCode: 400,
            code: 'COLLECTION_REQUIRED',
            message: `ATENCIÓN: Este pedido requiere cobrar $${ful.collection_amount} al entregar. Confirme la recepción del pago.`,
          };
        }
      }

      const targetStatus = ful.type === 'DISPATCH' ? 'DELIVERED' : 'PICKED_UP';
      const expectedCurrentStatus = ful.type === 'DISPATCH' ? 'IN_TRANSIT' : 'PREPARED';

      if (ful.status !== expectedCurrentStatus) {
        await client.query('ROLLBACK;');
        throw {
          statusCode: 400,
          code: 'INVALID_STATUS_TRANSITION',
          message: `El pedido debe estar en estado ${expectedCurrentStatus} para ser entregado.`,
        };
      }

      // Actualizar Fulfillment
      await client.query(`
        UPDATE fulfillments
        SET status = $2,
            delivered_at = NOW(),
            delivered_by = $3,
            recipient_name = $4,
            recipient_rut = $5,
            recipient_signature_url = $6,
            delivery_photo_url = $7,
            delivery_notes = $8,
            collection_status = CASE WHEN requires_collection THEN 'COLLECTED' ELSE collection_status END,
            version = version + 1,
            updated_at = NOW()
        WHERE id = $1;
      `, [
        fulfillmentId,
        targetStatus,
        userId,
        payload.recipient_name,
        payload.recipient_rut || null,
        payload.recipient_signature_url || null,
        payload.delivery_photo_url || null,
        payload.delivery_notes || null,
      ]);

      // Auditoría
      await client.query(`
        INSERT INTO fulfillment_status_history (fulfillment_id, previous_status, new_status, changed_by, notes)
        VALUES ($1, $2, $3, $4, $5);
      `, [
        fulfillmentId,
        expectedCurrentStatus,
        targetStatus,
        userId,
        `Entrega confirmada. Recibido por: ${payload.recipient_name}`
      ]);

      await client.query('COMMIT;');
      return { success: true, status: targetStatus };
    } catch (e) {
      await client.query('ROLLBACK;');
      throw e;
    } finally {
      client.release();
    }
  }

  /**
   * Reporta una incidencia en la entrega (ej. cliente ausente)
   */
  static async reportIssue(fulfillmentId: string, userId: string, payload: { issue_type: string, notes?: string }) {
    const client = await dbPool.connect();
    try {
      await client.query('BEGIN;');

      // Insert issue
      const insertRes = await client.query(`
        INSERT INTO fulfillment_delivery_issues (fulfillment_id, issue_type, notes, created_by)
        VALUES ($1, $2, $3, $4)
        RETURNING id;
      `, [fulfillmentId, payload.issue_type, payload.notes || null, userId]);

      // Auditoría, pero NO cambiamos el status
      await client.query(`
        INSERT INTO fulfillment_status_history (fulfillment_id, previous_status, new_status, changed_by, notes)
        VALUES ($1, 'IN_TRANSIT', 'IN_TRANSIT', $2, $3);
      `, [
        fulfillmentId,
        userId,
        `Incidencia reportada: ${payload.issue_type}. Notas: ${payload.notes || 'N/A'}`
      ]);

      await client.query('COMMIT;');
      return { success: true, issue_id: insertRes.rows[0].id };
    } catch (e) {
      await client.query('ROLLBACK;');
      throw e;
    } finally {
      client.release();
    }
  }
}
