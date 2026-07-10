import { createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";

const secret = () => process.env.AUTH_SECRET || "change-this-in-railway-before-production";
const sign = (value: string) => createHmac("sha256", secret()).update(value).digest("hex");
export const sessionValue = () => `admin.${sign("admin")}`;
export async function isAdmin() { const token = (await cookies()).get("zalish_session")?.value; const expected = sessionValue(); return !!token && token.length === expected.length && timingSafeEqual(Buffer.from(token), Buffer.from(expected)); }
export async function requireAdmin() { if (!(await isAdmin())) throw new Error("Unauthorised"); }
