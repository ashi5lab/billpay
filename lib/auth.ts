import { createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";

const secret = () => process.env.AUTH_SECRET || "change-this-in-railway-before-production";
const sign = (value: string) => createHmac("sha256", secret()).update(value).digest("hex");
export const sessionValue = (username: string) => `${username}.${sign(username)}`;
export async function getCurrentUser() {
  const token = (await cookies()).get("zalish_session")?.value;
  if (!token) return null;
  const lastDot = token.lastIndexOf(".");
  if (lastDot === -1) return null;
  const username = token.slice(0, lastDot);
  const expected = sessionValue(username);
  if (token.length === expected.length && timingSafeEqual(Buffer.from(token), Buffer.from(expected))) {
    return username;
  }
  return null;
}
export async function isAdmin() { return !!(await getCurrentUser()); }
export async function requireAdmin() { if (!(await isAdmin())) throw new Error("Unauthorised"); }
