# Database

SQLite today (via `@libsql/client`, plain `file:` database), designed so the
engine can be swapped for Postgres or MySQL later without touching app code.

## Layout

- `schema.ts` — all tables (Drizzle ORM). The single source of truth.
- `client.ts` — the only place that knows which engine is used. Everything
  else imports `db` from here.
- `../repo/*` — data access functions. Routes never run raw queries.
- `../../..../drizzle/` — generated SQL migrations (checked into git).

## Everyday commands

```sh
bun run db:generate   # diff schema.ts -> new migration file in ./drizzle
bun run db:migrate    # apply pending migrations to the database
bun run db:seed       # insert the demo python tree (idempotent)
bun run db:studio     # browse data in drizzle-kit studio
```

## Node deletion policy (enforced here, not just in the UI)

- There is **no delete function** in the repo layer and no delete endpoint.
- A published node can only be edited or set `visible = false` (hidden).
- Migration `0001_no_delete_guard.sql` installs a database trigger that
  aborts any `DELETE` on a published node — even a stray manual query or a
  future bug cannot remove one.
- When a user disables their profile, their nodes are hidden in bulk, never
  deleted.

## Swapping to Postgres or MySQL later (safe procedure)

1. **Freeze writes** (stop the app or put it in read-only).
2. Install the driver:
   - Postgres: `bun add postgres`
   - MySQL: `bun add mysql2`
3. In `schema.ts`, change the import from `drizzle-orm/sqlite-core` to
   `drizzle-orm/pg-core` (or `mysql-core`) and adjust the few
   SQLite-specific bits: `integer(..., { mode: "boolean" })` becomes
   `boolean(...)`, `text(..., { mode: "json" })` becomes `jsonb(...)`,
   default `datetime('now')` becomes `now()`.
4. In `client.ts`, add a branch for the new dialect
   (`drizzle-orm/postgres-js` or `drizzle-orm/mysql2`).
5. Set the environment:
   ```
   DATABASE_DIALECT=postgres
   DATABASE_URL=postgres://user:pass@host:5432/pythontree
   ```
6. Generate fresh baseline migrations for the new dialect:
   `bunx drizzle-kit generate` (with the new env active) and apply them to
   the empty target database with `bunx drizzle-kit migrate`.
7. **Copy the data.** Row-copy is enough at this size: read every table from
   the SQLite file and insert into the new database (order: users, nodes,
   node_links, node_edges to satisfy foreign keys). Keep the old `.db` file
   as the rollback path.
8. Re-create the no-delete trigger for the new engine (see
   `drizzle/0001_no_delete_guard.sql` for the SQLite version; Postgres uses
   `CREATE TRIGGER ... EXECUTE FUNCTION`, MySQL `SIGNAL SQLSTATE '45000'`).
9. Run the app against the new database, verify, then unfreeze writes.
