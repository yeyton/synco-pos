import fs from 'fs';
import path from 'path';
import { dbPool } from './src/db.js';

async function runMigration() {
  const client = await dbPool.connect();
  try {
    console.log('🚀 1. Verificando conexión a PostgreSQL (Supabase)...');
    const timeRes = await client.query('SELECT NOW() AS now_time;');
    console.log('✅ Conexión exitosa. Hora del servidor DB:', timeRes.rows[0].now_time);

    console.log('\n📜 2. Aplicando migración idempotente (migration_fulfillment.sql)...');
    const sql = fs.readFileSync(path.join(process.cwd(), 'migration_fulfillment.sql'), 'utf-8');
    await client.query(sql);
    console.log('✅ Migración ejecutada correctamente.');

    console.log('\n🔍 3. Verificando objetos creados en la Base de Datos...');

    // a. Tablas creadas
    const tablesRes = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
        AND table_name IN ('users', 'fulfillments', 'fulfillment_items', 'fulfillment_status_history')
      ORDER BY table_name;
    `);
    console.log('  📌 Tablas encontradas:', tablesRes.rows.map(r => r.table_name).join(', '));

    // b. Enums
    const enumsRes = await client.query(`
      SELECT t.typname, e.enumlabel
      FROM pg_type t
      JOIN pg_enum e ON t.oid = e.enumtypid
      WHERE t.typname IN ('fulfillment_type_enum', 'fulfillment_status_enum')
      ORDER BY t.typname, e.enumsortorder;
    `);
    console.log('  📌 Enums registrados:', enumsRes.rows.map(r => `${r.typname} -> ${r.enumlabel}`).join(' | '));

    // c. Columnas generadas
    const genColsRes = await client.query(`
      SELECT column_name, is_generated, generation_expression
      FROM information_schema.columns
      WHERE table_name = 'fulfillment_items' AND is_generated = 'ALWAYS';
    `);
    console.log('  📌 Columnas generadas en fulfillment_items:', genColsRes.rows.map(r => `${r.column_name} (GENERATED ALWAYS)`).join(', '));

    // d. Unique constraints
    const uqRes = await client.query(`
      SELECT conname, pg_get_constraintdef(oid) as def
      FROM pg_constraint
      WHERE conrelid = 'fulfillment_items'::regclass AND contype = 'u';
    `);
    console.log('  📌 Restricciones UNIQUE en fulfillment_items:', uqRes.rows.map(r => `${r.conname}: ${r.def}`).join(', '));

    // e. Triggers
    const triggerRes = await client.query(`
      SELECT trigger_name, event_manipulation, action_statement
      FROM information_schema.triggers
      WHERE event_object_table = 'fulfillment_status_history';
    `);
    console.log('  📌 Triggers en fulfillment_status_history:', triggerRes.rows.map(r => `${r.trigger_name} (${r.event_manipulation})`).join(', '));

    console.log('\n🧪 4. Ejecutando pruebas avanzadas de integridad y restricciones...');

    // Crear un registro dummy en orders y fulfillments para probar triggers y constraints
    await client.query('BEGIN;');
    
    // Check dummy user
    const dummyUserId = '99999999-8888-7777-6666-555555555555';
    
    // Insert dummy store & warehouse if not exists
    const storeRes = await client.query(`
      INSERT INTO stores (code, name, rut, address, city) 
      VALUES ('STORE-TEST', 'Tienda Test', '11111111-1', 'Calle Test 123', 'Santiago')
      ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name
      RETURNING id;
    `);
    const storeId = storeRes.rows[0].id;

    const whRes = await client.query(`
      INSERT INTO warehouses (store_id, name, is_default)
      VALUES ($1, 'Bodega Test', true)
      ON CONFLICT DO NOTHING;
    `, [storeId]);

    const whIdRes = await client.query(`SELECT id FROM warehouses WHERE store_id = $1 LIMIT 1;`, [storeId]);
    const warehouseId = whIdRes.rows[0].id;

    // Insert dummy order
    const orderNum = 'ORD-TEST-' + Date.now();
    const orderRes = await client.query(`
      INSERT INTO orders (order_number, store_id, warehouse_id, net_amount, vat_amount, total_amount, delivery_type)
      VALUES ($1, $2, $3, 1000, 190, 1190, 'DISPATCH')
      RETURNING id;
    `, [orderNum, storeId, warehouseId]);
    const orderId = orderRes.rows[0].id;

    // Insert dummy fulfillment
    const fulRes = await client.query(`
      INSERT INTO fulfillments (order_id, type, status, requires_collection, collection_amount)
      VALUES ($1, 'DISPATCH', 'PENDING', true, 1190.00)
      RETURNING id;
    `, [orderId]);
    const fulfillmentId = fulRes.rows[0].id;

    // Test history insert and tamper block (UPDATE & DELETE)
    const histRes = await client.query(`
      INSERT INTO fulfillment_status_history (fulfillment_id, previous_status, new_status, changed_by, notes)
      VALUES ($1, NULL, 'PENDING', $2, 'Prueba inicial')
      RETURNING id;
    `, [fulfillmentId, dummyUserId]);
    const historyId = histRes.rows[0].id;

    // Try UPDATE on audit table
    let updateBlocked = false;
    try {
      await client.query(`UPDATE fulfillment_status_history SET notes = 'INTENTO DE MODIFICACION' WHERE id = $1;`, [historyId]);
    } catch (err: any) {
      updateBlocked = true;
      console.log('  ✅ PRUEBA EXITOSA (UPDATE Bloqueado):', err.message);
    }

    // Try DELETE on audit table
    let deleteBlocked = false;
    try {
      await client.query(`DELETE FROM fulfillment_status_history WHERE id = $1;`, [historyId]);
    } catch (err: any) {
      deleteBlocked = true;
      console.log('  ✅ PRUEBA EXITOSA (DELETE Bloqueado):', err.message);
    }

    if (!updateBlocked || !deleteBlocked) {
      throw new Error('FALLO CRÍTICO: El trigger anti-manipulación no bloqueó modificaciones en la tabla de auditoría.');
    }

    await client.query('ROLLBACK;'); // Deshacer datos dummy de prueba
    console.log('  ✅ Transacción de prueba revertida (Limpieza limpia de DB).');

    console.log('\n🎉 FASE 1 COMPLETADA CON ÉXITO Y 100% VERIFICADA!');

  } catch (error: any) {
    console.error('\n❌ Error en verificación de Fase 1:', error.message);
    process.exit(1);
  } finally {
    client.release();
    await dbPool.end();
  }
}

runMigration();
