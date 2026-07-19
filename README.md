# 🌱 PythonTree

The Python ecosystem as a growing tree: **Python at the root**, packages and
frameworks branching upward by lineage and time. Each node is a full read —
launch story, important timestamps, installation guide, tutorial, often-used
functions, and links (GitHub, PyPI, Discord, forum, docs) with a share button.

**Stack:** Bun · SolidStart (SolidJS with SSR) · SQLite via Drizzle ORM
(engine-swappable to Postgres/MySQL — see [src/server/db/README.md](src/server/db/README.md)).

## Quick start

```sh
bun install
bun run db:migrate   # create the SQLite database (data/pythontree.db)
bun run db:seed      # plant the demo tree (python, requests, math, flask, ...)
bun run dev          # http://localhost:3000
```

Copy `.env.example` to `.env` to set `ADMIN_PASSWORD` and `SESSION_SECRET`
(dev defaults: password `admin`).

## Pages

- `/` — the tree. Roots at the bottom, branches growing upward; drag to pan,
  scroll to zoom, hover for details, click a node to read it, search to fly to
  any node.
- `/n/<slug>` — a node's article page.
- `/admin` — password-protected dashboard: list, create, edit nodes.
- `/admin/preview/<slug>` — see a draft exactly as readers will, without publishing.

## Node lifecycle (and the no-delete policy)

```
draft  ⇄  preview  →  published (confirmed)
                          │
                 edit  or  hide/unhide   — never delete
```

- Draft and preview are never part of the public tree and are not publicly readable.
- Publishing requires an explicit confirmation and is **permanent**.
- Published nodes can be edited or hidden (`visible = false`), never deleted:
  - no delete function exists in the code (repo layer/API simply don't have one);
  - a SQLite **trigger** (`drizzle/0001_no_delete_guard.sql`) aborts any `DELETE`
    on a published node, so even manual queries can't remove one;
  - the published slug is frozen so shared links never break;
  - when a user disables their profile (future scope), their nodes are hidden in
    bulk, not deleted.

## Tree rendering at scale (10k+ nodes)

The landing-page tree is a WebGL renderer (three.js with an orthographic
camera), built to stay smooth past 10,000 nodes:

- layout (levels via Kahn's algorithm + barycenter ordering) is computed
  **server-side** in `src/server/repo/treeLayout.ts` and cached in memory;
  any node mutation invalidates the cache;
- the client draws all nodes as **one InstancedMesh** and all edges as one
  LineSegments geometry — two draw calls total, rendered only when dirty;
- text labels are a small pooled HTML overlay, shown only when zoomed in and
  only for on-screen nodes;
- measured with the stress tool: 10k nodes / 11.5k edges → 77 ms cold layout,
  ~0 ms cached, 183 KB gzipped payload.

Stress-test it yourself against a throwaway database (never the real one):

```powershell
$env:STRESS="1"; $env:DATABASE_URL="file:./data/stress.db"
bunx drizzle-kit migrate
bun run scripts/stress-tree.ts 10000
```

## Project layout

```
src/
  routes/            file-based pages (/, /n/[slug], /admin/...)
  components/        Button (hover/press/disabled/busy), TreeView, NodeDetail,
                     NodeForm, ShareButton, Markdown, Layout
  server/
    api.ts           server functions (queries + admin-guarded actions)
    session.ts       admin session (swap for OAuth later, same interface)
    repo/nodes.ts    all reads/writes for nodes — the only write path
    db/              drizzle schema, client, seed, engine-swap guide
drizzle/             generated SQL migrations (checked in)
data/                the SQLite database file (gitignored)
```

## Future scope (planned, not built)

- Sign-up via GitHub / Google / LinkedIn / Twitter; contributors add nodes
  (schema already has `users.provider` / `role` columns ready).
- Contribution review flow before publish.
- Engine swap to Postgres/MySQL when scale demands it (procedure documented).
