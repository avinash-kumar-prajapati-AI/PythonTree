import { Title } from "@solidjs/meta";
import { A, createAsync, useSubmission } from "@solidjs/router";
import { For, Show } from "solid-js";
import { adminNodesQuery, isAdminQuery, loginAction, logoutAction } from "~/server/api";
import { Layout } from "~/components/Layout";
import { Button } from "~/components/Button";

function Login() {
  const submission = useSubmission(loginAction);
  return (
    <div style={{ "max-width": "360px", margin: "4rem auto" }}>
      <h1>Admin sign in</h1>
      <form action={loginAction} method="post" class="form-grid">
        <label>
          Password
          <input type="password" name="password" autofocus />
        </label>
        <Show when={submission.result?.error}>
          <p class="error-text">{submission.result!.error}</p>
        </Show>
        <Button type="submit" busy={submission.pending}>
          Sign in
        </Button>
      </form>
    </div>
  );
}

function Dashboard() {
  const nodes = createAsync(() => adminNodesQuery());
  return (
    <div style={{ padding: "2rem 0 4rem" }}>
      <div style={{ display: "flex", "justify-content": "space-between", "align-items": "center" }}>
        <h1>Nodes</h1>
        <div style={{ display: "flex", gap: "0.7rem" }}>
          <A href="/admin/new">
            <Button>+ New node</Button>
          </A>
          <form action={logoutAction} method="post">
            <Button variant="ghost" type="submit">
              Sign out
            </Button>
          </form>
        </div>
      </div>
      <table class="admin-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Slug</th>
            <th>Status</th>
            <th>Visibility</th>
            <th>Updated</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          <For each={nodes() ?? []}>
            {node => (
              <tr>
                <td>{node.name}</td>
                <td>
                  <code>{node.slug}</code>
                </td>
                <td>
                  <span class={`status-badge status-${node.status}`}>{node.status}</span>
                </td>
                <td>{node.visible ? "visible" : <span class="status-badge status-hidden">hidden</span>}</td>
                <td style={{ color: "var(--text-dim)", "font-size": "0.85rem" }}>{node.updatedAt}</td>
                <td>
                  <A href={`/admin/edit/${node.slug}`}>Edit</A>
                </td>
              </tr>
            )}
          </For>
        </tbody>
      </table>
    </div>
  );
}

export default function AdminPage() {
  const admin = createAsync(() => isAdminQuery());
  return (
    <Layout>
      <Title>Admin — PythonTree</Title>
      <Show when={admin() !== undefined}>
        <Show when={admin()} fallback={<Login />}>
          <Dashboard />
        </Show>
      </Show>
    </Layout>
  );
}
