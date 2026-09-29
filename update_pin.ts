import bcrypt from 'bcryptjs';
import { dbPool } from './src/db.js';

async function updatePin() {
  const client = await dbPool.connect();
  try {
    const hash = await bcrypt.hash('1234', 10);
    console.log('🔑 Generating bcrypt hash for PIN "1234":', hash);

    await client.query(`
      INSERT INTO users (id, name, email, pin_hash, role, permissions)
      VALUES (
        '99999999-8888-7777-6666-555555555555',
        'Operador Bodega',
        'bodega@synco.cl',
        $1,
        'ADMIN',
        '["fulfillment:prepare", "fulfillment:confirm_prepared", "fulfillment:dispatch", "fulfillment:deliver"]'::jsonb
      )
      ON CONFLICT (id) DO UPDATE 
      SET pin_hash = EXCLUDED.pin_hash,
          failed_pin_attempts = 0,
          locked_until = NULL;
    `, [hash]);

    console.log('✅ Default user updated with valid bcrypt PIN hash!');
  } finally {
    client.release();
    await dbPool.end();
  }
}

updatePin();
