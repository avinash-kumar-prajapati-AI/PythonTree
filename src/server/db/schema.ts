/**
 * Database schema (Drizzle ORM, PostgreSQL dialect — hosted on Neon).
 *
 * History: started on SQLite; swapped to Postgres/Neon on 2026-07-19 because
 * serverless hosting needs a network database anyway. Thanks to Drizzle the
 * swap only touched this file, client.ts and the generated migrations —
 * the repo layer and app code are dialect-agnostic.
 *
 * Date columns are ISO strings (text) on purpose: they render directly in
 * the UI and survive any future engine swap without Date/timezone surprises.
 */
import { pgTable, text, integer, boolean, jsonb, primaryKey, uniqueIndex, index } from "drizzle-orm/pg-core";
import { sql, relations } from "drizzle-orm";

const isoNow = sql`to_char(now() at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS"Z"')`;

/** Registered users. Only admins can publish for now; OAuth columns are ready
 *  for the future GitHub/Google/LinkedIn/Twitter signup scope. */
export const users = pgTable(
  "users",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    username: text("username").notNull(),
    displayName: text("display_name"),
    email: text("email"),
    role: text("role", { enum: ["admin", "contributor"] }).notNull().default("contributor"),
    provider: text("provider", { enum: ["local", "github", "google", "linkedin", "twitter"] })
      .notNull()
      .default("local"),
    providerId: text("provider_id"),
    avatarUrl: text("avatar_url"),
    /** When a user disables their profile, their nodes become hidden — never deleted. */
    disabled: boolean("disabled").notNull().default(false),
    createdAt: text("created_at").notNull().default(isoNow)
  },
  t => [uniqueIndex("users_username_idx").on(t.username)]
);

/** A node in the knowledge tree: python itself, a package, a framework, ... */
export const nodes = pgTable(
  "nodes",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    slug: text("slug").notNull(),
    name: text("name").notNull(),
    kind: text("kind", {
      enum: ["language", "package", "framework", "library", "module", "concept"]
    })
      .notNull()
      .default("package"),
    summary: text("summary").notNull().default(""),

    // --- provenance ---
    /** First public release, ISO date string. Drives the timeline layout. */
    launchedAt: text("launched_at"),
    /** Person/organization that launched it. */
    launchedBy: text("launched_by"),
    ownership: text("ownership", { enum: ["opensource", "company", "individual", "foundation"] })
      .notNull()
      .default("opensource"),
    license: text("license"),
    /** Extra important timestamps: [{ "date": "1995-01-01", "label": "1.0 release" }] */
    milestones: jsonb("milestones").$type<{ date: string; label: string }[]>(),

    // --- long-form content (markdown) ---
    installGuide: text("install_guide").notNull().default(""),
    tutorial: text("tutorial").notNull().default(""),
    /** Often-used functions and examples, markdown. */
    commonFunctions: text("common_functions").notNull().default(""),

    // --- lifecycle ---
    /**
     * draft    -> only visible to its author in the editor
     * preview  -> renderable via a preview link, still NOT part of the tree
     * published -> confirmed and part of the tree; can never be deleted,
     *              only edited or hidden (visible = false).
     */
    status: text("status", { enum: ["draft", "preview", "published"] }).notNull().default("draft"),
    visible: boolean("visible").notNull().default(true),

    createdBy: integer("created_by").references(() => users.id),
    createdAt: text("created_at").notNull().default(isoNow),
    updatedAt: text("updated_at").notNull().default(isoNow),
    publishedAt: text("published_at")
  },
  t => [uniqueIndex("nodes_slug_idx").on(t.slug), index("nodes_status_idx").on(t.status)]
);

/**
 * Parent/child edges. A node may have several parents (e.g. a framework
 * building on both `requests` and `asyncio`), so the tree is really a DAG.
 * `parent` is the thing being inherited from / built upon.
 */
export const nodeEdges = pgTable(
  "node_edges",
  {
    parentId: integer("parent_id")
      .notNull()
      .references(() => nodes.id),
    childId: integer("child_id")
      .notNull()
      .references(() => nodes.id)
  },
  t => [primaryKey({ columns: [t.parentId, t.childId] })]
);

/** External links attached to a node: GitHub, Discord, forum, PyPI, custom. */
export const nodeLinks = pgTable(
  "node_links",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    nodeId: integer("node_id")
      .notNull()
      .references(() => nodes.id),
    kind: text("kind", {
      enum: ["github", "discord", "forum", "pypi", "docs", "website", "custom"]
    })
      .notNull()
      .default("custom"),
    label: text("label").notNull(),
    url: text("url").notNull(),
    sortOrder: integer("sort_order").notNull().default(0)
  },
  t => [index("node_links_node_idx").on(t.nodeId)]
);

export const nodesRelations = relations(nodes, ({ many, one }) => ({
  links: many(nodeLinks),
  parents: many(nodeEdges, { relationName: "child" }),
  children: many(nodeEdges, { relationName: "parent" }),
  author: one(users, { fields: [nodes.createdBy], references: [users.id] })
}));

export const nodeEdgesRelations = relations(nodeEdges, ({ one }) => ({
  parent: one(nodes, { fields: [nodeEdges.parentId], references: [nodes.id], relationName: "parent" }),
  child: one(nodes, { fields: [nodeEdges.childId], references: [nodes.id], relationName: "child" })
}));

export const nodeLinksRelations = relations(nodeLinks, ({ one }) => ({
  node: one(nodes, { fields: [nodeLinks.nodeId], references: [nodes.id] })
}));

export type Node = typeof nodes.$inferSelect;
export type NewNode = typeof nodes.$inferInsert;
export type NodeLink = typeof nodeLinks.$inferSelect;
export type NodeEdge = typeof nodeEdges.$inferSelect;
export type User = typeof users.$inferSelect;
