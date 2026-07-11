import { NextResponse } from "next/server";
import { db } from "@/lib/db";
const error = (e: unknown) =>
  NextResponse.json(
    { error: e instanceof Error ? e.message : "Unable to save expense" },
    { status: 400 },
  );

export async function GET(req: Request) {
  try {
    const p = new URL(req.url).searchParams;
    const page = Math.max(1, Number(p.get("page") || 1)),
      limit = Math.min(50, Math.max(1, Number(p.get("limit") || 50)));
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
      whereClause += ` AND e.expense_date >= $${paramCount++}`;
      params.push(startDate);
    }
    if (endDate) {
      whereClause += ` AND e.expense_date <= $${paramCount++}`;
      params.push(endDate);
    }

    const query = `SELECT e.*, c.name as category_name FROM zalish_expenses e LEFT JOIN zalish_expense_categories c ON c.id=e.category_id WHERE ${whereClause} ORDER BY e.expense_date DESC, e.created_at DESC LIMIT $1 OFFSET $2`;
    const countQuery = `SELECT count(*) FROM zalish_expenses e WHERE ${whereClause}`;

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
    const { rows } = await db.query(
      "INSERT INTO zalish_expenses(expense_name,category_id,amount,expense_date,notes) VALUES($1,$2,$3,$4,$5) RETURNING *",
      [
        b.expense_name.trim(),
        b.category_id || null,
        amount,
        b.expense_date || new Date().toISOString().slice(0, 10),
        b.notes || null,
      ],
    );
    return NextResponse.json(rows[0], { status: 201 });
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

    const { rows } = await db.query(
      "UPDATE zalish_expenses SET expense_name=$1, category_id=$2, amount=$3, expense_date=$4, notes=$5 WHERE id=$6 AND deleted_at IS NULL RETURNING *",
      [
        b.expense_name.trim(),
        b.category_id || null,
        amount,
        b.expense_date || new Date().toISOString().slice(0, 10),
        b.notes || null,
        b.id,
      ],
    );
    if (!rows[0]) throw new Error("Expense not found");
    return NextResponse.json(rows[0]);
  } catch (e) {
    return error(e);
  }
}

export async function DELETE(req: Request) {
  try {
    const { id } = await req.json();
    await db.query("UPDATE zalish_expenses SET deleted_at=now() WHERE id=$1", [
      id,
    ]);
    return new NextResponse(null, { status: 204 });
  } catch (e) {
    return error(e);
  }
}
