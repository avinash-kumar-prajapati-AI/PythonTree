# Database

PostgreSQL hosted on **Neon** (free tier), accessed with
`@neondatabase/serverless` — a fetch-based driver that works identically in
Vercel serverless functions, bun scripts and local dev. Connected via
`DATABASE_URL` (locally from `.env`; in production injected by the Vercel
Neon integration, possibly under a `DB_` prefix — `client.ts` accepts both).

## Layout

- `schema.ts` — all tables (Drizzle ORM, pg-core). The single source of truth.
- `client.ts` — the only place that knows which engine/driver is used.
  Everything else imports `db` from here.
- `seed.ts` + `seed-ecosystem.ts` — demo content, idempotent per slug.
- `../repo/*` — data access functions. Routes never run raw queries.
- `/drizzle` (repo root) — generated SQL migrations, checked into git.

## Everyday commands

```sh
bun run db:generate   # diff schema.ts -> new migration file in ./drizzle
bun run db:migrate    # apply pending migrations (scripts/migrate.ts)
bun run db:seed       # plant/refresh the demo tree (skips existing slugs)
bun run db:studio     # browse data in drizzle-kit studio
```

After changing `schema.ts`: `db:generate`, review the SQL, then `db:migrate`.

## Node deletion policy (enforced here, not just in the UI)

- There is **no delete function** in the repo layer and no delete endpoint.
- A published node can only be edited or set `visible = false` (hidden);
  its slug is frozen so shared links never break.
- Migration `0001_no_delete_guard.sql` installs a plpgsql trigger that
  raises an exception on any `DELETE` of a published node — even a stray
  manual query or a future bug cannot remove one.
- When a user disables their profile, their nodes are hidden in bulk
  (`hideNodesByUser`), never deleted.

## History / swapping engines again

The project started on SQLite (with Turso for hosting) and swapped to
Neon Postgres on 2026-07-19 — serverless bundling kept breaking the libsql
client, and Postgres was the designed escape hatch. The swap touched only
`schema.ts` (sqlite-core -> pg-core column builders), `client.ts` (driver),
and regenerated migrations; the repo layer and app code were untouched.
The same recipe applies to any future move (e.g. to MySQL or self-hosted
Postgres): change the column-builder imports, swap the driver in
`client.ts`, regenerate migrations, row-copy the data, re-create the
no-delete trigger in the target dialect.
