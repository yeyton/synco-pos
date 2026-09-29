import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { dbPool } from '../db.js';

const POSSaleSchema = z.object({
  store_id: z.string().uuid(),
  warehouse_id: z.string().uuid(),
  shift_id: z.string().uuid().optional(),
  customer_id: z.string().uuid().optional(),
  source: z.enum(['POS', 'SHOPIFY', 'WOOCOMMERCE', 'MANUAL']).default('POS'),
  user_id: z.string().uuid(),
  external_order_id: z.string().optional(),
  items: z.array(
    z.object({
      variant_id: z.string().uuid(),
      quantity: z.number().positive(),
      unit_net_price: z.number().nonnegative(),
      unit_gross_price: z.number().nonnegative(),
    })
  ).min(1),
  payments: z.array(
    z.object({
      payment_method: z.enum(['CASH', 'DEBIT_CARD', 'CREDIT_CARD', 'TRANSFER', 'WEBPAY', 'OTHER']),
      amount: z.number().positive(),
      transaction_reference: z.string().optional(),
    })
  ).min(1),
  delivery_type: z.enum(['IMMEDIATE', 'DISPATCH', 'PICKUP']).default('IMMEDIATE'),
  shipping_amount: z.number().nonnegative().default(0),
  requires_collection: z.boolean().default(false),
  collection_amount: z.number().nonnegative().default(0),
  collection_method: z.enum(['CASH_ON_DELIVERY', 'POS_ON_DELIVERY', 'TRANSFER_ON_DELIVERY', 'UNDEFINED_ON_DELIVERY']).optional(),
});

export async function salesRoutes(fastify: FastifyInstance) {
  // Ultra-fast POS Checkout (<50 ms Latency Target)
  fastify.post('/checkout', async (request: FastifyRequest, reply: FastifyReply) => {
    const startTime = Date.now();
    const parseResult = POSSaleSchema.safeParse(request.body);

    if (!parseResult.success) {
      return reply.status(400).send({
        error: 'VALIDATION_ERROR',
        details: parseResult.error.format(),
      });
    }

    const payload = parseResult.data;
    const client = await dbPool.connect();

    try {
      // Invocación a la función atómica PL/pgSQL process_pos_sale
      const query = `
        SELECT out_order_id, out_order_number, out_total_amount
        FROM process_pos_sale($1, $2, $3, $4, $5, $6::jsonb, $7::jsonb, $8, $9, $10, $11, $12, $13, $14);
      `;

      const result = await client.query(query, [
        payload.store_id,
        payload.warehouse_id,
        payload.shift_id || null,
        payload.customer_id || null,
        payload.source,
        JSON.stringify(payload.items),
        JSON.stringify(payload.payments),
        payload.user_id,
        payload.external_order_id || null,
        payload.delivery_type,
        payload.shipping_amount,
        payload.requires_collection,
        payload.collection_amount,
        payload.collection_method || null,
      ]);

      const sale = result.rows[0];
      const durationMs = Date.now() - startTime;

      return reply.status(201).send({
        success: true,
        order_id: sale.out_order_id,
        order_number: sale.out_order_number,
        total_amount: sale.out_total_amount,
        latency_ms: durationMs,
      });
    } catch (err: any) {
      if (err.message && err.message.includes('INSUFFICIENT_STOCK')) {
        return reply.status(409).send({
          error: 'INSUFFICIENT_STOCK',
          message: err.message,
        });
      }
      request.log.error(err);
      return reply.status(500).send({
        error: 'INTERNAL_SERVER_ERROR',
        message: err.message,
      });
    } finally {
      client.release();
    }
  });

  // Endpoint para historial de ventas y reimpresión
  fastify.get('/history', async (request: FastifyRequest, reply: FastifyReply) => {
    const { date, query } = request.query as { date?: string; query?: string };
    
    let sql = `
      SELECT 
        o.id, 
        o.order_number, 
        o.created_at, 
        o.total_amount, 
        o.net_amount,
        o.vat_amount,
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
      WHERE 1=1
    `;
    const params: any[] = [];
    
    if (date) {
      params.push(date);
      sql += ` AND DATE(o.created_at AT TIME ZONE 'America/Santiago') = $${params.length}`;
    }
    
    if (query) {
      params.push(`%${query}%`);
      sql += ` AND (o.order_number ILIKE $${params.length} OR d.folio::text ILIKE $${params.length} OR c.name ILIKE $${params.length})`;
    }
    
    sql += ` ORDER BY o.created_at DESC LIMIT 50`;

    const client = await dbPool.connect();
    try {
      const result = await client.query(sql, params);
      return reply.send({ success: true, history: result.rows });
    } catch (err: any) {
      request.log.error(err);
      return reply.status(500).send({ error: 'INTERNAL_SERVER_ERROR' });
    } finally {
      client.release();
    }
  });
}
