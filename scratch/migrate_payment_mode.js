const { Pool } = require("pg");

async function run() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  
  const queries = [
    "ALTER TABLE zalish_invoices ADD COLUMN IF NOT EXISTS payment_mode TEXT NOT NULL DEFAULT 'UPI';",
    "ALTER TABLE zalish_invoices ADD COLUMN IF NOT EXISTS payment_mode_other TEXT;",
    "ALTER TABLE zalish_advances ADD COLUMN IF NOT EXISTS payment_mode TEXT NOT NULL DEFAULT 'UPI';",
    "ALTER TABLE zalish_advances ADD COLUMN IF NOT EXISTS payment_mode_other TEXT;",
    "ALTER TABLE zalish_expenses ADD COLUMN IF NOT EXISTS payment_mode TEXT NOT NULL DEFAULT 'UPI';",
    "ALTER TABLE zalish_expenses ADD COLUMN IF NOT EXISTS payment_mode_other TEXT;"
  ];

  for (const q of queries) {
    try {
      await pool.query(q);
      console.log("Success:", q);
    } catch (e) {
      console.error("Error executing:", q, "\n", e.message);
    }
  }

  await pool.end();
}

run();
