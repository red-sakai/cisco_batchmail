import { cookies } from "next/headers";

export const SESSION_COOKIE = "batchmail_session";
const SESSION_SALT = "batchmail-session-v1";
const SESSION_MAX_AGE = 60 * 60 * 24 * 7; // 7 days

async function expectedSessionToken(): Promise<string> {
  const email = (process.env.ADMIN_EMAIL || "").trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD || "";
  const data = new TextEncoder().encode(`${email}|${password}|${SESSION_SALT}`);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export function hasAdminCredentials(): boolean {
  return Boolean(
    (process.env.ADMIN_EMAIL || "").trim() && process.env.ADMIN_PASSWORD
  );
}

export function verifyCredentials(email: string, password: string): boolean {
  if (!hasAdminCredentials()) return false;
  const expectedEmail = (process.env.ADMIN_EMAIL || "").trim().toLowerCase();
  return (
    email.trim().toLowerCase() === expectedEmail &&
    password === process.env.ADMIN_PASSWORD
  );
}

export async function isAuthenticated(): Promise<boolean> {
  if (!hasAdminCredentials()) return false;
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return false;
  return token === (await expectedSessionToken());
}

export async function createSession(): Promise<void> {
  const store = await cookies();
  store.set(SESSION_COOKIE, await expectedSessionToken(), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });
}

export async function destroySession(): Promise<void> {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
}
