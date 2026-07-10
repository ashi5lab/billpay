import { NextResponse } from "next/server"; import { db } from "@/lib/db";
export async function GET() { const { rows } = await db.query("SELECT * FROM zalish_store_config WHERE id=1"); return NextResponse.json(rows[0]); }
export async function PUT(req: Request) { const b = await req.json(); const { rows } = await db.query("UPDATE zalish_store_config SET store_name=$1,address=$2,contact_number=$3,gstin=$4,updated_at=now() WHERE id=1 RETURNING *", [b.store_name, b.address, b.contact_number, b.gstin || null]); return NextResponse.json(rows[0]); }
