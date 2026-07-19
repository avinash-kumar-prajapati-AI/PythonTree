import { Title } from "@solidjs/meta";
import { clientOnly } from "@solidjs/start";
import { Layout } from "~/components/Layout";

// WebGL renderer — browser-only (no SSR), and the node payload is fetched on
// the client so 10k+ nodes never bloat the HTML document itself.
const TreeCanvas = clientOnly(() => import("~/components/TreeCanvas"));

export default function Home() {
  return (
    <Layout>
      <Title>PythonTree — the growing map of the Python ecosystem</Title>
      <div style={{ "text-align": "center", "margin-top": "2rem" }}>
        <h1 style={{ "margin-bottom": "0.2em" }}>The Python ecosystem, as a growing tree</h1>
        <p style={{ color: "var(--text-dim)" }}>
          Python at the root; packages and frameworks branch out by lineage and time. Explore the
          canopy — click any node to read its story, setup guide and tutorial.
        </p>
      </div>
      <TreeCanvas fallback={<div class="tree3d-wrap"><p class="tree3d-status">Growing the tree…</p></div>} />
    </Layout>
  );
}
