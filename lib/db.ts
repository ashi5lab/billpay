import { Pool, PoolClient } from "pg";

const globalForDb = global as unknown as { pool?: Pool };
export const db = globalForDb.pool ?? new Pool({ connectionString: process.env.DATABASE_URL, ssl: process.env.PGSSL === "false" ? false : { rejectUnauthorized: false } });
if (process.env.NODE_ENV !== "production") globalForDb.pool = db;
export async function transaction<T>(run: (client: PoolClient) => Promise<T>) {
  const client = await db.connect(); try { await client.query("BEGIN"); const value = await run(client); await client.query("COMMIT"); return value; }
  catch (error) { await client.query("ROLLBACK"); throw error; } finally { client.release(); }
}
