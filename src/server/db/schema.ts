/**
 * Database schema (Drizzle ORM, SQLite dialect).
 *
 * DIALECT SWAP (SQLite -> Postgres/MySQL):
 * The schema is written with `drizzle-orm/sqlite-core`. To move to Postgres or
 * MySQL, switch the imports to `pg-core`/`mysql-core` (column builders have
 * the same names/shape), set DATABASE_DIALECT + DATABASE_URL in .env, and run
 * `bun run db:generate && bun run db:migrate`. See src/server/db/README.md
 * for the full, safe migration procedure.
 */
import { sqliteTable, text, integer, primaryKey, uniqueIndex, index } from "drizzle-orm/sqlite-core";
import { sql, relations } from "drizzle-orm";

/** Registered users. Only admins can publish for now; OAuth columns are ready
 *  for the future GitHub/Google/LinkedIn/Twitter signup scope. */
export const users = sqliteTable(
  "users",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
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
    disabled: integer("disabled", { mode: "boolean" }).notNull().default(false),
    createdAt: text("created_at").notNull().default(sql`(datetime('now'))`)
  },
  t => [uniqueIndex("users_username_idx").on(t.username)]
);

/** A node in the knowledge tree: python itself, a package, a framework, ... */
export const nodes = sqliteTable(
  "nodes",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
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
    /** Extra important timestamps as JSON: [{ "date": "1995-01-01", "label": "1.0 release" }] */
    milestones: text("milestones", { mode: "json" }).$type<{ date: string; label: string }[]>(),

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
    visible: integer("visible", { mode: "boolean" }).notNull().default(true),

    createdBy: integer("created_by").references(() => users.id),
    createdAt: text("created_at").notNull().default(sql`(datetime('now'))`),
    updatedAt: text("updated_at").notNull().default(sql`(datetime('now'))`),
    publishedAt: text("published_at")
  },
  t => [uniqueIndex("nodes_slug_idx").on(t.slug), index("nodes_status_idx").on(t.status)]
);

/**
 * Parent/child edges. A node may have several parents (e.g. a framework
 * building on both `requests` and `asyncio`), so the tree is really a DAG.
 * `parent` is the thing being inherited from / built upon.
 */
export const nodeEdges = sqliteTable(
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
export const nodeLinks = sqliteTable(
  "node_links",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
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
