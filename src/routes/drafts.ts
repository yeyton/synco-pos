import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { dbPool } from '../db.js';
import { z } from 'zod';

const CreateDraftSchema = z.object({
  store_id: z.string().uuid(),
  user_id: z.string().uuid().optional(),
  customer_id: z.string().uuid().optional().nullable(),
  items: z.array(z.any()).min(1),
  total_amount: z.number().nonnegative(),
});

export async function draftsRoutes(fastify: FastifyInstance) {
  
  // Listar borradores
  fastify.get('/', async (request: FastifyRequest, reply: FastifyReply) => {
    const { store_id } = request.query as { store_id?: string };
    
    let sql = `
      SELECT d.*, c.name as customer_name, c.rut as customer_rut
      FROM pos_drafts d
      LEFT JOIN customers c ON d.customer_id = c.id
    `;
    const params: any[] = [];
    
    if (store_id) {
      params.push(store_id);
      sql += ` WHERE d.store_id = $1`;
    }
    
    sql += ` ORDER BY d.created_at DESC LIMIT 50`;

    try {
      const { rows } = await dbPool.query(sql, params);
      return reply.send({ success: true, drafts: rows });
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Internal Server Error' });
    }
  });

  // Crear borrador
  fastify.post('/', async (request: FastifyRequest, reply: FastifyReply) => {
    const parseResult = CreateDraftSchema.safeParse(request.body);

    if (!parseResult.success) {
      return reply.status(400).send({
        error: 'VALIDATION_ERROR',
        details: parseResult.error.format(),
      });
    }

    const { store_id, user_id, customer_id, items, total_amount } = parseResult.data;

    try {
      const { rows } = await dbPool.query(`
        INSERT INTO pos_drafts (store_id, user_id, customer_id, items, total_amount)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING *
      `, [store_id, user_id || null, customer_id || null, JSON.stringify(items), total_amount]);
      
      return reply.status(201).send({ success: true, draft: rows[0] });
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Internal Server Error' });
    }
  });

  // Eliminar borrador
  fastify.delete('/:id', async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const { id } = request.params;
    try {
      await dbPool.query('DELETE FROM pos_drafts WHERE id = $1', [id]);
      return reply.send({ success: true });
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Internal Server Error' });
    }
  });
}
