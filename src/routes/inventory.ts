import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { dbPool } from '../db.js';

const ReserveSchema = z.object({
  warehouse_id: z.string().uuid(),
  variant_id: z.string().uuid(),
  quantity: z.number().positive(),
  cart_token: z.string().min(1),
  ttl_minutes: z.number().int().positive().default(15),
});

export async function inventoryRoutes(fastify: FastifyInstance) {
  // Búsqueda ultra rápida para escáner POS (<10 ms por barcode o SKU)
  fastify.get('/lookup', async (request: FastifyRequest, reply: FastifyReply) => {
    const { code, store_id } = request.query as { code?: string; store_id?: string };

    if (!code) {
      return reply.status(400).send({ error: 'QUERY_PARAM_REQUIRED', message: 'Param "code" is required' });
    }

    const client = await dbPool.connect();
    try {
      const query = `
        SELECT 
          pv.id AS variant_id,
          p.id AS product_id,
          p.name AS product_name,
          p.brand,
          p.attributes,
          pv.sku,
          pv.barcode,
          pv.variant_name,
          pv.net_price,
          pv.vat_rate,
          pv.gross_price,
          COALESCE(i.stock_physical - i.stock_reserved, 0) AS stock_available
        FROM product_variants pv
        JOIN products p ON p.id = pv.product_id
        LEFT JOIN inventory i ON i.variant_id = pv.id
        WHERE (pv.barcode = $1 OR pv.sku = $1)
          AND p.is_active = true AND pv.is_active = true
        LIMIT 1;
      `;

      const result = await client.query(query, [code]);

      if (result.rows.length === 0) {
        return reply.status(404).send({ error: 'PRODUCT_NOT_FOUND', message: `No product found for code ${code}` });
      }

      return reply.send({ success: true, item: result.rows[0] });
    } finally {
      client.release();
    }
  });

  // Reserva de stock para carrito web
  fastify.post('/reserve', async (request: FastifyRequest, reply: FastifyReply) => {
    const parseResult = ReserveSchema.safeParse(request.body);
    if (!parseResult.success) {
      return reply.status(400).send({ error: 'VALIDATION_ERROR', details: parseResult.error.format() });
    }

    const { warehouse_id, variant_id, quantity, cart_token, ttl_minutes } = parseResult.data;
    const client = await dbPool.connect();

    try {
      const result = await client.query(
        `SELECT reserve_web_cart_stock($1, $2, $3, $4, $5) AS reserved;`,
        [warehouse_id, variant_id, quantity, cart_token, ttl_minutes]
      );

      const isReserved = result.rows[0].reserved;
      if (!isReserved) {
        return reply.status(409).send({ error: 'STOCK_UNAVAILABLE', message: 'Not enough available stock to reserve' });
      }

      return reply.send({ success: true, reserved: true, cart_token });
    } finally {
      client.release();
    }
  });

  // Catálogo completo para grilla POS
  fastify.get('/catalog', async (request: FastifyRequest, reply: FastifyReply) => {
    const { search } = request.query as { search?: string };
    const client = await dbPool.connect();

    try {
      let query = `
        SELECT 
          pv.id AS variant_id,
          p.id AS product_id,
          p.name AS product_name,
          p.brand,
          pv.sku,
          pv.barcode,
          pv.net_price,
          pv.gross_price,
          pv.vat_rate,
          COALESCE(i.stock_physical - i.stock_reserved, 0) AS stock_available
        FROM product_variants pv
        JOIN products p ON p.id = pv.product_id
        LEFT JOIN inventory i ON i.variant_id = pv.id
        WHERE p.is_active = true AND pv.is_active = true
      `;
      
      const params: any[] = [];
      
      if (search) {
        query += ` AND (p.name ILIKE $1 OR pv.sku ILIKE $1 OR pv.barcode ILIKE $1)`;
        params.push(`%${search}%`);
      }
      
      query += ` ORDER BY p.name ASC LIMIT 50;`;

      const result = await client.query(query, params);
      return reply.send({ success: true, items: result.rows });
    } catch (e) {
      fastify.log.error(e);
      return reply.status(500).send({ error: 'INTERNAL_SERVER_ERROR' });
    } finally {
      client.release();
    }
  });

  // Productos más vendidos (Destacados)
  fastify.get('/featured', async (request: FastifyRequest, reply: FastifyReply) => {
    const client = await dbPool.connect();

    try {
      const query = `
        SELECT 
          pv.id AS variant_id,
          p.id AS product_id,
          p.name AS product_name,
          p.brand,
          pv.sku,
          pv.barcode,
          pv.variant_name,
          pv.net_price,
          pv.gross_price,
          pv.vat_rate,
          COALESCE(i.stock_physical - i.stock_reserved, 0) AS stock_available,
          SUM(oi.quantity) as sold_qty
        FROM product_variants pv
        JOIN products p ON p.id = pv.product_id
        LEFT JOIN inventory i ON i.variant_id = pv.id
        LEFT JOIN order_items oi ON oi.variant_id = pv.id
        WHERE p.is_active = true AND pv.is_active = true
        GROUP BY pv.id, p.id, p.name, p.brand, pv.sku, pv.barcode, pv.variant_name, pv.net_price, pv.gross_price, pv.vat_rate, i.stock_physical, i.stock_reserved
        ORDER BY sold_qty DESC NULLS LAST
        LIMIT 10;
      `;
      
      const result = await client.query(query);
      return reply.send({ success: true, items: result.rows });
    } catch (e) {
      fastify.log.error(e);
      return reply.status(500).send({ error: 'INTERNAL_SERVER_ERROR' });
    } finally {
      client.release();
    }
  });
}
