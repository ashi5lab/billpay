import { NextResponse } from "next/server";
import { db, transaction } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
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

    const excludeSettled = p.get("excludeSettled") === "true";
    let whereClause = "a.deleted_at IS NULL";
    if (excludeSettled) {
      whereClause += " AND a.settled_invoice_id IS NULL";
    }
    const params: any[] = [limit, (page - 1) * limit];
    let paramCount = 3;

    if (q) {
      whereClause += ` AND (a.receipt_number ILIKE $${paramCount} OR a.customer_name ILIKE $${paramCount} OR a.customer_phone ILIKE $${paramCount})`;
      params.push(`%${q}%`);
      paramCount++;
    }
    if (startDate) {
      whereClause += ` AND a.date >= $${paramCount++}`;
      params.push(startDate);
    }
    if (endDate) {
      whereClause += ` AND a.date <= $${paramCount++}`;
      params.push(endDate);
    }

    const query = `SELECT a.*, i.invoice_number as attached_invoice_number FROM zalish_advances a LEFT JOIN zalish_invoices i ON i.id = a.settled_invoice_id WHERE ${whereClause} ORDER BY a.date DESC LIMIT $1 OFFSET $2`;
    const countQuery = `SELECT count(*) FROM zalish_advances a WHERE ${whereClause.replace(/\$(\d+)/g, (m, n) => `$${Number(n) - 2}`)}`;

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
  const user = await getCurrentUser() || "system";
  const date = b.date || new Date().toISOString().split("T")[0];
  const result = await transaction(async (c) => {
    const day = number("ZA");
    const { rows: seq } = await c.query(
      "SELECT count(*) FROM zalish_advances WHERE receipt_number LIKE $1",
      [`${day}/%`],
    );
    const receipt = `${day}/${Number(seq[0].count) + 1}`;
    const paymentMode = b.payment_mode || "UPI";
    const paymentModeOther = paymentMode === "Other" ? b.payment_mode_other : null;
    const { rows } = await c.query(
      "INSERT INTO zalish_advances(receipt_number,customer_name,customer_phone,customer_place,advance_amount,notes,date,created_by,assigned_to,payment_mode,payment_mode_other) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *",
      [
        receipt,
        b.customer_name,
        b.customer_phone || null,
        b.customer_place || null,
        b.advance_amount,
        b.notes || null,
        date,
        user,
        b.assigned_to || null,
        paymentMode,
        paymentModeOther
      ],
    );
    const advance = rows[0];
    await c.query(
      "INSERT INTO zalish_logs(table_name, record_id, action, user_email, details) VALUES($1,$2,$3,$4,$5)",
      ["zalish_advances", String(advance.id), "INSERT", user, JSON.stringify(advance)]
    );
    return advance;
  });
  return NextResponse.json(result, { status: 201 });
}

export async function PATCH(req: Request) {
  try {
    const b = await req.json();
    if (!b.id) throw new Error("Advance ID is required");
    const user = await getCurrentUser() || "system";
    const date = b.date || new Date().toISOString().split("T")[0];
    const paymentMode = b.payment_mode || "UPI";
    const paymentModeOther = paymentMode === "Other" ? b.payment_mode_other : null;
    const advance = await transaction(async (c) => {
      const { rows } = await c.query(
        "UPDATE zalish_advances SET customer_name=$1, customer_phone=$2, customer_place=$3, advance_amount=$4, notes=$5, date=$6, updated_by=$7, assigned_to=$8, payment_mode=$9, payment_mode_other=$10 WHERE id=$11 AND deleted_at IS NULL AND settled_invoice_id IS NULL RETURNING *",
        [
          b.customer_name,
          b.customer_phone || null,
          b.customer_place || null,
          b.advance_amount,
          b.notes || null,
          date,
          user,
          b.assigned_to || null,
          paymentMode,
          paymentModeOther,
          b.id,
        ],
      );
      if (!rows[0]) throw new Error("Advance not found or already settled");
      await c.query(
        "INSERT INTO zalish_logs(table_name, record_id, action, user_email, details) VALUES($1,$2,$3,$4,$5)",
        ["zalish_advances", String(rows[0].id), "UPDATE", user, JSON.stringify(rows[0])]
      );
      return rows[0];
    });
    return NextResponse.json(advance);
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
    const user = await getCurrentUser() || "system";
    await transaction(async (c) => {
      const { rowCount } = await c.query(
        "UPDATE zalish_advances SET deleted_at=now(), updated_by=$1 WHERE id=$2 AND settled_invoice_id IS NULL",
        [user, id],
      );
      if (rowCount === 0) throw new Error("Advance not found or already settled");
      await c.query(
        "INSERT INTO zalish_logs(table_name, record_id, action, user_email, details) VALUES($1,$2,$3,$4,$5)",
        ["zalish_advances", String(id), "DELETE", user, JSON.stringify({ id, deleted_at: new Date().toISOString() })]
      );
    });
    return new NextResponse(null, { status: 204 });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Error deleting advance" },
      { status: 400 },
    );
  }
}
