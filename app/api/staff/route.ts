import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  try {
    const { rows } = await db.query(`
      SELECT name FROM zalish_users 
      WHERE deleted_at IS NULL 
      ORDER BY name ASC
    `);

    return NextResponse.json(rows.map((r: any) => r.name));
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Error fetching staff" },
      { status: 400 },
    );
  }
}
