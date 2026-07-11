import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { transaction } from "@/lib/db";
function number(prefix: string, date = new Date()) {
  const y = date.getFullYear(),
    m = String(date.getMonth() + 1).padStart(2, "0"),
    d = String(date.getDate()).padStart(2, "0");
  return `${prefix}-${y}/${m}/${d}`;
}

export async function GET(req: Request) {
  try {
    const p = new URL(req.url).searchParams;
    const page = Math.max(1, Number(p.get("page") || 1)),
      limit = Math.min(50, Math.max(1, Number(p.get("limit") || 50)));
    const q = p.get("search") || p.get("q") || "";
    const startDate = p.get("startDate") || "";
    const endDate = p.get("endDate") || "";

    let whereClause = "deleted_at IS NULL AND settled_invoice_id IS NULL";
    const params: any[] = [limit, (page - 1) * limit];
    let paramCount = 3;

    if (q) {
      whereClause += ` AND (receipt_number ILIKE $${paramCount} OR customer_name ILIKE $${paramCount} OR customer_phone ILIKE $${paramCount})`;
      params.push(`%${q}%`);
      paramCount++;
    }
    if (startDate) {
      whereClause += ` AND issued_at >= $${paramCount++}`;
      params.push(startDate);
    }
    if (endDate) {
      whereClause += ` AND issued_at <= $${paramCount++}`;
      params.push(endDate);
    }

    const query = `SELECT * FROM zalish_advances WHERE ${whereClause} ORDER BY issued_at DESC LIMIT $1 OFFSET $2`;
    const countQuery = `SELECT count(*) FROM zalish_advances WHERE ${whereClause.replace(/\$(\d+)/g, (m, n) => `$${Number(n) - 2}`)}`;

    const [items, count] = await Promise.all([
      db.query(query, params),
      db.query(countQuery, params.slice(2)),
    ]);

    return NextResponse.json({
      items: items.rows,
      total: Number(count.rows[0].count),
      page,
      limit,
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Error fetching advances" },
      { status: 400 },
    );
  }
}

export async function POST(req: Request) {
  const b = await req.json();
  const result = await transaction(async (c) => {
    const day = number("ZA");
    const { rows: seq } = await c.query(
      "SELECT count(*) FROM zalish_advances WHERE receipt_number LIKE $1",
      [`${day}/%`],
    );
    const receipt = `${day}/${Number(seq[0].count) + 1}`;
    const { rows } = await c.query(
      "INSERT INTO zalish_advances(receipt_number,customer_name,customer_phone,customer_place,advance_amount,notes) VALUES($1,$2,$3,$4,$5,$6) RETURNING *",
      [
        receipt,
        b.customer_name,
        b.customer_phone || null,
        b.customer_place || null,
        b.advance_amount,
        b.notes || null,
      ],
    );
    return rows[0];
  });
  return NextResponse.json(result, { status: 201 });
}

export async function PATCH(req: Request) {
  try {
    const b = await req.json();
    if (!b.id) throw new Error("Advance ID is required");
    const { rows } = await db.query(
      "UPDATE zalish_advances SET customer_name=$1, customer_phone=$2, customer_place=$3, advance_amount=$4, notes=$5 WHERE id=$6 AND deleted_at IS NULL AND settled_invoice_id IS NULL RETURNING *",
      [
        b.customer_name,
        b.customer_phone || null,
        b.customer_place || null,
        b.advance_amount,
        b.notes || null,
        b.id,
      ],
    );
    if (!rows[0]) throw new Error("Advance not found or already settled");
    return NextResponse.json(rows[0]);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Error updating advance" },
      { status: 400 },
    );
  }
}

export async function DELETE(req: Request) {
  try {
    const { id } = await req.json();
    const { rowCount } = await db.query(
      "UPDATE zalish_advances SET deleted_at=now() WHERE id=$1 AND settled_invoice_id IS NULL",
      [id],
    );
    if (rowCount === 0) throw new Error("Advance not found or already settled");
    return new NextResponse(null, { status: 204 });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Error deleting advance" },
      { status: 400 },
    );
  }
}
