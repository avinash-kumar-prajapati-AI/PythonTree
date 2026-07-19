import { Title } from "@solidjs/meta";
import { createAsync, Navigate } from "@solidjs/router";
import { Show } from "solid-js";
import { isAdminQuery } from "~/server/api";
import { Layout } from "~/components/Layout";
import { NodeForm } from "~/components/NodeForm";

export default function NewNodePage() {
  const admin = createAsync(() => isAdminQuery());
  return (
    <Layout>
      <Title>New node — PythonTree</Title>
      <Show when={admin() !== undefined}>
        <Show when={admin()} fallback={<Navigate href="/admin" />}>
          <h1 style={{ "margin-top": "2rem" }}>New node</h1>
          <NodeForm />
        </Show>
      </Show>
    </Layout>
  );
}
