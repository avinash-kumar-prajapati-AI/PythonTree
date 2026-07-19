import { Title } from "@solidjs/meta";
import { A, createAsync, Navigate, useParams } from "@solidjs/router";
import { Show } from "solid-js";
import { adminNodeQuery, isAdminQuery } from "~/server/api";
import { Layout } from "~/components/Layout";
import { NodeDetail } from "~/components/NodeDetail";

/** Renders a node exactly as readers will see it, without publishing it. */
export default function PreviewNodePage() {
  const params = useParams();
  const admin = createAsync(() => isAdminQuery());
  const node = createAsync(() => adminNodeQuery(params.slug ?? ""));
  return (
    <Layout>
      <Title>Preview — PythonTree</Title>
      <Show when={admin() !== undefined}>
        <Show when={admin()} fallback={<Navigate href="/admin" />}>
          <Show when={node()} fallback={<p style={{ "margin-top": "2rem" }}>Node not found.</p>}>
            {n => (
              <>
                <div style={{ "margin-top": "1rem" }}>
                  <A href={`/admin/edit/${n().slug}`}>← Back to editor</A>
                </div>
                <NodeDetail node={n() as any} isPreview />
              </>
            )}
          </Show>
        </Show>
      </Show>
    </Layout>
  );
}
