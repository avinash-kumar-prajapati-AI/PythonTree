# Deploying PythonTree (free: Vercel + Neon)

Production runs on Vercel (SSR serverless) with the database on Neon
(serverless Postgres), connected through Vercel's Neon marketplace
integration. The database driver is `@neondatabase/serverless` — pure
fetch, no sockets, no native modules, so serverless bundling can't break it.

(History: the project first tried Turso/libsql; Vercel's bundler kept
omitting the client's WebSocket dependency. Postgres was always the
documented swap path, so we took it.)

## Setup

1. **Neon database**: Vercel dashboard → Storage → Neon → create the free
   database and connect it to the PythonTree project. This injects
   `DATABASE_URL` (and `POSTGRES_URL` etc.) into the project automatically.
2. **Remove stale variables**: delete any manually-added `DATABASE_URL` /
   `DATABASE_AUTH_TOKEN` from Project → Settings → Environment Variables —
   leftovers from the Turso era would shadow the integration's values.
   Keep `ADMIN_PASSWORD` (strong!) and `SESSION_SECRET` (32+ random chars).
3. **Migrate + seed** from your machine (one time): copy the connection
   string from the integration panel into `.env` as `DATABASE_URL`, then:
   ```sh
   bun run db:migrate
   bun run db:seed
   bun run db:seed:ecosystem
   ```
4. **Deploy**: `git push` — every push to `main` redeploys automatically.

## After deploying

- Open the site → the tree should show all published nodes.
- Log in at `/admin` with `ADMIN_PASSWORD` and publish a test edit.
- Local dev (`bun run dev`) uses the same Neon database via `.env`.

## Notes & gotchas

- **Never** put real credentials in `.env.example` (committed) — only in
  `.env` (gitignored) and the Vercel integration/env settings.
- The no-delete policy lives in `drizzle/0001_no_delete_guard.sql` as a
  Postgres trigger; migrations run via `scripts/migrate.ts` (drizzle-orm's
  programmatic migrator over the Neon HTTP driver).
- The tree-layout cache is per serverless instance with a 60s TTL; a fresh
  instance rebuilds it in well under 100 ms, so cold starts are fine.
- Neon free tier suspends compute after inactivity; the first query after
  a quiet period takes ~1s extra while it wakes. Normal and harmless.
