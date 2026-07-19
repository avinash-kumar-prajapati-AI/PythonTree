/**
 * Applies ./drizzle migrations using drizzle-orm's programmatic migrator.
 * Works identically for local file DBs and remote Turso (libsql://) DBs,
 * where `drizzle-kit migrate` can be flaky over HTTP.
 *
 *   bun run db:migrate
 */
import { migrate } from "drizzle-orm/libsql/migrator";
import { db } from "../src/server/db/client";

await migrate(db, { migrationsFolder: "./drizzle" });
console.log("migrations applied to", process.env.DATABASE_URL ?? "file:./data/pythontree.db");
process.exit(0);
