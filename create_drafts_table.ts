import { dbPool } from './src/db.js';

async function updateDb() {
  const client = await dbPool.connect();
  try {
    console.log('Creating pos_drafts table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS pos_drafts (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
        user_id UUID,
        customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
        items JSONB NOT NULL,
        total_amount NUMERIC(14, 2) NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);
    console.log('Table pos_drafts created successfully.');
  } catch (error) {
    console.error('Error creating table:', error);
  } finally {
    client.release();
    await dbPool.end();
  }
}

updateDb();
