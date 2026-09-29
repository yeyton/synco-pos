import { dbPool } from './src/db.js';

async function migrate() {
  const client = await dbPool.connect();
  try {
    console.log('🔄 Ejecutando migración en tabla customers...');
    await client.query(`
      ALTER TABLE customers 
      RENAME COLUMN city TO commune;
      
      ALTER TABLE customers 
      RENAME COLUMN giro TO business_line;
    `);
    console.log('✅ Migración exitosa.');
  } catch (error) {
    // Es posible que ya estén renombradas si se corrió previamente
    console.error('⚠️ Detalle (probablemente ya existe):', error.message);
  } finally {
    client.release();
    await dbPool.end();
  }
}

migrate();
