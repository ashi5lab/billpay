const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function migrate() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    console.log('Adding is_edited to zalish_invoices...');
    await client.query(`ALTER TABLE zalish_invoices ADD COLUMN IF NOT EXISTS is_edited BOOLEAN DEFAULT FALSE`);
    
    console.log('Adding is_edited to zalish_advances...');
    await client.query(`ALTER TABLE zalish_advances ADD COLUMN IF NOT EXISTS is_edited BOOLEAN DEFAULT FALSE`);
    
    console.log('Adding is_edited to zalish_expenses...');
    await client.query(`ALTER TABLE zalish_expenses ADD COLUMN IF NOT EXISTS is_edited BOOLEAN DEFAULT FALSE`);
    
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
