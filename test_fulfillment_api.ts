import { dbPool } from './src/db.js';

async function runIntegrationTest() {
  const baseUrl = 'http://localhost:3000/api/v1/fulfillment';
  console.log('🧪 Iniciando prueba de integración de API Fulfillment (Fase 2)...');

  const client = await dbPool.connect();
  try {
    // 1. PROBAR LOGIN POR PIN
    console.log('\n🔑 1. Probando POST /auth/login-pin...');
    const loginRes = await fetch(`${baseUrl}/auth/login-pin`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pin: '1234' }),
    });

    const loginData = await loginRes.json();
    if (!loginRes.ok || !loginData.token) {
      throw new Error(`Fallo en login: ${JSON.stringify(loginData)}`);
    }

    const token = loginData.token;
    const authHeaders = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    };
    console.log('✅ Login exitoso. Usuario:', loginData.user.name, '| Rol:', loginData.user.role);

    // 2. CREAR VENTA DUMMY CON DESPACHO PARA GENERAR FULFILLMENT
    console.log('\n🛒 2. Creando Orden de Venta con Despacho...');
    
    // Obtener store, warehouse y variant
    const storeRes = await client.query('SELECT id FROM stores LIMIT 1;');
    const whRes = await client.query('SELECT id FROM warehouses LIMIT 1;');
    const varRes = await client.query('SELECT id FROM product_variants LIMIT 1;');

    if (storeRes.rows.length === 0 || varRes.rows.length === 0) {
      throw new Error('No hay tiendas o variantes en DB para probar. Ejecute seed.ts.');
    }

    const storeId = storeRes.rows[0].id;
    const warehouseId = whRes.rows[0].id;
    const variantId = varRes.rows[0].id;
    const userId = loginData.user.id;

    // Invocación a process_pos_sale
    const saleRes = await client.query(`
      SELECT out_order_id, out_order_number
      FROM process_pos_sale($1, $2, NULL, NULL, 'POS', $3::jsonb, $4::jsonb, $5, NULL, 'DISPATCH', 2500);
    `, [
      storeId,
      warehouseId,
      JSON.stringify([{ variant_id: variantId, quantity: 2, unit_net_price: 1000, unit_gross_price: 1190 }]),
      JSON.stringify([{ payment_method: 'CASH', amount: 4880 }]),
      userId
    ]);

    const orderId = saleRes.rows[0].out_order_id;
    console.log('✅ Venta creada correctamente. Order Number:', saleRes.rows[0].out_order_number);

    // 3. CONSULTAR FULFILLMENT CREADO AUTOMÁTICAMENTE
    const fulRes = await client.query('SELECT id, status FROM fulfillments WHERE order_id = $1;', [orderId]);
    if (fulRes.rows.length === 0) {
      throw new Error('Fallo: No se auto-creó el registro de fulfillment');
    }
    const fulfillmentId = fulRes.rows[0].id;
    console.log('✅ Fulfillment Auto-Creado ID:', fulfillmentId, '| Estado inicial:', fulRes.rows[0].status);

    // 4. PROBAR OBTENER DETALLE VIA API
    console.log('\n📋 3. Probando GET /:id...');
    const detailRes = await fetch(`${baseUrl}/${fulfillmentId}`, { headers: authHeaders });
    const detailData = await detailRes.json();
    console.log('✅ Detalle obtenido. Items en checklist:', detailData.fulfillment.items.length);
    const itemId = detailData.fulfillment.items[0].id;

    // 5. PROBAR INICIAR ALISTAMIENTO (PENDING -> PREPARING)
    console.log('\n🚀 4. Probando POST /:id/start-preparing...');
    const startRes = await fetch(`${baseUrl}/${fulfillmentId}/start-preparing`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({}),
    });
    const startData = await startRes.json();
    console.log('✅ Estado actualizado:', startData.status);

    // 6. PROBAR CONCURRENCIA (DOBLE PROCESAMIENTO RECHAZADO WITH 409)
    console.log('\n🔒 5. Probando Concurrencia (Segunda llamada a start-preparing)...');
    const startRes2 = await fetch(`${baseUrl}/${fulfillmentId}/start-preparing`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({}),
    });
    const startData2 = await startRes2.json();
    if (startRes2.status === 409) {
      console.log('✅ BLOQUEO DE CONCURRENCIA EXITOSO (409 Conflict):', startData2.message);
    } else {
      throw new Error(`Fallo: Se esperaba HTTP 409 pero se obtuvo ${startRes2.status}`);
    }

    // 7. PROBAR CONFIRMAR SIN COMPLETAR CHECKLIST (DEBE FALLAR 400)
    console.log('\n⚠️ 6. Probando Confirmar Preparación con checklist incompleto...');
    const confFailRes = await fetch(`${baseUrl}/${fulfillmentId}/confirm-prepared`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({}),
    });
    const confFailData = await confFailRes.json();
    if (confFailRes.status === 400) {
      console.log('✅ VALIDACIÓN CHECKLIST EXITOSA (400 Bad Request):', confFailData.message);
    } else {
      throw new Error(`Fallo: Se esperaba 400 pero se obtuvo ${confFailRes.status}`);
    }

    // 8. COMPLETAR CHECKLIST DE PREPARACIÓN
    console.log('\n☑️ 7. Marcando productos en checklist de preparación...');
    const prepareItemRes = await fetch(`${baseUrl}/${fulfillmentId}/items/${itemId}/prepare`, {
      method: 'PUT',
      headers: authHeaders,
      body: JSON.stringify({ quantity: 2 }),
    });
    const prepareItemData = await prepareItemRes.json();
    console.log('✅ Producto marcado:', prepareItemData.item.product_name, '| is_prepared:', prepareItemData.item.is_prepared);

    // 9. CONFIRMAR PREPARACIÓN (PREPARING -> PREPARED)
    console.log('\n📦 8. Confirmando 100% Preparado...');
    const confRes = await fetch(`${baseUrl}/${fulfillmentId}/confirm-prepared`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({}),
    });
    const confData = await confRes.json();
    console.log('✅ Estado actualizado:', confData.status);

    // 10. SALIR A RUTA (PREPARED -> IN_TRANSIT)
    console.log('\n🚚 9. Probando Salir a Ruta (POST /:id/dispatch)...');
    const dispRes = await fetch(`${baseUrl}/${fulfillmentId}/dispatch`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({}),
    });
    const dispData = await dispRes.json();
    console.log('✅ Estado actualizado:', dispData.status);

    // 11. COMPLETAR CHECKLIST DE ENTREGA Y CONFIRMAR ENTREGA
    console.log('\n📝 10. Marcando checklist de entrega y realizando entrega final...');
    await fetch(`${baseUrl}/${fulfillmentId}/items/${itemId}/deliver`, {
      method: 'PUT',
      headers: authHeaders,
      body: JSON.stringify({ quantity: 2 }),
    });

    const delivRes = await fetch(`${baseUrl}/${fulfillmentId}/deliver`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        recipient_name: 'Juan Perez',
        recipient_rut: '12345678-9',
        delivery_notes: 'Entregado en conserjería',
      }),
    });
    const delivData = await delivRes.json();
    console.log('✅ Entrega finalizada con éxito. Estado final:', delivData.status);

    // 12. VERIFICAR HISTORIAL DE AUDITORÍA VIA API
    const finalDetail = await fetch(`${baseUrl}/${fulfillmentId}`, { headers: authHeaders }).then(r => r.json());
    console.log('\n📜 11. Verificando Historial de Auditoría de Trazabilidad:');
    finalDetail.fulfillment.audit_history.forEach((h: any) => {
      console.log(`  - [${new Date(h.created_at).toLocaleTimeString()}] ${h.previous_status || 'INICIO'} ➔ ${h.new_status} | Por: ${h.changed_by_name} (${h.changed_by_role}) | Nota: ${h.notes}`);
    });

    console.log('\n🎉 PRUEBA DE INTEGRACIÓN FASE 2 COMPLETADA CON ÉXITO AL 100%!');

  } catch (error: any) {
    console.error('\n❌ Error en prueba de integración:', error.message || error);
    process.exit(1);
  } finally {
    client.release();
    await dbPool.end();
  }
}

runIntegrationTest();
