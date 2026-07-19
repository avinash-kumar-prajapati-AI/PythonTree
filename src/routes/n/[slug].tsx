import { Title } from "@solidjs/meta";
import { createAsync, useParams } from "@solidjs/router";
import { HttpStatusCode } from "@solidjs/start";
import { Show } from "solid-js";
import { nodeQuery } from "~/server/api";
import { Layout } from "~/components/Layout";
import { NodeDetail } from "~/components/NodeDetail";

export default function NodePage() {
  const params = useParams();
  const node = createAsync(() => nodeQuery(params.slug ?? ""));
  return (
    <Layout>
      <Show
        when={node()}
        fallback={
          <div style={{ "text-align": "center", padding: "4rem 0" }}>
            <HttpStatusCode code={404} />
            <h1>Node not found</h1>
            <p style={{ color: "var(--text-dim)" }}>
              This branch doesn't exist (or isn't published yet).
            </p>
          </div>
        }
      >
        {n => (
          <>
            <Title>{n().name} — PythonTree</Title>
            <NodeDetail node={n() as any} />
          </>
        )}
      </Show>
    </Layout>
  );
}
