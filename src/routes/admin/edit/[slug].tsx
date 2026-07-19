import { Title } from "@solidjs/meta";
import { createAsync, useParams } from "@solidjs/router";
import { Show } from "solid-js";
import { adminNodeQuery } from "~/server/api";
import { Layout } from "~/components/Layout";
import { AdminGuard } from "~/components/AdminGuard";
import { NodeForm } from "~/components/NodeForm";

export default function EditNodePage() {
  const params = useParams();
  const node = createAsync(() => adminNodeQuery(params.slug ?? ""));
  return (
    <Layout>
      <Title>Edit node — PythonTree</Title>
      <AdminGuard>
        <Show when={node()} fallback={<p style={{ "margin-top": "2rem" }}>Node not found.</p>}>
          {n => (
            <>
              <h1 style={{ "margin-top": "2rem" }}>Edit: {n().name}</h1>
              <NodeForm node={n()} />
            </>
          )}
        </Show>
      </AdminGuard>
    </Layout>
  );
}
