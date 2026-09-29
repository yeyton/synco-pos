import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { dbPool } from '../db.js';
import { FulfillmentService } from '../services/fulfillmentService.js';

// Schemas Zod
const LoginPinSchema = z.object({
  pin: z.string().min(4).max(8),
  email: z.string().email().optional(),
  user_id: z.string().uuid().optional(),
});

const UpdateItemQtySchema = z.object({
  quantity: z.number().nonnegative(),
});

const DeliverSchema = z.object({
  recipient_name: z.string().min(2),
  recipient_rut: z.string().optional(),
  recipient_signature_url: z.string().optional(),
  delivery_photo_url: z.string().optional(),
  delivery_notes: z.string().optional(),
  collection_received: z.boolean().optional(),
  collection_reference: z.string().optional(),
  delivery_mode: z.enum(['QUICK', 'CHECKLIST']),
});

export async function fulfillmentRoutes(fastify: FastifyInstance) {
  // Middleware de Autenticación
  const authenticate = async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      await request.jwtVerify();
    } catch (err) {
      return reply.status(401).send({ error: 'UNAUTHORIZED', message: 'Token de sesión inválido o expirado' });
    }
  };

  // Helper RBAC
  const requirePermission = (permission: string) => {
    return async (request: FastifyRequest, reply: FastifyReply) => {
      const user = request.user as { permissions: string[]; role: string };
      if (user.role === 'ADMIN') return; // Admin bypass
      if (!user.permissions || !user.permissions.includes(permission)) {
        return reply.status(403).send({
          error: 'FORBIDDEN',
          message: `No tiene los permisos requeridos para esta acción (${permission}).`,
        });
      }
    };
  };

  // 1. LOGIN POR PIN
  fastify.post('/auth/login-pin', async (request: FastifyRequest, reply: FastifyReply) => {
    const parseResult = LoginPinSchema.safeParse(request.body);
    if (!parseResult.success) {
      return reply.status(400).send({ error: 'VALIDATION_ERROR', details: parseResult.error.format() });
    }

    const { pin, email, user_id } = parseResult.data;
    const client = await dbPool.connect();

    try {
      let candidateUsers: any[] = [];

      if (user_id || email) {
        const uRes = await client.query(
          `SELECT * FROM users WHERE (id = $1 OR email = $2) AND is_active = true;`,
          [user_id || null, email || null]
        );
        candidateUsers = uRes.rows;
      } else {
        const uRes = await client.query(`SELECT * FROM users WHERE is_active = true;`);
        candidateUsers = uRes.rows;
      }

      let matchedUser: any = null;

      for (const u of candidateUsers) {
        // Verificar bloqueo por tiempo
        if (u.locked_until && new Date(u.locked_until) > new Date()) {
          return reply.status(401).send({
            error: 'ACCOUNT_LOCKED',
            message: `Cuenta bloqueada temporalmente debido a 5 intentos fallidos. Intente nuevamente después de ${new Date(u.locked_until).toLocaleTimeString('es-CL')}.`,
          });
        }

        const isMatch = await bcrypt.compare(pin, u.pin_hash);
        if (isMatch) {
          matchedUser = u;
          break;
        } else if (user_id || email) {
          // Si especificó usuario exacto e ingresó PIN incorrecto, incrementar intentos fallidos
          const attempts = (u.failed_pin_attempts || 0) + 1;
          if (attempts >= 5) {
            const lockTime = new Date(Date.now() + 15 * 60 * 1000); // 15 minutos
            await client.query(
              `UPDATE users SET failed_pin_attempts = $1, locked_until = $2 WHERE id = $3;`,
              [attempts, lockTime, u.id]
            );
            return reply.status(401).send({
              error: 'ACCOUNT_LOCKED',
              message: 'Cuenta bloqueada temporalmente por 15 minutos debido a 5 intentos fallidos consecutivos.',
            });
          } else {
            await client.query(
              `UPDATE users SET failed_pin_attempts = $1 WHERE id = $2;`,
              [attempts, u.id]
            );
          }
        }
      }

      if (!matchedUser) {
        return reply.status(401).send({ error: 'INVALID_PIN', message: 'PIN incorrecto o usuario no encontrado.' });
      }

      // Reiniciar intentos fallidos tras login exitoso
      await client.query(`UPDATE users SET failed_pin_attempts = 0, locked_until = NULL WHERE id = $1;`, [matchedUser.id]);

      // Generar JWT
      const token = fastify.jwt.sign(
        {
          id: matchedUser.id,
          name: matchedUser.name,
          role: matchedUser.role,
          permissions: matchedUser.permissions,
        },
        { expiresIn: '8h' }
      );

      return reply.send({
        success: true,
        token,
        user: {
          id: matchedUser.id,
          name: matchedUser.name,
          role: matchedUser.role,
          permissions: matchedUser.permissions,
        },
      });
    } finally {
      client.release();
    }
  });

  // 2. LISTAR FULFILLMENTS (Dashboard)
  fastify.get('/', { preHandler: [authenticate] }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { status, type, search } = request.query as { status?: string; type?: 'DISPATCH' | 'PICKUP'; search?: string };
    const items = await FulfillmentService.getFulfillments({ status, type, search });
    return reply.send({ success: true, items });
  });

  // 3. DETALLE DE UN FULFILLMENT
  fastify.get('/:id', { preHandler: [authenticate] }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const fulfillment = await FulfillmentService.getFulfillmentById(id);
    if (!fulfillment) {
      return reply.status(404).send({ error: 'NOT_FOUND', message: 'Fulfillment no encontrado' });
    }
    return reply.send({ success: true, fulfillment });
  });

  // 4. INICIAR ALISTAMIENTO (PENDING -> PREPARING)
  fastify.post('/:id/start-preparing', { preHandler: [authenticate, requirePermission('fulfillment:prepare')] }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const user = request.user as { id: string };

    try {
      const result = await FulfillmentService.startPreparing(id, user.id);
      return reply.send(result);
    } catch (err: any) {
      return reply.status(err.statusCode || 500).send({ error: err.code || 'SERVER_ERROR', message: err.message });
    }
  });

  // 5. MARCAR / ACTUALIZAR ÍTEM PREPARADO EN CHECKLIST
  fastify.put('/:id/items/:itemId/prepare', { preHandler: [authenticate, requirePermission('fulfillment:prepare')] }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { id, itemId } = request.params as { id: string; itemId: string };
    const user = request.user as { id: string };
    const parseResult = UpdateItemQtySchema.safeParse(request.body);

    if (!parseResult.success) {
      return reply.status(400).send({ error: 'VALIDATION_ERROR', details: parseResult.error.format() });
    }

    try {
      const item = await FulfillmentService.updatePreparedItem(id, itemId, parseResult.data.quantity, user.id);
      return reply.send({ success: true, item });
    } catch (err: any) {
      return reply.status(err.statusCode || 500).send({ error: err.code || 'SERVER_ERROR', message: err.message });
    }
  });

  // 6. CONFIRMAR 100% PREPARADO (PREPARING -> PREPARED)
  fastify.post('/:id/confirm-prepared', { preHandler: [authenticate, requirePermission('fulfillment:confirm_prepared')] }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const user = request.user as { id: string };

    try {
      const result = await FulfillmentService.confirmPrepared(id, user.id);
      return reply.send(result);
    } catch (err: any) {
      return reply.status(err.statusCode || 500).send({ error: err.code || 'SERVER_ERROR', message: err.message });
    }
  });

  // 7. SALIR A RUTA (PREPARED -> IN_TRANSIT, Acción UI: "Salir a ruta")
  fastify.post('/:id/dispatch', { preHandler: [authenticate, requirePermission('fulfillment:dispatch')] }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const user = request.user as { id: string };

    try {
      const result = await FulfillmentService.dispatchToRoute(id, user.id);
      return reply.send(result);
    } catch (err: any) {
      return reply.status(err.statusCode || 500).send({ error: err.code || 'SERVER_ERROR', message: err.message });
    }
  });

  // 8. MARCAR ÍTEM EN CHECKLIST DE ENTREGA
  fastify.put('/:id/items/:itemId/deliver', { preHandler: [authenticate, requirePermission('fulfillment:deliver')] }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { id, itemId } = request.params as { id: string; itemId: string };
    const user = request.user as { id: string };
    const parseResult = UpdateItemQtySchema.safeParse(request.body);

    if (!parseResult.success) {
      return reply.status(400).send({ error: 'VALIDATION_ERROR', details: parseResult.error.format() });
    }

    try {
      const item = await FulfillmentService.updateDeliveredItem(id, itemId, parseResult.data.quantity, user.id);
      return reply.send({ success: true, item });
    } catch (err: any) {
      return reply.status(err.statusCode || 500).send({ error: err.code || 'SERVER_ERROR', message: err.message });
    }
  });

  // 9. CONFIRMAR ENTREGA FINAL (DELIVERED / PICKED_UP)
  fastify.post('/:id/deliver', { preHandler: [authenticate, requirePermission('fulfillment:deliver')] }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const user = request.user as { id: string };
    const parseResult = DeliverSchema.safeParse(request.body);

    if (!parseResult.success) {
      return reply.status(400).send({ error: 'VALIDATION_ERROR', details: parseResult.error.format() });
    }

    try {
      const result = await FulfillmentService.deliverFulfillment(id, user.id, parseResult.data);
      return reply.send(result);
    } catch (err: any) {
      return reply.status(err.statusCode || 500).send({ error: err.code || 'SERVER_ERROR', message: err.message });
    }
  // 10. REPORTAR INCIDENCIA EN ENTREGA
  fastify.post('/:id/issues', { preHandler: [authenticate, requirePermission('fulfillment:deliver')] }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const user = request.user as { id: string };
    
    const IssueSchema = z.object({
      issue_type: z.string().min(2),
      notes: z.string().optional()
    });
    
    const parseResult = IssueSchema.safeParse(request.body);
    if (!parseResult.success) {
      return reply.status(400).send({ error: 'VALIDATION_ERROR', details: parseResult.error.format() });
    }

    try {
      const result = await FulfillmentService.reportIssue(id, user.id, parseResult.data);
      return reply.send(result);
    } catch (err: any) {
      return reply.status(err.statusCode || 500).send({ error: err.code || 'SERVER_ERROR', message: err.message });
    }
  });
}
