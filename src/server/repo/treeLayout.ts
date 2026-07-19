/**
 * Precomputed layout for the public tree, built to stay fast at 10k+ nodes.
 *
 * - Levels are computed with Kahn's algorithm (iterative, cycle-safe):
 *   level(child) = max(level(parents)) + 1, roots at level 0.
 * - Within a level, nodes are ordered by the mean x of their parents
 *   (barycenter heuristic) to keep edge crossings low; roots order by
 *   launch date — the "growing by timeline" effect.
 * - The result is cached in memory and invalidated by any node mutation,
 *   so the expensive part runs once per change, not per visitor.
 *
 * Payload stays compact: flat node records + edges as index pairs into the
 * nodes array (not DB ids), ~100 bytes/node on the wire before gzip.
 */
import { and, eq } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { db, schema } from "../db/client";

const { nodes, nodeEdges } = schema;

export type LayoutNode = {
  id: number;
  slug: string;
  name: string;
  kind: string;
  /** launch year, for tooltips */
  year: number | null;
  x: number;
  y: number;
};

export type TreeLayout = {
  nodes: LayoutNode[];
  /** flat [parentIndex, childIndex, ...] pairs into `nodes` */
  edges: number[];
};

const H_GAP = 46; // horizontal distance between siblings (world units)
const V_GAP = 150; // vertical distance between levels

let cache: { version: number; at: number; data: TreeLayout } | null = null;
let version = 0;

/** Safety net for writes from OTHER processes (seed scripts, manual SQL):
 *  in-app mutations invalidate instantly, everything else within a minute. */
const TTL_MS = 60_000;

/** Call from every mutation that can change the public tree. */
export function invalidateTreeLayout() {
  version++;
}

export async function getTreeLayout(): Promise<TreeLayout> {
  if (cache && cache.version === version && Date.now() - cache.at < TTL_MS) return cache.data;
  const v = version;

  const rows = await db.query.nodes.findMany({
    where: and(eq(nodes.status, "published"), eq(nodes.visible, true)),
    columns: { id: true, slug: true, name: true, kind: true, launchedAt: true }
  });
  // Join instead of `IN (…10k ids…)` — with two giant IN lists SQLite spends
  // seconds just binding parameters; the join is ~ms at 10k nodes.
  const p = alias(nodes, "p");
  const c = alias(nodes, "c");
  const edgeRows = await db
    .select({ parentId: nodeEdges.parentId, childId: nodeEdges.childId })
    .from(nodeEdges)
    .innerJoin(p, and(eq(p.id, nodeEdges.parentId), eq(p.status, "published"), eq(p.visible, true)))
    .innerJoin(c, and(eq(c.id, nodeEdges.childId), eq(c.status, "published"), eq(c.visible, true)));

  const index = new Map<number, number>();
  rows.forEach((r, i) => index.set(r.id, i));
  const n = rows.length;

  // adjacency (children lists) + indegree for Kahn's algorithm
  const children: number[][] = Array.from({ length: n }, () => []);
  const indegree = new Int32Array(n);
  for (const e of edgeRows) {
    const p = index.get(e.parentId)!;
    const c = index.get(e.childId)!;
    children[p].push(c);
    indegree[c]++;
  }

  const level = new Int32Array(n);
  const queue: number[] = [];
  for (let i = 0; i < n; i++) if (indegree[i] === 0) queue.push(i);
  const remaining = Int32Array.from(indegree);
  for (let head = 0; head < queue.length; head++) {
    const u = queue[head];
    for (const c of children[u]) {
      if (level[u] + 1 > level[c]) level[c] = level[u] + 1;
      if (--remaining[c] === 0) queue.push(c);
    }
  }
  // nodes never reached (a cycle slipped in) keep level 0 — degraded, not broken

  const parentsOf: number[][] = Array.from({ length: n }, () => []);
  for (const e of edgeRows) parentsOf[index.get(e.childId)!].push(index.get(e.parentId)!);

  // group by level
  let maxLevel = 0;
  for (let i = 0; i < n; i++) if (level[i] > maxLevel) maxLevel = level[i];
  const byLevel: number[][] = Array.from({ length: maxLevel + 1 }, () => []);
  for (let i = 0; i < n; i++) byLevel[level[i]].push(i);

  const x = new Float64Array(n);
  const y = new Float64Array(n);
  for (let lv = 0; lv <= maxLevel; lv++) {
    const members = byLevel[lv];
    if (lv === 0) {
      members.sort((a, b) =>
        (rows[a].launchedAt ?? "9999").localeCompare(rows[b].launchedAt ?? "9999")
      );
    } else {
      // barycenter: follow the mean position of the parents placed below
      const key = new Map<number, number>();
      for (const m of members) {
        const ps = parentsOf[m];
        key.set(m, ps.length ? ps.reduce((s, p) => s + x[p], 0) / ps.length : 0);
      }
      members.sort((a, b) => key.get(a)! - key.get(b)! || rows[a].name.localeCompare(rows[b].name));
    }
    const width = (members.length - 1) * H_GAP;
    members.forEach((m, i) => {
      x[m] = i * H_GAP - width / 2;
      y[m] = lv * V_GAP;
    });
  }

  const data: TreeLayout = {
    nodes: rows.map((r, i) => ({
      id: r.id,
      slug: r.slug,
      name: r.name,
      kind: r.kind,
      year: r.launchedAt ? Number(r.launchedAt.slice(0, 4)) : null,
      x: Math.round(x[i] * 10) / 10,
      y: Math.round(y[i] * 10) / 10
    })),
    edges: edgeRows.flatMap(e => [index.get(e.parentId)!, index.get(e.childId)!])
  };
  cache = { version: v, at: Date.now(), data };
  return data;
}
