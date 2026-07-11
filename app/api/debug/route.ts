import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  try {
    const res = await db.query(`
      SELECT table_name, column_name, data_type 
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
      ORDER BY table_name, ordinal_position
    `);
    return NextResponse.json({ schema: res.rows });
  } catch(e: any) {
    return NextResponse.json({ error: String(e), stack: e.stack });
  }
}
