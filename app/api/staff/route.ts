import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  try {
    const { rows } = await db.query(`
      SELECT DISTINCT assigned_to FROM (
        SELECT assigned_to FROM zalish_invoices WHERE assigned_to IS NOT NULL
        UNION
        SELECT assigned_to FROM zalish_advances WHERE assigned_to IS NOT NULL
        UNION
        SELECT assigned_to FROM zalish_expenses WHERE assigned_to IS NOT NULL
      ) as staff WHERE assigned_to != ''
      ORDER BY assigned_to ASC
    `);

    return NextResponse.json(rows.map((r: any) => r.assigned_to));
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Error fetching staff" },
      { status: 400 },
    );
  }
}
