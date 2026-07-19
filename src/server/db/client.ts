/**
 * Database client, kept behind one module so the rest of the app never knows
 * which engine is underneath.
 *
 * Engine: PostgreSQL on Neon, accessed with @neondatabase/serverless —
 * a fetch-based driver with no sockets or native modules, safe in every
 * runtime (Vercel serverless, bun scripts, local dev).
 *
 * Configuration:
 *   DATABASE_URL = postgres://... (Neon connection string; the Vercel Neon
 *                  integration injects it automatically. POSTGRES_URL is
 *                  accepted as a fallback.)
 */
import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import * as schema from "./schema";

const url = process.env.DATABASE_URL ?? process.env.POSTGRES_URL;

if (!url || !/^postgres(ql)?:\/\//.test(url)) {
  throw new Error(
    "DATABASE_URL must be a postgres:// connection string (Neon). " +
      "Locally: put it in .env. On Vercel: the Neon integration provides it — " +
      "remove any old DATABASE_URL/DATABASE_AUTH_TOKEN project variables that shadow it."
  );
}

const sqlClient = neon(url);

export const db = drizzle(sqlClient, { schema });
export { schema };
