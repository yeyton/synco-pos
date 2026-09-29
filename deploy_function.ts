import fs from 'fs';
import path from 'path';
import { dbPool } from './src/db.js';

async function run() {
  const client = await dbPool.connect();
  try {
    console.log("📜 Reading concurrency_inventory.sql...");
    const sql = fs.readFileSync(path.join(process.cwd(), 'concurrency_inventory.sql'), 'utf-8');
    await client.query(sql);
    console.log("✅ Function process_pos_sale and procedures updated successfully from concurrency_inventory.sql!");
  } catch (err) {
    console.error("❌ Error deploying function:", err);
    process.exit(1);
  } finally {
    client.release();
    await dbPool.end();
  }
}
run();
