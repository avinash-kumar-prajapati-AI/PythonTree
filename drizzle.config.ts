import { defineConfig } from "drizzle-kit";

const dialect = (process.env.DATABASE_DIALECT ?? "sqlite") as "sqlite" | "postgresql" | "mysql";

export default defineConfig({
  schema: "./src/server/db/schema.ts",
  out: "./drizzle",
  dialect: dialect === "sqlite" ? "sqlite" : dialect,
  dbCredentials: {
    url: process.env.DATABASE_URL ?? "file:./data/pythontree.db",
    authToken: process.env.DATABASE_AUTH_TOKEN || undefined
  }
});
