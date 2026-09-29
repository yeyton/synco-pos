import fs from 'fs';
import path from 'path';
import { dbPool } from './src/db.js';

async function updateDb() {
  const client = await dbPool.connect();
  try {
    try {
      console.log('Adding delivery_type and shipping_amount to orders...');
      await client.query(`
        ALTER TABLE orders 
        ADD COLUMN delivery_type VARCHAR(20) DEFAULT 'IMMEDIATE',
        ADD COLUMN shipping_amount NUMERIC(14, 2) NOT NULL DEFAULT 0.00 CHECK (shipping_amount >= 0);
      `);
      console.log('Columns added.');
    } catch (e: any) {
      if (e.code === '42701') { 
        console.log('Columns already exist.');
      } else {
        throw e;
      }
    }

    console.log('Updating process_pos_sale function...');
    const sql = fs.readFileSync(path.join(process.cwd(), 'concurrency_inventory.sql'), 'utf-8');
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
