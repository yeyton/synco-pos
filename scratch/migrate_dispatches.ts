import { dbPool } from '../src/db.js';

async function migrate() {
  const client = await dbPool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS dispatches (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          order_id UUID NOT NULL UNIQUE REFERENCES orders(id) ON DELETE CASCADE,
          dispatch_type VARCHAR(50) NOT NULL,
          dispatch_date DATE NOT NULL,
          recipient_name VARCHAR(200) NOT NULL,
          address VARCHAR(255) NOT NULL,
          commune VARCHAR(100) NOT NULL,
          city VARCHAR(100) NOT NULL,
          region VARCHAR(100),
          document_number VARCHAR(50),
          departure_date DATE NOT NULL,
          departure_time VARCHAR(10),
          arrival_date DATE,
          carrier_rut VARCHAR(12),
          driver_rut VARCHAR(12),
          driver_name VARCHAR(200),
          transport_plate VARCHAR(20),
          total_amount NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
          status VARCHAR(50) NOT NULL DEFAULT 'CONFIRMED',
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);
    console.log("Tabla dispatches creada exitosamente.");
  } catch (e) {
    console.error(e);
  } finally {
    client.release();
    process.exit(0);
  }
}

migrate();
