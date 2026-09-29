import Fastify from 'fastify';
import cors from '@fastify/cors';
import dotenv from 'dotenv';
import fastifyJwt from '@fastify/jwt';
import { salesRoutes } from './routes/sales.js';
import { inventoryRoutes } from './routes/inventory.js';
import { customerRoutes } from './routes/customers.js';
import { draftsRoutes } from './routes/drafts.js';
import { dispatchRoutes } from './routes/dispatch.js';
import { fulfillmentRoutes } from './routes/fulfillment.js';

dotenv.config();

const fastify = Fastify({
  logger: true,
});

async function startServer() {
  // Habilitar CORS para clientes POS Web / Móvil / Desktop (Tauri/Electron)
  await fastify.register(cors, {
    origin: '*',
  });

  // Habilitar JWT para autenticación de usuarios/trabajadores
  await fastify.register(fastifyJwt, {
    secret: process.env.JWT_SECRET || 'synco-pos-super-secret-key-2026',
  });

  // Registrar Prefijos de la API REST
  await fastify.register(salesRoutes, { prefix: '/api/v1/sales' });
  await fastify.register(inventoryRoutes, { prefix: '/api/v1/inventory' });
  await fastify.register(customerRoutes, { prefix: '/api/v1/customers' });
  await fastify.register(draftsRoutes, { prefix: '/api/v1/drafts' });
  await fastify.register(dispatchRoutes, { prefix: '/api/v1/dispatch' });
  await fastify.register(fulfillmentRoutes, { prefix: '/api/v1/fulfillment' });

  // Health check endpoint
  fastify.get('/health', async () => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  });

  const PORT = parseInt(process.env.PORT || '3000', 10);
  const HOST = process.env.HOST || '0.0.0.0';

  try {
    await fastify.listen({ port: PORT, host: HOST });
    console.log(`🚀 SYNCO POS Server running on http://${HOST}:${PORT}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
}

startServer();
