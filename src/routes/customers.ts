import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { dbPool } from '../db.js';

export async function customerRoutes(fastify: FastifyInstance) {
  
  // Buscar clientes por RUT, correo o nombre
  fastify.get('/search', async (request: FastifyRequest<{ Querystring: { query: string } }>, reply: FastifyReply) => {
    const { query } = request.query;
    
    try {
      if (!query) {
        const { rows } = await dbPool.query(
          `SELECT id, rut, name, email, phone, address, commune, business_line 
           FROM customers 
           ORDER BY created_at DESC 
           LIMIT 20`
        );
        return reply.send(rows);
      }
      
      const { rows } = await dbPool.query(
        `SELECT id, rut, name, email, phone, address, commune, business_line 
         FROM customers 
         WHERE rut ILIKE $1 OR name ILIKE $1 OR email ILIKE $1 
         ORDER BY name ASC 
         LIMIT 20`,
        [`%${query}%`]
      );
      
      return reply.send(rows);
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Internal Server Error' });
    }
  });

  // Buscar cliente por RUT
  fastify.get('/:rut', async (request: FastifyRequest<{ Params: { rut: string } }>, reply: FastifyReply) => {
    const { rut } = request.params;
    
    try {
      const { rows } = await dbPool.query(
        'SELECT id, rut, name, email, phone, address, commune, business_line FROM customers WHERE rut = $1',
        [rut]
      );
      
      if (rows.length === 0) {
        return reply.status(404).send({ error: 'Customer not found' });
      }
      
      return reply.send(rows[0]);
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Internal Server Error' });
    }
  });

  // Crear o actualizar cliente
  fastify.post('/', async (request: FastifyRequest<{ Body: { rut: string; name: string; business_line?: string; address?: string; commune?: string; email?: string } }>, reply: FastifyReply) => {
    const { rut, name, business_line, address, commune, email } = request.body;
    
    if (!rut || !name) {
      return reply.status(400).send({ error: 'rut and name are required' });
    }

    try {
      // Upsert: Insertar si no existe, actualizar si ya existe
      const { rows } = await dbPool.query(`
        INSERT INTO customers (rut, name, business_line, address, commune, email)
        VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT (rut) 
        DO UPDATE SET 
          name = EXCLUDED.name,
          business_line = EXCLUDED.business_line,
          address = EXCLUDED.address,
          commune = EXCLUDED.commune,
          email = EXCLUDED.email
        RETURNING id, rut, name, business_line, address, commune, email
      `, [rut, name, business_line || null, address || null, commune || null, email || null]);
      
      return reply.status(200).send(rows[0]);
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Internal Server Error' });
    }
  });
}
