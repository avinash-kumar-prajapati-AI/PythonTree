/**
 * Data access for tree nodes. This is the ONLY module that writes to the
 * nodes tables, and it deliberately exposes no delete operation.
 *
 * Lifecycle: draft -> preview -> published (confirmed).
 * Once published a node can only be edited or hidden, never deleted and
 * never demoted back to draft/preview.
 */
import { and, eq, inArray } from "drizzle-orm";
import { alias } from "drizzle-orm/sqlite-core";
import { db, schema } from "../db/client";
import { invalidateTreeLayout } from "./treeLayout";

const { nodes, nodeEdges, nodeLinks } = schema;

export type NodeInput = {
  slug: string;
  name: string;
  kind?: typeof nodes.$inferInsert.kind;
  summary?: string;
  launchedAt?: string | null;
  launchedBy?: string | null;
  ownership?: typeof nodes.$inferInsert.ownership;
  license?: string | null;
  milestones?: { date: string; label: string }[];
  installGuide?: string;
  tutorial?: string;
  commonFunctions?: string;
  parentSlugs?: string[];
  links?: { kind?: typeof nodeLinks.$inferInsert.kind; label: string; url: string }[];
};

/** All published, visible nodes plus their edges — the public tree. */
export async function getPublishedTree() {
  const visibleNodes = await db.query.nodes.findMany({
    where: and(eq(nodes.status, "published"), eq(nodes.visible, true)),
    columns: {
      id: true,
      slug: true,
      name: true,
      kind: true,
      summary: true,
      launchedAt: true
    }
  });
  // Join, not `IN (…ids…)` — giant IN lists get very slow past a few
  // thousand nodes (see treeLayout.ts for the same fix).
  const p = alias(nodes, "p");
  const c = alias(nodes, "c");
  const edges = await db
    .select({ parentId: nodeEdges.parentId, childId: nodeEdges.childId })
    .from(nodeEdges)
    .innerJoin(p, and(eq(p.id, nodeEdges.parentId), eq(p.status, "published"), eq(p.visible, true)))
    .innerJoin(c, and(eq(c.id, nodeEdges.childId), eq(c.status, "published"), eq(c.visible, true)));
  return { nodes: visibleNodes, edges };
}

/** Full node detail. Preview mode also returns draft/preview/hidden nodes. */
export async function getNodeBySlug(slug: string, opts: { includeUnpublished?: boolean } = {}) {
  const node = await db.query.nodes.findFirst({
    where: opts.includeUnpublished
      ? eq(nodes.slug, slug)
      : and(eq(nodes.slug, slug), eq(nodes.status, "published"), eq(nodes.visible, true)),
    with: { links: true }
  });
  if (!node) return null;

  const parentRows = await db
    .select({ id: nodes.id, slug: nodes.slug, name: nodes.name })
    .from(nodeEdges)
    .innerJoin(nodes, eq(nodeEdges.parentId, nodes.id))
    .where(eq(nodeEdges.childId, node.id));
  const childRows = await db
    .select({ id: nodes.id, slug: nodes.slug, name: nodes.name })
    .from(nodeEdges)
    .innerJoin(nodes, eq(nodeEdges.childId, nodes.id))
    .where(eq(nodeEdges.parentId, node.id));

  return { ...node, parents: parentRows, children: childRows };
}

export async function listAllNodes() {
  return db.query.nodes.findMany({
    columns: { id: true, slug: true, name: true, status: true, visible: true, updatedAt: true },
    orderBy: (n, { desc }) => [desc(n.updatedAt)]
  });
}

/** Create a new node. Always starts as a draft regardless of input. */
export async function createNode(input: NodeInput, createdBy?: number) {
  const [row] = await db
    .insert(nodes)
    .values({
      slug: input.slug,
      name: input.name,
      kind: input.kind ?? "package",
      summary: input.summary ?? "",
      launchedAt: input.launchedAt ?? null,
      launchedBy: input.launchedBy ?? null,
      ownership: input.ownership ?? "opensource",
      license: input.license ?? null,
      milestones: input.milestones ?? [],
      installGuide: input.installGuide ?? "",
      tutorial: input.tutorial ?? "",
      commonFunctions: input.commonFunctions ?? "",
      status: "draft",
      createdBy: createdBy ?? null
    })
    .returning();
  await replaceRelations(row.id, input);
  invalidateTreeLayout();
  return row;
}

/** Update content fields. Never touches status — transitions go through setStatus. */
export async function updateNode(id: number, input: Partial<NodeInput>) {
  const { parentSlugs, links, slug, ...fields } = input;
  const existing = await db.query.nodes.findFirst({ where: eq(nodes.id, id) });
  if (!existing) throw new Error(`Node ${id} not found`);

  await db
    .update(nodes)
    .set({
      ...fields,
      // Slug is frozen after publish so shared/bookmarked node URLs never break.
      ...(existing.status !== "published" && slug ? { slug } : {}),
      updatedAt: new Date().toISOString()
    })
    .where(eq(nodes.id, id));
  if (parentSlugs !== undefined || links !== undefined) {
    await replaceRelations(id, { parentSlugs, links });
  }
  invalidateTreeLayout();
  return db.query.nodes.findFirst({ where: eq(nodes.id, id) });
}

/**
 * Status transitions:
 *   draft <-> preview, draft/preview -> published.
 * Published is terminal — any attempt to leave it is rejected.
 */
export async function setStatus(id: number, status: "draft" | "preview" | "published") {
  const existing = await db.query.nodes.findFirst({ where: eq(nodes.id, id) });
  if (!existing) throw new Error(`Node ${id} not found`);
  if (existing.status === "published" && status !== "published") {
    throw new Error("A published node cannot be unpublished — hide it instead.");
  }
  await db
    .update(nodes)
    .set({
      status,
      updatedAt: new Date().toISOString(),
      ...(status === "published" && !existing.publishedAt
        ? { publishedAt: new Date().toISOString() }
        : {})
    })
    .where(eq(nodes.id, id));
  invalidateTreeLayout();
}

/** The only way to remove a node from the public tree. */
export async function setVisibility(id: number, visible: boolean) {
  await db
    .update(nodes)
    .set({ visible, updatedAt: new Date().toISOString() })
    .where(eq(nodes.id, id));
  invalidateTreeLayout();
}

/** Called when a user disables their profile: hides their nodes in bulk. */
export async function hideNodesByUser(userId: number) {
  await db
    .update(nodes)
    .set({ visible: false, updatedAt: new Date().toISOString() })
    .where(eq(nodes.createdBy, userId));
  invalidateTreeLayout();
}

async function replaceRelations(
  nodeId: number,
  input: Pick<NodeInput, "parentSlugs" | "links">
) {
  if (input.parentSlugs !== undefined) {
    await db.delete(nodeEdges).where(eq(nodeEdges.childId, nodeId));
    if (input.parentSlugs.length) {
      const parents = await db
        .select({ id: nodes.id })
        .from(nodes)
        .where(inArray(nodes.slug, input.parentSlugs));
      if (parents.length !== input.parentSlugs.length) {
        throw new Error("One or more parent slugs do not exist");
      }
      await db
        .insert(nodeEdges)
        .values(parents.map(p => ({ parentId: p.id, childId: nodeId })));
    }
  }
  if (input.links !== undefined) {
    await db.delete(nodeLinks).where(eq(nodeLinks.nodeId, nodeId));
    if (input.links.length) {
      await db.insert(nodeLinks).values(
        input.links.map((l, i) => ({
          nodeId,
          kind: l.kind ?? "custom",
          label: l.label,
          url: l.url,
          sortOrder: i
        }))
      );
    }
  }
}
