/**
 * Stress tool: fills a THROWAWAY database with a synthetic published tree,
 * then measures the layout computation and payload size.
 *
 * Guard rails: refuses to run unless STRESS=1 and DATABASE_URL contains
 * "stress", so it can never touch the real database.
 *
 * Usage (PowerShell):
 *   $env:STRESS="1"; $env:DATABASE_URL="file:./data/stress.db"
 *   bunx drizzle-kit migrate
 *   bun run scripts/stress-tree.ts 10000
 */
import { db, schema } from "../src/server/db/client";
import { getTreeLayout } from "../src/server/repo/treeLayout";

const COUNT = Number(process.argv[2] ?? 10000);

if (process.env.STRESS !== "1" || !(process.env.DATABASE_URL ?? "").includes("stress")) {
  console.error(
    'Refusing: set STRESS=1 and point DATABASE_URL at a throwaway db (must contain "stress").'
  );
  process.exit(1);
}

const kinds = ["package", "framework", "library", "module"] as const;
const t0 = performance.now();

// root
const [root] = await db
  .insert(schema.nodes)
  .values({ slug: "python", name: "Python", kind: "language", status: "published" })
  .returning();

// nodes in batches; each picks 1-2 parents among already-created nodes,
// biased toward recent ones so the tree keeps branching outward
const ids: number[] = [root.id];
const edges: { parentId: number; childId: number }[] = [];
const BATCH = 500;
for (let start = 1; start < COUNT; start += BATCH) {
  const size = Math.min(BATCH, COUNT - start);
  const rows = Array.from({ length: size }, (_, j) => {
    const i = start + j;
    return {
      slug: `pkg-${i}`,
      name: `synthetic-${i}`,
      kind: kinds[i % kinds.length],
      status: "published" as const,
      launchedAt: `${1995 + (i % 30)}-01-01`
    };
  });
  const inserted = await db.insert(schema.nodes).values(rows).returning({ id: schema.nodes.id });
  for (const r of inserted) {
    const nParents = Math.random() < 0.15 ? 2 : 1;
    for (let p = 0; p < nParents; p++) {
      const bias = Math.random() < 0.7 ? Math.max(0, ids.length - 200) : 0;
      const parent = ids[bias + Math.floor(Math.random() * (ids.length - bias))];
      if (!edges.some(e => e.childId === r.id && e.parentId === parent)) {
        edges.push({ parentId: parent, childId: r.id });
      }
    }
    ids.push(r.id);
  }
}
for (let start = 0; start < edges.length; start += BATCH) {
  await db.insert(schema.nodeEdges).values(edges.slice(start, start + BATCH));
}
console.log(
  `inserted ${ids.length} nodes, ${edges.length} edges in ${((performance.now() - t0) / 1000).toFixed(1)}s`
);

// cold layout
let t = performance.now();
const layout = await getTreeLayout();
console.log(`layout (cold, incl. queries): ${(performance.now() - t).toFixed(0)}ms`);

// cached layout
t = performance.now();
await getTreeLayout();
console.log(`layout (cached): ${(performance.now() - t).toFixed(2)}ms`);

const json = JSON.stringify(layout);
const gzipped = Bun.gzipSync(new TextEncoder().encode(json));
console.log(
  `payload: ${(json.length / 1024).toFixed(0)} KB raw, ${(gzipped.length / 1024).toFixed(0)} KB gzipped`
);
const levels = new Set(layout.nodes.map(n => n.y)).size;
console.log(`tree shape: ${layout.nodes.length} nodes across ${levels} levels`);
process.exit(0);
