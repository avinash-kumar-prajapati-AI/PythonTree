import { Title } from "@solidjs/meta";
import { createAsync, Navigate, useParams } from "@solidjs/router";
import { Show } from "solid-js";
import { adminNodeQuery, isAdminQuery } from "~/server/api";
import { Layout } from "~/components/Layout";
import { NodeForm } from "~/components/NodeForm";

export default function EditNodePage() {
  const params = useParams();
  const admin = createAsync(() => isAdminQuery());
  const node = createAsync(() => adminNodeQuery(params.slug ?? ""));
  return (
    <Layout>
      <Title>Edit node — PythonTree</Title>
      <Show when={admin() !== undefined}>
        <Show when={admin()} fallback={<Navigate href="/admin" />}>
          <Show when={node()} fallback={<p style={{ "margin-top": "2rem" }}>Node not found.</p>}>
            {n => (
              <>
                <h1 style={{ "margin-top": "2rem" }}>Edit: {n().name}</h1>
                <NodeForm node={n() as any} />
              </>
            )}
          </Show>
        </Show>
      </Show>
    </Layout>
  );
}
