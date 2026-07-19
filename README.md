# 🌱 PythonTree

**Live at [pythontree.vercel.app](https://pythontree.vercel.app)**

The Python ecosystem as a growing tree: **Python at the root**, packages and
frameworks branching upward by lineage and time. Each node is a full read —
launch story, important timestamps, installation guide, tutorial, often-used
functions, and links (GitHub, PyPI, Discord, forum, docs) with a share button.

**Stack:** Bun · SolidStart (SolidJS with SSR) · three.js (WebGL tree) ·
Neon Postgres via Drizzle ORM · deployed on Vercel.

## Quick start

```sh
bun install
cp .env.example .env    # then fill in DATABASE_URL (Neon connection string)
bun run db:migrate      # apply schema migrations
bun run db:seed         # plant the demo tree (43 nodes, idempotent)
bun run dev             # http://localhost:3000
```

## Pages

- `/` — the tree. Roots at the bottom, branches growing upward; drag to pan,
  scroll to zoom, hover for details, click a node to read it, search to fly to
  any node.
- `/n/<slug>` — a node's article page, with both dates: the package's real
  launch date and when it was published on PythonTree.
- `/admin` — password-protected dashboard: list, create, edit nodes.
- `/admin/preview/<slug>` — see a draft exactly as readers will, without
  publishing.

## Node lifecycle (and the no-delete policy)

```
draft  ⇄  preview  →  published (confirmed)
                          │
                 edit  or  hide/unhide   — never delete
```

- Draft and preview are never part of the public tree and are not publicly
  readable.
- Publishing requires an explicit confirmation and is **permanent**.
- Published nodes can be edited or hidden (`visible = false`), never deleted:
  no delete code path exists, a Postgres **trigger** blocks stray `DELETE`s
  (`drizzle/0001_no_delete_guard.sql`), and the slug freezes at publish so
  shared links never break. Disabling a user profile (future scope) hides
  their nodes in bulk, it does not delete them.

## Tree rendering at scale (10k+ nodes)

The landing-page tree is a WebGL renderer (three.js, orthographic camera)
built to stay smooth past 10,000 nodes:

- layout (levels via Kahn's algorithm + barycenter ordering) is computed
  **server-side** (`src/server/repo/treeLayout.ts`) and cached in memory;
  node mutations invalidate it, a 60s TTL catches out-of-process writes;
- the client draws all nodes as **one InstancedMesh** and all edges as one
  LineSegments geometry — two draw calls total, rendered only when dirty;
- text labels are a small pooled HTML overlay, shown only when zoomed in and
  only for on-screen nodes;
- measured with the stress tool (`scripts/stress-tree.ts`): 10k nodes /
  11.5k edges → 77 ms cold layout, ~0 ms cached, 183 KB gzipped payload.

## Project layout

```
src/
  routes/            file-based pages (/, /n/[slug], /admin/...)
  components/        Button (hover/press/disabled/busy), TreeCanvas (WebGL),
                     NodeDetail, NodeForm, AdminGuard, ShareButton, Markdown
  server/
    api.ts           server functions (queries + admin-guarded actions)
    session.ts       admin session (swap for OAuth later, same interface)
    repo/            all reads/writes — the only DB access path
    db/              drizzle schema, Neon client, seeds, db docs
drizzle/             generated SQL migrations (checked in)
scripts/             migrate.ts, stress-tree.ts
```

Deployment guide: [DEPLOY.md](DEPLOY.md). Database details:
[src/server/db/README.md](src/server/db/README.md).

## Future scope (planned, not built)

- Sign-up via GitHub / Google / LinkedIn / Twitter; contributors add nodes
  (schema already has `users.provider` / `role` columns ready).
- Contribution review flow before publish.

---

© PythonTree — developed by
[Avinash Kumar Prajapati](https://github.com/avinash-kumar-prajapati-AI).
