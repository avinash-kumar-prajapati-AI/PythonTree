/**
 * Database client, kept behind one module so the rest of the app never knows
 * which engine is underneath.
 *
 * Configured via environment:
 *   DATABASE_DIALECT    = sqlite (default) | postgres | mysql
 *   DATABASE_URL        = file:./data/pythontree.db (default)
 *                         libsql://<db>.turso.io  (hosted sqlite/Turso)
 *                         postgres://user:pass@host/db
 *                         mysql://user:pass@host/db
 *   DATABASE_AUTH_TOKEN = auth token, required for Turso URLs only
 *
 * Swapping engines later: see src/server/db/README.md.
 */
import { drizzle } from "drizzle-orm/libsql";
import { createClient } from "@libsql/client";
import * as schema from "./schema";

const dialect = process.env.DATABASE_DIALECT ?? "sqlite";
const url = process.env.DATABASE_URL ?? "file:./data/pythontree.db";

if (dialect !== "sqlite") {
  // Deliberate hard stop instead of a silent fallback. When the project is
  // ready to move, install the driver and follow the README:
  //   postgres: bun add postgres  -> drizzle-orm/postgres-js
  //   mysql:    bun add mysql2    -> drizzle-orm/mysql2
  throw new Error(
    `DATABASE_DIALECT="${dialect}" requested but only sqlite is wired up yet. ` +
      `Follow src/server/db/README.md to enable ${dialect}.`
  );
}

const client = createClient({
  url,
  // Only needed for remote (Turso) URLs; undefined is fine for file: DBs.
  authToken: process.env.DATABASE_AUTH_TOKEN || undefined
});

export const db = drizzle(client, { schema });
export { schema };
