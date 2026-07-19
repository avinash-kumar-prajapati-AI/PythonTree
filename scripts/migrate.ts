/**
 * Applies ./drizzle migrations using drizzle-orm's programmatic migrator
 * over the Neon HTTP driver. Works from any machine against whatever
 * DATABASE_URL points at.
 *
 *   bun run db:migrate
 */
import { migrate } from "drizzle-orm/neon-http/migrator";
import { db } from "../src/server/db/client";

await migrate(db, { migrationsFolder: "./drizzle" });
console.log("migrations applied");
process.exit(0);
