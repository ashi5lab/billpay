import { NextResponse } from "next/server";
import { db, transaction } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
const error = (e: unknown) =>
  NextResponse.json(
    { error: e instanceof Error ? e.message : "Unable to save expense" },
    { status: 400 },
  );

export async function GET(req: Request) {
  try {
    const p = new URL(req.url).searchParams;
    const page = Math.max(1, Number(p.get("page") || 1)),
      limit = Math.min(100, Math.max(1, Number(p.get("limit") || 10)));
    const search = p.get("search") || "";
    const startDate = p.get("startDate") || "";
    const endDate = p.get("endDate") || "";

    let whereClause = "e.deleted_at IS NULL";
    const params: any[] = [limit, (page - 1) * limit];
    let paramCount = 3;

    if (search) {
      whereClause += ` AND e.expense_name ILIKE $${paramCount++}`;
      params.push(`%${search}%`);
    }
    if (startDate) {
      whereClause += ` AND e.date >= $${paramCount++}`;
      params.push(startDate);
    }
    if (endDate) {
      whereClause += ` AND e.date <= $${paramCount++}`;
      params.push(endDate);
    }

    const query = `SELECT e.*, c.name as category_name FROM zalish_expenses e LEFT JOIN zalish_expense_categories c ON c.id=e.category_id WHERE ${whereClause} ORDER BY e.expense_date DESC, e.created_at DESC LIMIT $1 OFFSET $2`;
    const countQuery = `SELECT count(*) FROM zalish_expenses e WHERE ${whereClause.replace(/\$(\d+)/g, (m, n) => `$${Number(n) - 2}`)}`;

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
    return error(e);
  }
}

export async function POST(req: Request) {
  try {
    const b = await req.json();
    const amount = Number(b.amount);
    if (!String(b.expense_name || "").trim())
      throw new Error("Expense name is required");
    if (!Number.isFinite(amount) || amount <= 0)
      throw new Error("Expense amount must be greater than zero");
    const user = await getCurrentUser() || "system";
    const date = b.date || b.expense_date || new Date().toLocaleDateString("en-CA");
    const paymentMode = b.payment_mode || "UPI";
    const paymentModeOther = paymentMode === "Other" ? b.payment_mode_other : null;
    const row = await transaction(async (c) => {
      const { rows } = await c.query(
        "INSERT INTO zalish_expenses(expense_name,category_id,amount,expense_date,date,notes,created_by,assigned_to,payment_mode,payment_mode_other) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *",
        [
          b.expense_name.trim(),
          b.category_id || null,
          amount,
          date,
          date,
          b.notes || null,
          user,
          b.assigned_to || null,
          paymentMode,
          paymentModeOther
        ],
      );
      await c.query(
        "INSERT INTO zalish_logs(table_name, record_id, action, username, details) VALUES($1,$2,$3,$4,$5)",
        ["zalish_expenses", String(rows[0].id), "INSERT", user, JSON.stringify(rows[0])]
      );
      return rows[0];
    });
    return NextResponse.json(row, { status: 201 });
  } catch (e) {
    return error(e);
  }
}

export async function PATCH(req: Request) {
  try {
    const b = await req.json();
    const amount = Number(b.amount);
    if (!String(b.expense_name || "").trim())
      throw new Error("Expense name is required");
    if (!Number.isFinite(amount) || amount <= 0)
      throw new Error("Expense amount must be greater than zero");
    if (!b.id) throw new Error("Expense ID is required");

    const user = await getCurrentUser() || "system";
    const date = b.date || b.expense_date || new Date().toLocaleDateString("en-CA");
    const paymentMode = b.payment_mode || "UPI";
    const paymentModeOther = paymentMode === "Other" ? b.payment_mode_other : null;
    const row = await transaction(async (c) => {
      const { rows: oldRows } = await c.query("SELECT * FROM zalish_expenses WHERE id=$1", [b.id]);
      if (!oldRows[0]) throw new Error("Expense not found");
      const { rows } = await c.query(
        "UPDATE zalish_expenses SET expense_name=$1, category_id=$2, amount=$3, expense_date=$4, notes=$5, date=$6, updated_by=$7, assigned_to=$8, payment_mode=$9, payment_mode_other=$10, is_edited=TRUE WHERE id=$11 AND deleted_at IS NULL RETURNING *",
        [
          b.expense_name.trim(),
          b.category_id || null,
          amount,
          date,
          b.notes || null,
          date,
          user,
          b.assigned_to || null,
          paymentMode,
          paymentModeOther,
          b.id,
        ],
      );
      if (!rows[0]) throw new Error("Expense not found");
      await c.query(
        "INSERT INTO zalish_logs(table_name, record_id, action, username, details) VALUES($1,$2,$3,$4,$5)",
        ["zalish_expenses", String(rows[0].id), "UPDATE", user, JSON.stringify({ old: oldRows[0], new: rows[0] })]
      );
      return rows[0];
    });
    return NextResponse.json(row);
  } catch (e) {
    return error(e);
  }
}

export async function DELETE(req: Request) {
  try {
    const { id } = await req.json();
    const user = await getCurrentUser() || "system";
    await transaction(async (c) => {
      await c.query("UPDATE zalish_expenses SET deleted_at=now(), updated_by=$1 WHERE id=$2", [
        user, id,
      ]);
      await c.query(
        "INSERT INTO zalish_logs(table_name, record_id, action, username, details) VALUES($1,$2,$3,$4,$5)",
        ["zalish_expenses", String(id), "DELETE", user, JSON.stringify({ id, deleted_at: new Date().toISOString() })]
      );
    });
    return new NextResponse(null, { status: 204 });
  } catch (e) {
    return error(e);
  }
}
