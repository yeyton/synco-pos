const fs = require('fs');
const path = require('path');
const { dbPool } = require('./dist/db.js');

async function updateDb() {
  const client = await dbPool.connect();
  try {
    // 1. Add columns to orders (ignore if already exists)
    try {
      console.log('Adding delivery_type and shipping_amount to orders...');
      await client.query(`
        ALTER TABLE orders 
        ADD COLUMN delivery_type VARCHAR(20) DEFAULT 'IMMEDIATE',
        ADD COLUMN shipping_amount NUMERIC(14, 2) NOT NULL DEFAULT 0.00 CHECK (shipping_amount >= 0);
      `);
      console.log('Columns added.');
    } catch (e) {
      if (e.code === '42701') { // column already exists
        console.log('Columns already exist.');
      } else {
        throw e;
      }
    }

    // 2. Re-run concurrency_inventory.sql to update the PL/pgSQL function
    console.log('Updating process_pos_sale function...');
    const sql = fs.readFileSync(path.join(__dirname, 'concurrency_inventory.sql'), 'utf-8');
    await client.query(sql);
    console.log('Function updated successfully.');

  } catch (error) {
    console.error('Error updating DB:', error);
  } finally {
    client.release();
    await dbPool.end();
  }
}

updateDb();
