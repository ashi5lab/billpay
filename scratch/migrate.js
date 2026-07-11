const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function migrate() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    // Add columns to zalish_advances
    await client.query(`ALTER TABLE zalish_advances ADD COLUMN IF NOT EXISTS "date" DATE DEFAULT CURRENT_DATE`);
    await client.query(`ALTER TABLE zalish_advances ADD COLUMN IF NOT EXISTS created_by VARCHAR(255)`);
    await client.query(`ALTER TABLE zalish_advances ADD COLUMN IF NOT EXISTS updated_by VARCHAR(255)`);

    // Add columns to zalish_invoices
    await client.query(`ALTER TABLE zalish_invoices ADD COLUMN IF NOT EXISTS "date" DATE DEFAULT CURRENT_DATE`);
    await client.query(`ALTER TABLE zalish_invoices ADD COLUMN IF NOT EXISTS created_by VARCHAR(255)`);
    await client.query(`ALTER TABLE zalish_invoices ADD COLUMN IF NOT EXISTS updated_by VARCHAR(255)`);

    // Add columns to zalish_expenses
    await client.query(`ALTER TABLE zalish_expenses ADD COLUMN IF NOT EXISTS "date" DATE DEFAULT CURRENT_DATE`);
    await client.query(`ALTER TABLE zalish_expenses ADD COLUMN IF NOT EXISTS created_by VARCHAR(255)`);
    await client.query(`ALTER TABLE zalish_expenses ADD COLUMN IF NOT EXISTS updated_by VARCHAR(255)`);

    // Create zalish_logs table
    await client.query(`
      CREATE TABLE IF NOT EXISTS zalish_logs (
        id SERIAL PRIMARY KEY,
        table_name VARCHAR(100) NOT NULL,
        record_id VARCHAR(100) NOT NULL,
        action VARCHAR(50) NOT NULL,
        user_email VARCHAR(255) NOT NULL,
        details JSONB,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await client.query('COMMIT');
    console.log('Migration successful');
  } catch (e) {
    await client.query('ROLLBACK');
    console.error('Migration failed:', e);
  } finally {
    client.release();
    pool.end();
  }
}

migrate();
