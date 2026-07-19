# Deploying PythonTree (free: Vercel + Turso)

Production runs on Vercel (SSR serverless) with the database on Turso
(hosted libsql — same `@libsql/client` the app already uses).

## One-time setup (already done)

- Turso database created; migrations + seeds applied to it:
  ```powershell
  $env:DATABASE_URL="libsql://<your-db>.turso.io"
  $env:DATABASE_AUTH_TOKEN="<token>"
  bun run db:migrate; bun run db:seed; bun run db:seed:ecosystem
  ```
- `app.config.ts` preset set to `"vercel"`.
- Code pushed to https://github.com/avinash-kumar-prajapati-AI/PythonTree

## Creating the Vercel project

1. Go to https://vercel.com/new, sign in with GitHub, import the
   `PythonTree` repository.
2. Framework preset: it should detect SolidStart; build command `bun run build`
   (or leave default `npm run build` — both work), output is handled by the
   vercel preset automatically.
3. Add the environment variables (Project → Settings → Environment Variables):

   | Name | Value |
   |---|---|
   | `DATABASE_URL` | `libsql://<your-db>.turso.io` |
   | `DATABASE_AUTH_TOKEN` | your Turso token |
   | `ADMIN_PASSWORD` | a STRONG password — this guards /admin on the public internet |
   | `SESSION_SECRET` | 32+ random characters |

4. Deploy. Every future `git push` to `main` redeploys automatically.

## After deploying

- Open the URL → the tree should show all published nodes.
- Log in at `/admin` with `ADMIN_PASSWORD` and publish a test edit.
- Local dev is unchanged: `.env` keeps `DATABASE_URL=file:./data/pythontree.db`.

## Notes & gotchas

- **Never** put real credentials in `.env.example` (committed) — only in
  `.env` (gitignored) and Vercel's env settings.
- If the Turso token ever leaks or you lose it: `turso db tokens create` a
  new one and update it in Vercel; old tokens can be revoked with
  `turso db tokens invalidate`.
- `bun run db:migrate` (scripts/migrate.ts) applies migrations to whatever
  `DATABASE_URL` points at — local file by default, Turso when the env vars
  are set. Run it against Turso after adding any new migration.
- The tree-layout cache is per serverless instance with a 60s TTL; a fresh
  instance rebuilds it in well under 100 ms, so cold starts are fine.
