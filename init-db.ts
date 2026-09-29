import { dbPool } from './src/db.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function initDB() {
  const client = await dbPool.connect();
  try {
    console.log('📦 Leyendo schema.sql...');
    const schemaSql = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf-8');
    
    console.log('⚙️ Ejecutando schema en la base de datos (Supabase)...');
    await client.query(schemaSql);
    console.log('✅ Schema creado con éxito.');
    
  } catch (error) {
    console.error('❌ Error ejecutando el schema:', error);
    process.exit(1);
  } finally {
    client.release();
    await dbPool.end();
  }
}

initDB();
