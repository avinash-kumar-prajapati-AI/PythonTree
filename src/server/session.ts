/**
 * Minimal admin session for the current phase (admin-only publishing).
 * Future scope: replace `login` with OAuth (GitHub/Google/LinkedIn/Twitter)
 * and keep `requireAdmin` / `getSessionUser` as the stable interface.
 */
import { useSession, getCookie, getEvent } from "vinxi/http";

type SessionData = { role?: "admin" };

const SESSION_SECRET =
  process.env.SESSION_SECRET ?? "dev-only-secret-change-me-in-production-1234";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? "admin";

if (!process.env.ADMIN_PASSWORD) {
  console.warn(
    "[pythontree] ADMIN_PASSWORD not set — using the default 'admin'. Set it in .env before deploying."
  );
}

function session() {
  return useSession<SessionData>({ password: SESSION_SECRET, name: "pythontree" });
}

export async function login(password: string): Promise<boolean> {
  if (password !== ADMIN_PASSWORD) return false;
  const s = await session();
  await s.update({ role: "admin" });
  return true;
}

export async function logout() {
  const s = await session();
  await s.clear();
}

export async function isAdmin(): Promise<boolean> {
  // Reads must never CREATE a session: during streaming SSR the response
  // headers are already sent, and h3 would throw trying to set the new
  // session cookie. Only `login` (a POST action) creates the session.
  if (!getCookie(getEvent(), "pythontree")) return false;
  try {
    const s = await session();
    return s.data.role === "admin";
  } catch {
    return false;
  }
}

export async function requireAdmin() {
  if (!(await isAdmin())) {
    throw new Error("Unauthorized: admin session required");
  }
}
