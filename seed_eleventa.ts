import { dbPool } from './src/db.js';
import { randomUUID } from 'crypto';
import fs from 'fs';
import path from 'path';

const DEFAULT_STORE_ID = '76123456-7890-4123-8123-123456789012';
const DEFAULT_WAREHOUSE_ID = '11111111-2222-3333-4444-555555555555';
const DEFAULT_USER_ID = '99999999-8888-7777-6666-555555555555';

interface InventoryItem {
  'Código': string;
  Producto: string;
  'P. Costo': string;
  'P. Venta': string;
  'P. Mayoreo': string;
  Departamento: string;
  Existencia: string;
  'Inv. Mínimo': string;
  'Inv. Máximo': string;
  'Tipo de Venta': string;
}

const parseNum = (strVal: string | number): number => {
  if (typeof strVal === 'number') return strVal;
  if (!strVal) return 0;
  const cleaned = String(strVal).replace(/[^0-9.-]+/g, '');
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
};

async function seedEleventa() {
  const client = await dbPool.connect();

  try {
    console.log('🔌 Conectando a Supabase PostgreSQL...');

    // Load schema just in case
    const schemaSqlPath = path.join(process.cwd(), 'schema.sql');
    if (fs.existsSync(schemaSqlPath)) {
      try {
        console.log('📜 Verificando / ejecutando estructura de la base de datos (schema.sql)...');
        const schemaSql = fs.readFileSync(schemaSqlPath, 'utf8');
        await client.query(schemaSql);
      } catch (err: any) {
        console.log('ℹ️ Tablas de la base de datos ya existentes o nota:', err.message);
      }
    }

    // Load inventory json
    const jsonPath = path.join(process.cwd(), 'base_prueba/pos-test/src/inventory.json');
    if (!fs.existsSync(jsonPath)) {
      throw new Error(`No se encontró inventory.json en ${jsonPath}`);
    }

    const items: InventoryItem[] = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
    console.log(`📦 Se cargaron ${items.length} productos desde Eleventa.`);

    await client.query('BEGIN');

    // 1. Store & Warehouse
    await client.query(`
      INSERT INTO stores (id, code, name, rut, address, city) 
      VALUES ($1, 'STGO-01', 'Sucursal Principal', '76123456-7', 'Av. Central 123', 'Santiago')
      ON CONFLICT (id) DO NOTHING;
    `, [DEFAULT_STORE_ID]);

    await client.query(`
      INSERT INTO warehouses (id, store_id, name, is_default) 
      VALUES ($1, $2, 'Bodega Central', true)
      ON CONFLICT (id) DO NOTHING;
    `, [DEFAULT_WAREHOUSE_ID, DEFAULT_STORE_ID]);

    // 2. Clear previous test inventory if any
    console.log('🧹 Limpiando inventarios de prueba anteriores (Usando TRUNCATE)...');
    
    // Disable triggers temporarily or just truncate cascade. Truncate Cascade handles FKs.
    await client.query(`
      TRUNCATE TABLE 
        fulfillment_status_history,
        fulfillment_items, 
        fulfillments, 
        order_items, 
        order_payments, 
        dte_invoices, 
        orders, 
        inventory_movements, 
        inventory, 
        product_variants, 
        products, 
        categories
      CASCADE;
    `);

    // 3. Extract & insert unique categories
    console.log('📂 Procesando categorías (Departamentos)...');
    const categoryMap = new Map<string, string>(); // Name -> UUID
    for (const item of items) {
      const depName = item.Departamento?.trim() || 'General';
      if (!categoryMap.has(depName)) {
        const catId = randomUUID();
        const slug = depName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || `cat-${catId.slice(0, 5)}`;
        
        await client.query(`
          INSERT INTO categories (id, name, slug)
          VALUES ($1, $2, $3)
          ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name
          RETURNING id;
        `, [catId, depName, slug]);
        
        categoryMap.set(depName, catId);
      }
    }

    // 4. Batch insert products & variants
    console.log('⚡ Insertando productos y variantes en lotes...');

    const batchSize = 250;
    let count = 0;

    for (const item of items) {
      const code = String(item['Código'] || '').trim();
      const name = String(item.Producto || 'Producto sin nombre').trim();
      if (!code || !name) continue;

      const depName = item.Departamento?.trim() || 'General';
      const categoryId = categoryMap.get(depName) || null;

      const costPrice = parseNum(item['P. Costo']);
      const grossPrice = parseNum(item['P. Venta']);
      const stock = Math.max(0, parseNum(item.Existencia));
      const minInv = parseNum(item['Inv. Mínimo']);
      const maxInv = parseNum(item['Inv. Máximo']);

      const productId = randomUUID();
      const variantId = randomUUID();
      const sku = `SKU-${code}`;
      const barcode = code.length >= 3 ? code : `BAR-${code}`;

      // Insert Product
      await client.query(`
        INSERT INTO products (id, category_id, name, brand, description, attributes)
        VALUES ($1, $2, $3, 'Eleventa', $4, $5)
      `, [
        productId,
        categoryId,
        name,
        `Importado de Eleventa. Dep: ${depName}`,
        JSON.stringify({ eleventa_code: code, tipo_venta: item['Tipo de Venta'] })
      ]);

      // Calculate Net Price assuming 19% VAT (or standard gross price)
      const vatRate = 19.00;
      const netPrice = Number((grossPrice / 1.19).toFixed(4));

      // Insert Variant
      await client.query(`
        INSERT INTO product_variants (id, product_id, sku, barcode, variant_name, net_price, vat_rate, gross_price, cost_price)
        VALUES ($1, $2, $3, $4, 'Única', $5, $6, $7, $8)
        ON CONFLICT (sku) DO NOTHING;
      `, [
        variantId,
        productId,
        sku,
        barcode,
        netPrice,
        vatRate,
        grossPrice,
        costPrice
      ]);

      // Insert Inventory
      await client.query(`
        INSERT INTO inventory (warehouse_id, variant_id, stock_physical, reorder_point)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (warehouse_id, variant_id) DO UPDATE SET stock_physical = EXCLUDED.stock_physical;
      `, [
        DEFAULT_WAREHOUSE_ID,
        variantId,
        stock,
        minInv
      ]);

      count++;
      if (count % batchSize === 0) {
        console.log(` Progress: ${count} / ${items.length} productos insertados...`);
      }
    }

    await client.query('COMMIT');
    console.log(`🎉 ¡ÉXITO! Se insertaron correctamente ${count} productos en Supabase.`);

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error migrando catálogo a Supabase:', error);
  } finally {
    client.release();
    await dbPool.end();
  }
}

seedEleventa();
