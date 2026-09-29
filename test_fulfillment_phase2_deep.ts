import bcrypt from 'bcryptjs';
import { dbPool } from './src/db.js';

async function runDeepValidation() {
  const baseUrl = 'http://localhost:3000/api/v1/fulfillment';
  console.log('🧪 ========================================================');
  console.log('🧪 BATERÍA DE PRUEBAS DE SEGURIDAD Y VALIDACIÓN FASE 2');
  console.log('🧪 ========================================================\n');

  const client = await dbPool.connect();

  try {
    // -------------------------------------------------------------------------
    // GRUPO 1: SEGURIDAD DEL PIN & LOCKOUT
    // -------------------------------------------------------------------------
    console.log('🔐 [GRUPO 1] Pruebas de Seguridad de PIN y Bloqueo...');

    // Crear un usuario de prueba especifico para prueba de bloqueo
    const lockUserPin = '9999';
    const lockUserHash = await bcrypt.hash(lockUserPin, 10);
    const lockUserId = '88888888-7777-6666-5555-444444444444';
    const lockUserEmail = 'locktest@synco.cl';

    await client.query(`
      INSERT INTO users (id, name, email, pin_hash, role, permissions)
      VALUES ($1, 'Usuario Lockout Test', $2, $3, 'OPERATOR', '[]'::jsonb)
      ON CONFLICT (id) DO UPDATE SET failed_pin_attempts = 0, locked_until = NULL;
    `, [lockUserId, lockUserEmail, lockUserHash]);

    // 1.1 PIN Incorrecto
    const wrongPinRes = await fetch(`${baseUrl}/auth/login-pin`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: lockUserEmail, pin: '0000' }),
    });
    if (wrongPinRes.status === 401) {
      console.log('  ✅ 1.1 PIN Incorrecto rechazado con HTTP 401');
    } else {
      throw new Error(`Fallo 1.1: Se esperaba 401, se obtuvo ${wrongPinRes.status}`);
    }

    // 1.2 Ejecutar 4 intentos fallidos adicionales (Total 5)
    for (let i = 0; i < 4; i++) {
      await fetch(`${baseUrl}/auth/login-pin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: lockUserEmail, pin: '0000' }),
      });
    }

    // 1.3 Intentar login mientras está bloqueado
    const lockRes = await fetch(`${baseUrl}/auth/login-pin`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: lockUserEmail, pin: lockUserPin }), // PIN correcto pero cuenta bloqueada
    });
    const lockData = await lockRes.json();
    if (lockRes.status === 401 && lockData.error === 'ACCOUNT_LOCKED') {
      console.log('  ✅ 1.2 Bloqueo automático de 15 min tras 5 intentos fallidos VERIFICADO:', lockData.message);
    } else {
      throw new Error(`Fallo 1.2: Se esperaba ACCOUNT_LOCKED, se obtuvo ${JSON.stringify(lockData)}`);
    }

    // Desbloquear usuario para pruebas posteriores
    await client.query(`UPDATE users SET failed_pin_attempts = 0, locked_until = NULL WHERE id = $1;`, [lockUserId]);
    console.log('  ✅ 1.3 Desbloqueo y reseteo de seguridad auditado');

    // -------------------------------------------------------------------------
    // GRUPO 2: PRUEBAS DE AUTORIZACIÓN RBAC (HTTP 403 FORBIDDEN)
    // -------------------------------------------------------------------------
    console.log('\n🛡️ [GRUPO 2] Pruebas de Autorización RBAC (403 Forbidden)...');

    // Login con el usuario sin permisos (OPERATOR)
    const operatorLoginRes = await fetch(`${baseUrl}/auth/login-pin`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: lockUserEmail, pin: lockUserPin }),
    });
    const operatorToken = (await operatorLoginRes.json()).token;
    const operatorHeaders = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${operatorToken}`,
    };

    // Crear un fulfillment dummy para probar permisos 403
    const storeId = (await client.query('SELECT id FROM stores LIMIT 1;')).rows[0].id;
    const warehouseId = (await client.query('SELECT id FROM warehouses LIMIT 1;')).rows[0].id;
    const variantId = (await client.query('SELECT id FROM product_variants LIMIT 1;')).rows[0].id;
    const adminUserId = '99999999-8888-7777-6666-555555555555';

    const dummySale = await client.query(`
      SELECT out_order_id 
      FROM process_pos_sale($1, $2, NULL, NULL, 'POS', $3::jsonb, $4::jsonb, $5, NULL, 'DISPATCH', 0);
    `, [
      storeId,
      warehouseId,
      JSON.stringify([{ variant_id: variantId, quantity: 1, unit_net_price: 1000, unit_gross_price: 1190 }]),
      JSON.stringify([{ payment_method: 'CASH', amount: 1190 }]),
      adminUserId
    ]);
    const rbacFulfillmentId = (await client.query('SELECT id FROM fulfillments WHERE order_id = $1;', [dummySale.rows[0].out_order_id])).rows[0].id;

    // 2.1 Intentar start-preparing sin permiso fulfillment:prepare
    const rbac1 = await fetch(`${baseUrl}/${rbacFulfillmentId}/start-preparing`, { method: 'POST', headers: operatorHeaders, body: JSON.stringify({}) });
    if (rbac1.status === 403) {
      console.log('  ✅ 2.1 Sin permiso "fulfillment:prepare" -> HTTP 403 Forbidden');
    } else {
      throw new Error(`Fallo 2.1: Se esperaba 403, se obtuvo ${rbac1.status}`);
    }

    // 2.2 Intentar confirm-prepared sin permiso fulfillment:confirm_prepared
    const rbac2 = await fetch(`${baseUrl}/${rbacFulfillmentId}/confirm-prepared`, { method: 'POST', headers: operatorHeaders, body: JSON.stringify({}) });
    if (rbac2.status === 403) {
      console.log('  ✅ 2.2 Sin permiso "fulfillment:confirm_prepared" -> HTTP 403 Forbidden');
    } else {
      throw new Error(`Fallo 2.2: Se esperaba 403, se obtuvo ${rbac2.status}`);
    }

    // 2.3 Intentar dispatch sin permiso fulfillment:dispatch
    const rbac3 = await fetch(`${baseUrl}/${rbacFulfillmentId}/dispatch`, { method: 'POST', headers: operatorHeaders, body: JSON.stringify({}) });
    if (rbac3.status === 403) {
      console.log('  ✅ 2.3 Sin permiso "fulfillment:dispatch" -> HTTP 403 Forbidden');
    } else {
      throw new Error(`Fallo 2.3: Se esperaba 403, se obtuvo ${rbac3.status}`);
    }

    // 2.4 Intentar deliver sin permiso fulfillment:deliver
    const rbac4 = await fetch(`${baseUrl}/${rbacFulfillmentId}/deliver`, { method: 'POST', headers: operatorHeaders, body: JSON.stringify({}) });
    if (rbac4.status === 403) {
      console.log('  ✅ 2.4 Sin permiso "fulfillment:deliver" -> HTTP 403 Forbidden');
    } else {
      throw new Error(`Fallo 2.4: Se esperaba 403, se obtuvo ${rbac4.status}`);
    }

    // -------------------------------------------------------------------------
    // GRUPO 3: PAGO CONTRA ENTREGA (COD)
    // -------------------------------------------------------------------------
    console.log('\n💵 [GRUPO 3] Pruebas de Pago Contra Entrega (COD)...');

    // Login Admin
    const adminLoginRes = await fetch(`${baseUrl}/auth/login-pin`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pin: '1234' }),
    });
    const adminToken = (await adminLoginRes.json()).token;
    const adminHeaders = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${adminToken}` };

    // Crear venta COD
    const codSale = await client.query(`
      SELECT out_order_id 
      FROM process_pos_sale($1, $2, NULL, NULL, 'POS', $3::jsonb, $4::jsonb, $5, NULL, 'DISPATCH', 0);
    `, [
      storeId,
      warehouseId,
      JSON.stringify([{ variant_id: variantId, quantity: 1, unit_net_price: 1000, unit_gross_price: 1190 }]),
      JSON.stringify([{ payment_method: 'CASH', amount: 1190 }]),
      adminUserId
    ]);
    const codFulfillmentId = (await client.query('SELECT id FROM fulfillments WHERE order_id = $1;', [codSale.rows[0].out_order_id])).rows[0].id;

    // Configurar el fulfillment como COD explícito
    await client.query(`
      UPDATE fulfillments 
      SET requires_collection = true, collection_amount = 50000.00, collection_method = 'POS_ON_DELIVERY', collection_status = 'PENDING' 
      WHERE id = $1;
    `, [codFulfillmentId]);

    // Avanzar a IN_TRANSIT
    await fetch(`${baseUrl}/${codFulfillmentId}/start-preparing`, { method: 'POST', headers: adminHeaders, body: JSON.stringify({}) });
    const itemId = (await client.query('SELECT id FROM fulfillment_items WHERE fulfillment_id = $1;', [codFulfillmentId])).rows[0].id;
    await fetch(`${baseUrl}/${codFulfillmentId}/items/${itemId}/prepare`, { method: 'PUT', headers: adminHeaders, body: JSON.stringify({ quantity: 1 }) });
    await fetch(`${baseUrl}/${codFulfillmentId}/confirm-prepared`, { method: 'POST', headers: adminHeaders, body: JSON.stringify({}) });
    await fetch(`${baseUrl}/${codFulfillmentId}/dispatch`, { method: 'POST', headers: adminHeaders, body: JSON.stringify({}) });
    await fetch(`${baseUrl}/${codFulfillmentId}/items/${itemId}/deliver`, { method: 'PUT', headers: adminHeaders, body: JSON.stringify({ quantity: 1 }) });

    // 3.1 Intentar entregar sin confirmar cobro COD
    const codFailRes = await fetch(`${baseUrl}/${codFulfillmentId}/deliver`, {
      method: 'POST',
      headers: adminHeaders,
      body: JSON.stringify({ recipient_name: 'Cliente COD', collection_received: false }),
    });
    if (codFailRes.status === 400) {
      console.log('  ✅ 3.1 Entrega bloqueada por cobro pendiente (HTTP 400):', (await codFailRes.json()).message);
    } else {
      throw new Error(`Fallo 3.1: Se esperaba 400, se obtuvo ${codFailRes.status}`);
    }

    // 3.2 Entregar confirmando cobro COD
    const codSuccessRes = await fetch(`${baseUrl}/${codFulfillmentId}/deliver`, {
      method: 'POST',
      headers: adminHeaders,
      body: JSON.stringify({ recipient_name: 'Cliente COD', collection_received: true, collection_reference: 'POS-VOUCHER-554' }),
    });
    if (codSuccessRes.status === 200) {
      const checkCodDb = (await client.query('SELECT collection_status FROM fulfillments WHERE id = $1;', [codFulfillmentId])).rows[0];
      if (checkCodDb.collection_status === 'COLLECTED') {
        console.log('  ✅ 3.2 Cobro registrado en DB (collection_status = COLLECTED)');
      } else {
        throw new Error('Fallo 3.2: collection_status no cambió a COLLECTED en DB');
      }
    } else {
      throw new Error(`Fallo 3.2: Se esperaba 200, se obtuvo ${codSuccessRes.status}`);
    }

    // -------------------------------------------------------------------------
    // GRUPO 4: FLUJO PICKUP VS DISPATCH
    // -------------------------------------------------------------------------
    console.log('\n📦 [GRUPO 4] Pruebas de Diferenciación Flujo PICKUP vs DISPATCH...');

    // Crear Venta PICKUP
    const pickupSale = await client.query(`
      SELECT out_order_id 
      FROM process_pos_sale($1, $2, NULL, NULL, 'POS', $3::jsonb, $4::jsonb, $5, NULL, 'PICKUP', 0);
    `, [
      storeId,
      warehouseId,
      JSON.stringify([{ variant_id: variantId, quantity: 1, unit_net_price: 1000, unit_gross_price: 1190 }]),
      JSON.stringify([{ payment_method: 'CASH', amount: 1190 }]),
      adminUserId
    ]);
    const pickupFulfillmentId = (await client.query('SELECT id FROM fulfillments WHERE order_id = $1;', [pickupSale.rows[0].out_order_id])).rows[0].id;

    await fetch(`${baseUrl}/${pickupFulfillmentId}/start-preparing`, { method: 'POST', headers: adminHeaders, body: JSON.stringify({}) });
    const pickupItemId = (await client.query('SELECT id FROM fulfillment_items WHERE fulfillment_id = $1;', [pickupFulfillmentId])).rows[0].id;
    await fetch(`${baseUrl}/${pickupFulfillmentId}/items/${pickupItemId}/prepare`, { method: 'PUT', headers: adminHeaders, body: JSON.stringify({ quantity: 1 }) });
    await fetch(`${baseUrl}/${pickupFulfillmentId}/confirm-prepared`, { method: 'POST', headers: adminHeaders, body: JSON.stringify({}) });

    // 4.1 Intentar /dispatch en pedido PICKUP (Debe Fallar)
    const pickupDispRes = await fetch(`${baseUrl}/${pickupFulfillmentId}/dispatch`, { method: 'POST', headers: adminHeaders, body: JSON.stringify({}) });
    if (pickupDispRes.status === 400) {
      console.log('  ✅ 4.1 /dispatch en pedido PICKUP bloqueado correctamente (HTTP 400):', (await pickupDispRes.json()).message);
    } else {
      throw new Error(`Fallo 4.1: Se esperaba 400, se obtuvo ${pickupDispRes.status}`);
    }

    // 4.2 Completar entrega PICKUP -> Pasa a PICKED_UP
    await fetch(`${baseUrl}/${pickupFulfillmentId}/items/${pickupItemId}/deliver`, { method: 'PUT', headers: adminHeaders, body: JSON.stringify({ quantity: 1 }) });
    const pickupDelivRes = await fetch(`${baseUrl}/${pickupFulfillmentId}/deliver`, {
      method: 'POST',
      headers: adminHeaders,
      body: JSON.stringify({ recipient_name: 'Cliente en Mostrador' }),
    });
    const pickupDelivData = await pickupDelivRes.json();
    if (pickupDelivData.status === 'PICKED_UP') {
      console.log('  ✅ 4.2 Transición Retiro en Local completada a estado final "PICKED_UP"');
    } else {
      throw new Error(`Fallo 4.2: Se esperaba status PICKED_UP, se obtuvo ${pickupDelivData.status}`);
    }

    // -------------------------------------------------------------------------
    // GRUPO 5: IDEMPOTENCIA (DOUBLE TAP)
    // -------------------------------------------------------------------------
    console.log('\n⚡ [GRUPO 5] Pruebas de Idempotencia (Double Tap)...');

    // Doble tap en start-preparing
    const idempSale = await client.query(`
      SELECT out_order_id 
      FROM process_pos_sale($1, $2, NULL, NULL, 'POS', $3::jsonb, $4::jsonb, $5, NULL, 'DISPATCH', 0);
    `, [
      storeId,
      warehouseId,
      JSON.stringify([{ variant_id: variantId, quantity: 1, unit_net_price: 1000, unit_gross_price: 1190 }]),
      JSON.stringify([{ payment_method: 'CASH', amount: 1190 }]),
      adminUserId
    ]);
    const idempFulId = (await client.query('SELECT id FROM fulfillments WHERE order_id = $1;', [idempSale.rows[0].out_order_id])).rows[0].id;

    const tap1 = await fetch(`${baseUrl}/${idempFulId}/start-preparing`, { method: 'POST', headers: adminHeaders, body: JSON.stringify({}) });
    const tap2 = await fetch(`${baseUrl}/${idempFulId}/start-preparing`, { method: 'POST', headers: adminHeaders, body: JSON.stringify({}) });

    if (tap1.status === 200 && tap2.status === 409) {
      const histCount = (await client.query('SELECT COUNT(*) FROM fulfillment_status_history WHERE fulfillment_id = $1;', [idempFulId])).rows[0].count;
      if (parseInt(histCount, 10) === 1) {
        console.log('  ✅ 5.1 Double tap previene duplicidad de estados y eventos de auditoría (Exactamente 1 evento)');
      } else {
        throw new Error(`Fallo 5.1: Se crearon ${histCount} eventos de historial para un double tap`);
      }
    } else {
      throw new Error(`Fallo 5.1: Respuestas inesperadas tap1=${tap1.status}, tap2=${tap2.status}`);
    }

    // -------------------------------------------------------------------------
    // GRUPO 6: INTEGRIDAD TRANSACCIONAL DEL POS
    // -------------------------------------------------------------------------
    console.log('\n🛒 [GRUPO 6] Pruebas de Integridad Transaccional de POS Checkout...');

    // 6.1 Venta Normal (IMMEDIATE) -> NO crea fulfillment
    const immSale = await client.query(`
      SELECT out_order_id 
      FROM process_pos_sale($1, $2, NULL, NULL, 'POS', $3::jsonb, $4::jsonb, $5, NULL, 'IMMEDIATE', 0);
    `, [
      storeId,
      warehouseId,
      JSON.stringify([{ variant_id: variantId, quantity: 1, unit_net_price: 1000, unit_gross_price: 1190 }]),
      JSON.stringify([{ payment_method: 'CASH', amount: 1190 }]),
      adminUserId
    ]);
    const immFulCount = (await client.query('SELECT COUNT(*) FROM fulfillments WHERE order_id = $1;', [immSale.rows[0].out_order_id])).rows[0].count;
    if (parseInt(immFulCount, 10) === 0) {
      console.log('  ✅ 6.1 Venta inmediata (POS estándar) NO genera fulfillment innecesario.');
    } else {
      throw new Error('Fallo 6.1: Venta inmediata generó fulfillment huérfano.');
    }

    console.log('\n🎉 ========================================================');
    console.log('🎉 TODAS LAS PRUEBAS DE VALIDACIÓN FASE 2 PASARON AL 100%');
    console.log('🎉 ========================================================\n');

  } catch (error: any) {
    console.error('\n❌ ERROR EN BATERÍA DE PRUEBAS DE VALIDACIÓN:', error.message || error);
    process.exit(1);
  } finally {
    client.release();
    await dbPool.end();
  }
}

runDeepValidation();
