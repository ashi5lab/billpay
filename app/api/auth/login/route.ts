import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sessionValue } from "@/lib/auth";
export async function POST(req: Request) {
  try {
    const { username, password } = await req.json();
    const email = username === "admin" ? "admin@zalish.local" : String(username || "");
    const result = await db.query("SELECT id FROM zalish_users WHERE email=$1 AND deleted_at IS NULL AND password_hash=crypt($2,password_hash)", [email, password]);
    if (!result.rows[0]) return NextResponse.json({ error: "Invalid username or password" }, { status: 401 });
    const response = NextResponse.json({ ok: true });
    response.cookies.set("zalish_session", sessionValue(), { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 60 * 60 * 12 });
    return response;
  } catch (e: any) {
    console.error("LOGIN ERROR:", e);
    return NextResponse.json({ error: String(e), stack: e.stack }, { status: 500 });
  }
}
