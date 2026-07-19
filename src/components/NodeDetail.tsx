import { For, Show, type Component } from "solid-js";
import { A } from "@solidjs/router";
import { Markdown } from "./Markdown";
import { ShareButton } from "./ShareButton";

const LINK_ICONS: Record<string, string> = {
  github: "🐙",
  discord: "💬",
  forum: "🗣️",
  pypi: "📦",
  docs: "📚",
  website: "🌐",
  custom: "🔗"
};

type Detail = {
  slug: string;
  name: string;
  kind: string;
  summary: string;
  launchedAt: string | null;
  launchedBy: string | null;
  ownership: string;
  license: string | null;
  milestones: { date: string; label: string }[] | null;
  installGuide: string;
  tutorial: string;
  commonFunctions: string;
  status: string;
  visible: boolean;
  publishedAt: string | null;
  links: { id: number; kind: string; label: string; url: string }[];
  parents: { slug: string; name: string }[];
  children: { slug: string; name: string }[];
};

export const NodeDetail: Component<{ node: Detail; isPreview?: boolean }> = props => {
  const n = () => props.node;
  return (
    <article class="node-page">
      <Show when={props.isPreview}>
        <div class="notice">
          Preview mode — this node is <span class={`status-badge status-${n().status}`}>{n().status}</span> and{" "}
          {n().status === "published" ? "is" : "is not yet"} part of the public tree.
        </div>
      </Show>

      <div class="node-head">
        <div>
          <div class="node-kind" style={{ "text-transform": "uppercase", color: "var(--accent)", "font-size": "0.8rem" }}>
            {n().kind}
          </div>
          <h1 style={{ margin: "0.1em 0" }}>{n().name}</h1>
          <p style={{ color: "var(--text-dim)", margin: "0.3em 0 0" }}>{n().summary}</p>
        </div>
        <ShareButton title={`${n().name} — PythonTree`} path={`/n/${n().slug}`} />
      </div>

      <div class="node-meta">
        <Show when={n().launchedAt}>
          <span>
            Launched <b>{n().launchedAt}</b>
          </span>
        </Show>
        <Show when={n().launchedBy}>
          <span>
            by <b>{n().launchedBy}</b>
          </span>
        </Show>
        <span>
          Ownership <b>{n().ownership}</b>
        </span>
        <Show when={n().license}>
          <span>
            License <b>{n().license}</b>
          </span>
        </Show>
        <Show when={n().publishedAt}>
          <span title="When this node was published on PythonTree — not the package's own launch date">
            On PythonTree since <b>{n().publishedAt!.slice(0, 10)}</b>
          </span>
        </Show>
      </div>

      <div class="pill-row">
        <For each={n().links}>
          {l => (
            <a class="pill" href={l.url} target="_blank" rel="noopener noreferrer">
              {LINK_ICONS[l.kind] ?? "🔗"} {l.label}
            </a>
          )}
        </For>
      </div>

      <Show when={n().parents.length || n().children.length}>
        <div class="pill-row" style={{ "font-size": "0.9rem" }}>
          <For each={n().parents}>
            {p => (
              <A class="pill" href={`/n/${p.slug}`}>
                ⬇ grows from {p.name}
              </A>
            )}
          </For>
          <For each={n().children}>
            {c => (
              <A class="pill" href={`/n/${c.slug}`}>
                ⬆ branch: {c.name}
              </A>
            )}
          </For>
        </div>
      </Show>

      <Show when={n().milestones?.length}>
        <section class="section-card">
          <h2>Important timestamps</h2>
          <ul>
            <For each={n().milestones!}>
              {m => (
                <li>
                  <b>{m.date}</b> — {m.label}
                </li>
              )}
            </For>
          </ul>
        </section>
      </Show>

      <Show when={n().installGuide}>
        <section class="section-card">
          <h2>Installation &amp; setup</h2>
          <Markdown source={n().installGuide} />
        </section>
      </Show>

      <Show when={n().tutorial}>
        <section class="section-card">
          <h2>Tutorial</h2>
          <Markdown source={n().tutorial} />
        </section>
      </Show>

      <Show when={n().commonFunctions}>
        <section class="section-card">
          <h2>Often-used functions &amp; examples</h2>
          <Markdown source={n().commonFunctions} />
        </section>
      </Show>
    </article>
  );
};
