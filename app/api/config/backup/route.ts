import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

export async function GET() {
  try {
    await requireAdmin();

    const tables = [
      "zalish_store_config",
      "zalish_users",
      "zalish_expense_categories",
      "zalish_items",
      "zalish_expenses",
      "zalish_advances",
      "zalish_invoices",
      "zalish_invoice_items",
      "zalish_logs"
    ];

    let sqlDump = `-- Zalish Boutique Database Dump\n`;
    sqlDump += `-- Generated at ${new Date().toISOString()}\n\n`;
    sqlDump += `SET session_replication_role = 'replica';\n\n`;

    for (const table of tables) {
      sqlDump += `--\n-- Data for table ${table}\n--\n`;
      
      // Get column names
      const colsRes = await db.query(
        "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = $1 ORDER BY ordinal_position",
        [table]
      );
      const cols = colsRes.rows.map((r: any) => r.column_name);
      
      // Get table rows
      const rowsRes = await db.query(`SELECT * FROM ${table}`);
      
      if (rowsRes.rows.length > 0) {
        sqlDump += `TRUNCATE TABLE ${table} CASCADE;\n`;
        
        for (const row of rowsRes.rows) {
          const vals = cols.map(col => {
            const val = row[col];
            if (val === null || val === undefined) {
              return "NULL";
            }
            if (typeof val === "string") {
              return `'${val.replace(/'/g, "''")}'`;
            }
            if (val instanceof Date) {
              return `'${val.toISOString()}'`;
            }
            if (typeof val === "object") {
              return `'${JSON.stringify(val).replace(/'/g, "''")}'::jsonb`;
            }
            return val;
          });
          
          sqlDump += `INSERT INTO ${table} (${cols.join(", ")}) VALUES (${vals.join(", ")});\n`;
        }
      }
      sqlDump += `\n`;
    }

    sqlDump += `SET session_replication_role = 'origin';\n`;

    return new Response(sqlDump, {
      headers: {
        "Content-Type": "application/sql",
        "Content-Disposition": `attachment; filename="zalish_backup_${new Date().toISOString().slice(0, 10)}.sql"`,
      },
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Unauthorised" }, { status: 401 });
  }
}
