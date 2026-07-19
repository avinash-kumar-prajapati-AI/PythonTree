import { Title } from "@solidjs/meta";
import { Layout } from "~/components/Layout";
import { AdminGuard } from "~/components/AdminGuard";
import { NodeForm } from "~/components/NodeForm";

export default function NewNodePage() {
  return (
    <Layout>
      <Title>New node — PythonTree</Title>
      <AdminGuard>
        <h1 style={{ "margin-top": "2rem" }}>New node</h1>
        <NodeForm />
      </AdminGuard>
    </Layout>
  );
}
