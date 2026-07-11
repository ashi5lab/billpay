import { NextResponse } from "next/server"; import { db } from "@/lib/db"; import { requireAdmin } from "@/lib/auth";
const tables = { items: "zalish_items", categories: "zalish_expense_categories" } as const;
export async function GET(req: Request, { params }: { params: Promise<{kind: string}> }) { 
  try { 
    await requireAdmin(); 
    const { kind } = await params; 
    const table = tables[kind as keyof typeof tables]; 
    if (!table) return NextResponse.json({ error: "Unknown catalog" }, {status:404}); 

    const p = new URL(req.url).searchParams;
    const page = Math.max(1, Number(p.get("page") || 1)),
      limit = Math.min(100, Math.max(1, Number(p.get("limit") || 10)));
    const search = p.get("search") || "";
    
    let whereClause = `deleted_at IS NULL`;
    const sqlParams: any[] = [limit, (page - 1) * limit];
    let paramCount = 3;
    
    if (search) {
      whereClause += ` AND name ILIKE $${paramCount++}`;
      sqlParams.push(`%${search}%`);
    }
    
    const query = `SELECT * FROM ${table} WHERE ${whereClause} ORDER BY name LIMIT $1 OFFSET $2`;
    const countQuery = `SELECT count(*) FROM ${table} WHERE ${whereClause.replace(/\$(\d+)/g, (m, n) => `$${Number(n) - 2}`)}`;

    const [items, count] = await Promise.all([
      db.query(query, sqlParams),
      db.query(countQuery, sqlParams.slice(2)),
    ]);
    
    return NextResponse.json({
      items: items.rows,
      total: Number(count.rows[0].count),
      totalPages: Math.ceil(Number(count.rows[0].count) / limit) || 1,
      page,
      limit,
    });
  } catch { 
    return NextResponse.json({error:"Unauthorised"},{status:401}); 
  } 
}
export async function POST(req: Request, { params }: { params: Promise<{kind: string}> }) { try { await requireAdmin(); const { kind } = await params; const b = await req.json(); const name=String(b.name||"").trim(); if(!name) return NextResponse.json({error:"Name is required"},{status:400}); if (kind === "items") { const { rows } = await db.query("INSERT INTO zalish_items(name,default_price,cost_price,category) VALUES($1,$2,$3,$4) RETURNING *", [name, Number(b.default_price)||0, 0, b.category || null]); return NextResponse.json(rows[0], {status:201}); } if (kind === "categories") { const { rows } = await db.query("INSERT INTO zalish_expense_categories(name) VALUES($1) RETURNING *", [name]); return NextResponse.json(rows[0], {status:201}); } return NextResponse.json({error:"Unknown catalog"},{status:404}); } catch(e) { const message=e instanceof Error && /unique/i.test(e.message)?"This category already exists":e instanceof Error?e.message:"Unable to save"; return NextResponse.json({error:message},{status:400}); } }
export async function PATCH(req: Request, { params }: { params: Promise<{kind: string}> }) { const { kind } = await params; const b = await req.json(); if (kind === "items") { const { rows } = await db.query("UPDATE zalish_items SET name=$1,default_price=$2,cost_price=$3,category=$4,updated_at=now() WHERE id=$5 AND deleted_at IS NULL RETURNING *", [b.name,b.default_price,b.cost_price,b.category||null,b.id]); return NextResponse.json(rows[0]); } if(kind!=="categories") return NextResponse.json({error:"Unknown catalog"},{status:404}); const { rows } = await db.query("UPDATE zalish_expense_categories SET name=$1 WHERE id=$2 AND deleted_at IS NULL RETURNING *",[b.name,b.id]); return NextResponse.json(rows[0]); }
export async function DELETE(req: Request, { params }: { params: Promise<{kind: string}> }) { const {kind}=await params; const {id}=await req.json(); const table=tables[kind as keyof typeof tables]; if(!table) return NextResponse.json({error:"Unknown catalog"},{status:404}); await db.query(`UPDATE ${table} SET deleted_at=now() WHERE id=$1`,[id]); return new NextResponse(null,{status:204}); }
