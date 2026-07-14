import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

export async function GET() {
  try {
    await requireAdmin();

    const query = `
      WITH user_inflow AS (
        SELECT assigned_to, SUM(amount) as total_inflow FROM (
          SELECT assigned_to, grand_total as amount FROM zalish_invoices WHERE deleted_at IS NULL
          UNION ALL
          SELECT assigned_to, advance_amount as amount FROM zalish_advances WHERE deleted_at IS NULL
        ) AS inf GROUP BY assigned_to
      ),
      user_outflow AS (
        SELECT assigned_to, SUM(amount) as total_outflow FROM zalish_expenses WHERE deleted_at IS NULL GROUP BY assigned_to
      )
      SELECT 
        u.id, u.name, u.username,
        COALESCE(i.total_inflow, 0)::float as inflow,
        COALESCE(o.total_outflow, 0)::float as outflow
      FROM zalish_users u
      LEFT JOIN user_inflow i ON i.assigned_to = u.name
      LEFT JOIN user_outflow o ON o.assigned_to = u.name
      WHERE u.deleted_at IS NULL
      ORDER BY u.name ASC
    `;

    const { rows } = await db.query(query);
    return NextResponse.json(rows);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Error fetching user reports summary" },
      { status: 400 },
    );
  }
}
