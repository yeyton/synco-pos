import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { dbPool } from '../db.js';

const DispatchSchema = z.object({
  order_id: z.string().uuid(),
  dispatch_type: z.string(),
  dispatch_date: z.string(),
  recipient_name: z.string(),
  address: z.string(),
  commune: z.string(),
  city: z.string(),
  region: z.string().optional().default(''),
  document_number: z.coerce.string().optional().default(''),
  departure_date: z.string(),
  departure_time: z.string().optional().default(''),
  arrival_date: z.string().optional().default(''),
  carrier_rut: z.string().optional().default(''),
  driver_rut: z.string().optional().default(''),
  driver_name: z.string().optional().default(''),
  transport_plate: z.string().optional().default(''),
  total_amount: z.coerce.number(),
});

export async function dispatchRoutes(fastify: FastifyInstance) {
  
  // Obtener documentos (órdenes) disponibles para despachar
  fastify.get('/pending', async (request: FastifyRequest, reply: FastifyReply) => {
    const { store_id } = request.query as { store_id?: string };
    
    if (!store_id) {
      return reply.status(400).send({ error: 'store_id is required' });
    }

    const client = await dbPool.connect();
    try {
      // Buscar órdenes finalizadas, que sean de despacho y que no estén en la tabla dispatches
      const sql = `
        SELECT 
          o.id, 
          o.order_number, 
          o.created_at, 
          o.total_amount, 
          d.dte_type, 
          d.folio, 
          c.name as customer_name,
          c.rut as customer_rut,
          (
            SELECT json_agg(json_build_object(
              'variant_id', oi.variant_id,
              'quantity', oi.quantity,
              'unit_gross_price', oi.unit_gross_price,
              'product_name', p.name
            ))
            FROM order_items oi
            JOIN product_variants pv ON oi.variant_id = pv.id
            JOIN products p ON pv.product_id = p.id
            WHERE oi.order_id = o.id
          ) as items
        FROM orders o
        LEFT JOIN dte_invoices d ON o.id = d.order_id
        LEFT JOIN customers c ON o.customer_id = c.id
        LEFT JOIN dispatches disp ON o.id = disp.order_id
        WHERE o.store_id = $1 
          AND o.delivery_type = 'DISPATCH' 
          AND o.status = 'COMPLETED'
          AND disp.id IS NULL
        ORDER BY o.created_at DESC
        LIMIT 100
      `;
      const result = await client.query(sql, [store_id]);
      return reply.send({ success: true, pending: result.rows });
    } catch (err: any) {
      request.log.error(err);
      return reply.status(500).send({ error: 'INTERNAL_SERVER_ERROR' });
    } finally {
      client.release();
    }
  });

  // Crear la Guía de Despacho (Confirmar Despacho)
  fastify.post('/', async (request: FastifyRequest, reply: FastifyReply) => {
    const parseResult = DispatchSchema.safeParse(request.body);

    if (!parseResult.success) {
      return reply.status(400).send({
        error: 'VALIDATION_ERROR',
        details: parseResult.error.format(),
      });
    }

    const payload = parseResult.data;
    const client = await dbPool.connect();

    try {
      // Validar que la orden existe y es de despacho
      const orderCheck = await client.query('SELECT id, delivery_type FROM orders WHERE id = $1', [payload.order_id]);
      if (orderCheck.rowCount === 0) {
        return reply.status(404).send({ error: 'ORDER_NOT_FOUND' });
      }

      const sql = `
        INSERT INTO dispatches (
          order_id, dispatch_type, dispatch_date, recipient_name, address, commune, city, region,
          document_number, departure_date, departure_time, arrival_date, carrier_rut, driver_rut,
          driver_name, transport_plate, total_amount, status
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, 'CONFIRMED'
        ) RETURNING id
      `;
      
      const values = [
        payload.order_id, payload.dispatch_type, payload.dispatch_date, payload.recipient_name,
        payload.address, payload.commune, payload.city, payload.region, payload.document_number,
        payload.departure_date, payload.departure_time || null, payload.arrival_date || null,
        payload.carrier_rut, payload.driver_rut, payload.driver_name, payload.transport_plate,
        payload.total_amount
      ];

      const result = await client.query(sql, values);

      return reply.status(201).send({
        success: true,
        dispatch_id: result.rows[0].id,
      });
    } catch (err: any) {
      request.log.error(err);
      if (err.code === '23505') { // unique violation
        return reply.status(409).send({ error: 'DISPATCH_ALREADY_EXISTS' });
      }
      return reply.status(500).send({ error: 'INTERNAL_SERVER_ERROR' });
    } finally {
      client.release();
    }
  });
}
