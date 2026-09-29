import { dbPool } from './src/db.js';
import { randomUUID } from 'crypto';

// Use exactly the same UUIDs defined in App.tsx to ensure Foreign Keys match perfectly during tests
const DEFAULT_STORE_ID = '76123456-7890-4123-8123-123456789012';
const DEFAULT_WAREHOUSE_ID = '11111111-2222-3333-4444-555555555555';
const DEFAULT_USER_ID = '99999999-8888-7777-6666-555555555555';
const SHIFT_ID = randomUUID();

async function runSeed() {
  const client = await dbPool.connect();

  try {
    console.log('🌱 Iniciando seeding de la base de datos...');
    
    // Iniciar transacción
    await client.query('BEGIN');

    // 1. Limpiar datos (Opcional, en orden inverso a FKs) para desarrollo local
    console.log('Limpiando datos de prueba anteriores...');
    await client.query('DELETE FROM order_items');
    await client.query('DELETE FROM order_payments');
    await client.query('DELETE FROM outbox_events');
    await client.query('DELETE FROM dte_invoices');
    await client.query('DELETE FROM orders');
    await client.query('DELETE FROM inventory_movements');
    await client.query('DELETE FROM inventory');
    await client.query('DELETE FROM product_variants');
    await client.query('DELETE FROM products');
    await client.query('DELETE FROM cash_register_shifts');
    await client.query('DELETE FROM cash_registers');
    await client.query('DELETE FROM warehouses');
    await client.query('DELETE FROM stores');

    // 2. Insertar Tienda, Bodega y Cajero (User)
    console.log('Creando sucursal, bodega y apertura de caja...');
    await client.query(`
      INSERT INTO stores (id, code, name, rut, address, city) 
      VALUES ($1, 'STGO-01', 'Sucursal Santiago Centro', '76123456-7', 'Av. Bernardo O Higgins 1234', 'Santiago')
    `, [DEFAULT_STORE_ID]);

    await client.query(`
      INSERT INTO warehouses (id, store_id, name, is_default) 
      VALUES ($1, $2, 'Bodega Principal Central', true)
    `, [DEFAULT_WAREHOUSE_ID, DEFAULT_STORE_ID]);

    const cashRegisterId = randomUUID();
    await client.query(`
      INSERT INTO cash_registers (id, store_id, name, mac_address) 
      VALUES ($1, $2, 'Caja 01 - Express', '00:1B:44:11:3A:B7')
    `, [cashRegisterId, DEFAULT_STORE_ID]);

    await client.query(`
      INSERT INTO cash_register_shifts (id, cash_register_id, user_id, initial_cash, status) 
      VALUES ($1, $2, $3, 100000.00, 'OPEN')
    `, [SHIFT_ID, cashRegisterId, DEFAULT_USER_ID]);

    // 3. Crear Catálogo Base (3 Productos)
    console.log('Creando catálogo representativo (Cuaderno, Lápiz, Desinfectante)...');
    
    const productsData = [
      {
        product_id: randomUUID(),
        variant_id: randomUUID(),
        name: 'Cuaderno Universitario Matemática 100 Hojas',
        brand: 'Torre',
        sku: 'CUAD-UNI-100M',
        barcode: '7801234567890',
        net_price: 1512.6, // ~1513
        gross_price: 1800.0,
      },
      {
        product_id: randomUUID(),
        variant_id: randomUUID(),
        name: 'Lápiz Pasta Bic Azul Clásico',
        brand: 'Bic',
        sku: 'LAP-BIC-AZUL',
        barcode: '3086123456789',
        net_price: 252.1, // ~252
        gross_price: 300.0,
      },
      {
        product_id: randomUUID(),
        variant_id: randomUUID(),
        name: 'Desinfectante Lysoform Original 360cc',
        brand: 'Lysoform',
        sku: 'DES-LYS-360',
        barcode: '7791234567890',
        net_price: 2512.6, // ~2513
        gross_price: 2990.0,
      }
    ];

    for (const p of productsData) {
      // Insert Product
      await client.query(`
        INSERT INTO products (id, name, brand, description, attributes) 
        VALUES ($1, $2, $3, $4, $5)
      `, [p.product_id, p.name, p.brand, `Producto de librería y bazar de alta rotación`, '{"categoria": "general"}']);

      // Insert Variant
      await client.query(`
        INSERT INTO product_variants (id, product_id, sku, barcode, variant_name, net_price, vat_rate, gross_price, cost_price) 
        VALUES ($1, $2, $3, $4, 'Normal', $5, 19.00, $6, $7)
      `, [p.variant_id, p.product_id, p.sku, p.barcode, p.net_price, p.gross_price, p.net_price * 0.5]);

      // Insert Initial Stock (100 Unidades)
      await client.query(`
        INSERT INTO inventory (warehouse_id, variant_id, stock_physical) 
        VALUES ($1, $2, 100.000)
      `, [DEFAULT_WAREHOUSE_ID, p.variant_id]);

      // Record Kardex Movement
      await client.query(`
        INSERT INTO inventory_movements (warehouse_id, variant_id, movement_type, quantity, previous_stock, new_stock, reference_type, created_by)
        VALUES ($1, $2, 'PURCHASE_IN', 100.000, 0, 100.000, 'ADJUSTMENT', $3)
      `, [DEFAULT_WAREHOUSE_ID, p.variant_id, DEFAULT_USER_ID]);
      
      console.log(`✅ Agregado: ${p.name} | Código: ${p.barcode} | Precio: $${p.gross_price}`);
    }

    await client.query('COMMIT');
    console.log('🚀 ¡Seed completado con éxito! La base de datos está lista para operar en el frontend.');

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error durante el seed:', error);
  } finally {
    client.release();
    // Terminar pool de conexiones para que el script no quede colgado
    await dbPool.end();
  }
}

runSeed();
