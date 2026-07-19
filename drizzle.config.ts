import { defineConfig } from "drizzle-kit";

const dialect = (process.env.DATABASE_DIALECT ?? "sqlite") as "sqlite" | "postgresql" | "mysql";

export default defineConfig({
  schema: "./src/server/db/schema.ts",
  out: "./drizzle",
  dialect: dialect === "sqlite" ? "sqlite" : dialect,
  // Note: drizzle-kit here is only used for `generate` (schema diffing) and
  // local `studio` — remote (Turso) migrations run via scripts/migrate.ts,
  // which passes the auth token itself.
  dbCredentials: {
    url: process.env.DATABASE_URL ?? "file:./data/pythontree.db"
  }
});
