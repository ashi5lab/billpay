import pg from "pg";

// Override parsing for DATE (OID 1082) so it returns the raw string YYYY-MM-DD
// instead of a JS Date object that gets shifted by local timezones.
pg.types.setTypeParser(1082, (val) => val);

const globalForDb = global as unknown as { pool?: pg.Pool };
export const db = globalForDb.pool ?? new pg.Pool({ connectionString: process.env.DATABASE_URL, ssl: process.env.PGSSL === "false" ? false : { rejectUnauthorized: false } });
if (process.env.NODE_ENV !== "production") globalForDb.pool = db;
export async function transaction<T>(run: (client: pg.PoolClient) => Promise<T>) {
  const client = await db.connect(); try { await client.query("BEGIN"); const value = await run(client); await client.query("COMMIT"); return value; }
  catch (error) { await client.query("ROLLBACK"); throw error; } finally { client.release(); }
}
