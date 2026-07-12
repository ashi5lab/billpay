const { Pool } = require("pg");

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || "postgres://postgres:postgres@localhost:5432/zalish",
});

async function run() {
  const client = await pool.connect();
  try {
    console.log("Applying migration...");
    await client.query(`ALTER TABLE zalish_invoices ADD COLUMN IF NOT EXISTS payment_status TEXT NOT NULL DEFAULT 'PAID';`);
    console.log("Migration applied successfully.");
  } catch (e) {
    console.error("Migration failed:", e);
  } finally {
    client.release();
    pool.end();
  }
}

run();
