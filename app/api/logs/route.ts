import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

export async function GET(req: Request) {
  try {
    await requireAdmin();
    
    const p = new URL(req.url).searchParams;
    const page = Math.max(1, Number(p.get("page") || 1)),
      limit = Math.min(100, Math.max(1, Number(p.get("limit") || 10)));
    const search = p.get("search") || "";

    let whereClause = "1=1";
    const params: any[] = [limit, (page - 1) * limit];
    let paramCount = 3;

    const recordId = p.get("record_id");
    const tableName = p.get("table_name");

    if (search) {
      whereClause += ` AND (table_name ILIKE $${paramCount} OR action ILIKE $${paramCount} OR username ILIKE $${paramCount})`;
      params.push(`%${search}%`);
      paramCount++;
    }
    if (recordId) {
      whereClause += ` AND record_id = $${paramCount}`;
      params.push(recordId);
      paramCount++;
    }
    if (tableName) {
      whereClause += ` AND table_name = $${paramCount}`;
      params.push(tableName);
      paramCount++;
    }

    const query = `SELECT * FROM zalish_logs WHERE ${whereClause} ORDER BY created_at DESC LIMIT $1 OFFSET $2`;
    const countQuery = `SELECT count(*) FROM zalish_logs WHERE ${whereClause.replace(/\$(\d+)/g, (m, n) => `$${Number(n) - 2}`)}`;

    const [items, count] = await Promise.all([
      db.query(query, params),
      db.query(countQuery, params.slice(2)),
    ]);

    return NextResponse.json({
      items: items.rows,
      total: Number(count.rows[0].count),
      totalPages: Math.ceil(Number(count.rows[0].count) / limit) || 1,
      page,
      limit,
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Error fetching logs" },
      { status: 400 },
    );
  }
}
