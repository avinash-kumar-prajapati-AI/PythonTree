import { Title } from "@solidjs/meta";
import { A, createAsync, useParams } from "@solidjs/router";
import { Show } from "solid-js";
import { adminNodeQuery } from "~/server/api";
import { Layout } from "~/components/Layout";
import { AdminGuard } from "~/components/AdminGuard";
import { NodeDetail } from "~/components/NodeDetail";

/** Renders a node exactly as readers will see it, without publishing it. */
export default function PreviewNodePage() {
  const params = useParams();
  const node = createAsync(() => adminNodeQuery(params.slug ?? ""));
  return (
    <Layout>
      <Title>Preview — PythonTree</Title>
      <AdminGuard>
        <Show when={node()} fallback={<p style={{ "margin-top": "2rem" }}>Node not found.</p>}>
          {n => (
            <>
              <div style={{ "margin-top": "1rem" }}>
                <A href={`/admin/edit/${n().slug}`}>← Back to editor</A>
              </div>
              <NodeDetail node={n()} isPreview />
            </>
          )}
        </Show>
      </AdminGuard>
    </Layout>
  );
}
