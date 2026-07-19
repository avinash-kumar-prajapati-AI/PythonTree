/**
 * Server API exposed to the client as SolidStart server functions.
 * Reads are `query`s (cached, revalidatable); writes are `action`s.
 * Every write is admin-guarded. There is intentionally no delete action.
 */
import { query, action, redirect } from "@solidjs/router";
import {
  getPublishedTree,
  getNodeBySlug,
  listAllNodes,
  createNode,
  updateNode,
  setStatus,
  setVisibility,
  type NodeInput
} from "./repo/nodes";
import { getTreeLayout } from "./repo/treeLayout";
import { login, logout, isAdmin, requireAdmin } from "./session";

// ---------- public reads ----------

export const treeQuery = query(async () => {
  "use server";
  return getPublishedTree();
}, "tree");

/** Compact, server-cached layout for the WebGL tree — scales to 10k+ nodes. */
export const treeLayoutQuery = query(async () => {
  "use server";
  return getTreeLayout();
}, "treeLayout");

export const nodeQuery = query(async (slug: string) => {
  "use server";
  return getNodeBySlug(slug);
}, "node");

// ---------- admin reads ----------

export const isAdminQuery = query(async () => {
  "use server";
  return isAdmin();
}, "isAdmin");

export const adminNodesQuery = query(async () => {
  "use server";
  await requireAdmin();
  return listAllNodes();
}, "adminNodes");

export const adminNodeQuery = query(async (slug: string) => {
  "use server";
  await requireAdmin();
  return getNodeBySlug(slug, { includeUnpublished: true });
}, "adminNode");

// ---------- auth ----------

export const loginAction = action(async (form: FormData) => {
  "use server";
  const ok = await login(String(form.get("password") ?? ""));
  if (!ok) return { error: "Wrong password" };
  throw redirect("/admin");
}, "login");

export const logoutAction = action(async () => {
  "use server";
  await logout();
  throw redirect("/");
}, "logout");

// ---------- admin writes (create / edit / publish / hide — never delete) ----------

export const createNodeAction = action(async (input: NodeInput) => {
  "use server";
  await requireAdmin();
  const row = await createNode(input);
  return { id: row.id, slug: row.slug };
}, "createNode");

export const updateNodeAction = action(async (id: number, input: Partial<NodeInput>) => {
  "use server";
  await requireAdmin();
  await updateNode(id, input);
  return { ok: true };
}, "updateNode");

export const setStatusAction = action(
  async (id: number, status: "draft" | "preview" | "published") => {
    "use server";
    await requireAdmin();
    await setStatus(id, status);
    return { ok: true };
  },
  "setStatus"
);

export const setVisibilityAction = action(async (id: number, visible: boolean) => {
  "use server";
  await requireAdmin();
  await setVisibility(id, visible);
  return { ok: true };
}, "setVisibility");
