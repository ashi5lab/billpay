export const dynamic = 'force-dynamic';
import { NextResponse } from "next/server";
import { db, transaction } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export async function GET(req: Request) {
  try {
    const p = new URL(req.url).searchParams;
    const page = Math.max(1, Number(p.get("page") || 1)),
      limit = Math.min(100, Math.max(1, Number(p.get("limit") || 10)));
    const search = p.get("search") || "";
    
    let whereClause = "deleted_at IS NULL";
    const params: any[] = [limit, (page - 1) * limit];
    let paramCount = 3;

    if (search) {
      whereClause += ` AND (name ILIKE $${paramCount} OR email ILIKE $${paramCount})`;
      params.push(`%${search}%`);
      paramCount++;
    }

    const query = `SELECT id, name, email, role, created_at FROM zalish_users WHERE ${whereClause} ORDER BY created_at DESC LIMIT $1 OFFSET $2`;
    const countQuery = `SELECT count(*) FROM zalish_users WHERE ${whereClause.replace(/\$(\d+)/g, (m, n) => `$${Number(n) - 2}`)}`;

    const [items, count] = await Promise.all([
      db.query(query, params),
      db.query(countQuery, params.slice(2)),
    ]);

    return NextResponse.json({
      items: items.rows,
      total: Number(count.rows[0].count),
      page,
      totalPages: Math.ceil(Number(count.rows[0].count) / limit) || 1,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const b = await req.json();
    if (!b.name || !b.name.trim()) throw new Error("Name is required");
    if (!b.email || !b.email.trim()) throw new Error("Email is required");
    if (!b.password) throw new Error("Password is required");
    
    const user = await getCurrentUser() || "system";
    
    const row = await transaction(async (c) => {
      const { rows } = await c.query(
        "INSERT INTO zalish_users(name, email, password_hash) VALUES($1, $2, crypt($3, gen_salt('bf'))) RETURNING id, name, email, role, created_at",
        [b.name.trim(), b.email.trim().toLowerCase(), b.password]
      );
      await c.query(
        "INSERT INTO zalish_logs(table_name, record_id, action, user_email, details) VALUES($1,$2,$3,$4,$5)",
        ["zalish_users", String(rows[0].id), "INSERT", user, JSON.stringify(rows[0])]
      );
      return rows[0];
    });
    return NextResponse.json(row, { status: 201 });
  } catch (e: any) {
    if (e.message.includes("unique constraint")) {
      return NextResponse.json({ error: "Email already exists" }, { status: 400 });
    }
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const b = await req.json();
    if (!b.id) throw new Error("ID is required");
    if (!b.name || !b.name.trim()) throw new Error("Name is required");
    
    const user = await getCurrentUser() || "system";
    
    const row = await transaction(async (c) => {
      let queryStr = "UPDATE zalish_users SET name=$1";
      let params = [b.name.trim(), b.id];
      if (b.password) {
        queryStr += ", password_hash=crypt($3, gen_salt('bf'))";
        params.push(b.password);
      }
      queryStr += " WHERE id=$2 RETURNING id, name, email, role, created_at";
      
      const { rows } = await c.query(queryStr, params);
      if (!rows[0]) throw new Error("User not found");
      
      await c.query(
        "INSERT INTO zalish_logs(table_name, record_id, action, user_email, details) VALUES($1,$2,$3,$4,$5)",
        ["zalish_users", String(rows[0].id), "UPDATE", user, JSON.stringify(rows[0])]
      );
      return rows[0];
    });
    return NextResponse.json(row);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { id } = await req.json();
    if (!id) throw new Error("ID is required");
    const user = await getCurrentUser() || "system";
    
    await transaction(async (c) => {
      const userRec = await c.query("SELECT email FROM zalish_users WHERE id=$1", [id]);
      if (userRec.rows[0]?.email === user) {
        throw new Error("Cannot delete your own account");
      }
      
      const { rows } = await c.query(
        "UPDATE zalish_users SET deleted_at=now() WHERE id=$1 RETURNING id",
        [id]
      );
      if (rows.length > 0) {
        await c.query(
          "INSERT INTO zalish_logs(table_name, record_id, action, user_email, details) VALUES($1,$2,$3,$4,$5)",
          ["zalish_users", String(id), "DELETE", user, JSON.stringify({ id, deleted_at: new Date().toISOString() })]
        );
      }
    });
    return new NextResponse(null, { status: 204 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
