import { createSignal, Show, type Component } from "solid-js";
import { useAction, useNavigate } from "@solidjs/router";
import {
  createNodeAction,
  updateNodeAction,
  setStatusAction,
  setVisibilityAction
} from "~/server/api";
import type { NodeInput } from "~/server/repo/nodes";
import { Button } from "./Button";

type Existing = {
  id: number;
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
  links: { kind: string; label: string; url: string }[];
  parents: { slug: string }[];
};

/**
 * Create/edit form implementing the lifecycle:
 *   Save draft -> Preview (still not in the tree) -> Publish (confirmed).
 * Published nodes lose the publish/draft controls and gain only
 * Save changes + Hide/Unhide. Deletion does not exist.
 */
export const NodeForm: Component<{ node?: Existing }> = props => {
  const navigate = useNavigate();
  const createNode = useAction(createNodeAction);
  const updateNode = useAction(updateNodeAction);
  const setStatus = useAction(setStatusAction);
  const setVisibility = useAction(setVisibilityAction);

  const n = props.node;
  const [busy, setBusy] = createSignal<string | null>(null);
  const [error, setError] = createSignal<string | null>(null);
  const [nodeId, setNodeId] = createSignal<number | null>(n?.id ?? null);
  const [status, setStatusSig] = createSignal(n?.status ?? "draft");
  const [visible, setVisibleSig] = createSignal(n?.visible ?? true);

  const [name, setName] = createSignal(n?.name ?? "");
  const [slug, setSlug] = createSignal(n?.slug ?? "");
  const [kind, setKind] = createSignal(n?.kind ?? "package");
  const [summary, setSummary] = createSignal(n?.summary ?? "");
  const [launchedAt, setLaunchedAt] = createSignal(n?.launchedAt ?? "");
  const [launchedBy, setLaunchedBy] = createSignal(n?.launchedBy ?? "");
  const [ownership, setOwnership] = createSignal(n?.ownership ?? "opensource");
  const [license, setLicense] = createSignal(n?.license ?? "");
  const [parents, setParents] = createSignal(n?.parents.map(p => p.slug).join(", ") ?? "");
  const [milestones, setMilestones] = createSignal(
    (n?.milestones ?? []).map(m => `${m.date} | ${m.label}`).join("\n")
  );
  const [links, setLinks] = createSignal(
    (n?.links ?? []).map(l => `${l.kind} | ${l.label} | ${l.url}`).join("\n")
  );
  const [installGuide, setInstallGuide] = createSignal(n?.installGuide ?? "");
  const [tutorial, setTutorial] = createSignal(n?.tutorial ?? "");
  const [commonFunctions, setCommonFunctions] = createSignal(n?.commonFunctions ?? "");

  const collect = (): NodeInput => ({
    slug: slug().trim() || name().trim().toLowerCase().replace(/[^a-z0-9]+/g, "-"),
    name: name().trim(),
    kind: kind() as NodeInput["kind"],
    summary: summary().trim(),
    launchedAt: launchedAt() || null,
    launchedBy: launchedBy().trim() || null,
    ownership: ownership() as NodeInput["ownership"],
    license: license().trim() || null,
    milestones: milestones()
      .split("\n")
      .map(l => l.trim())
      .filter(Boolean)
      .map(l => {
        const [date, ...rest] = l.split("|");
        return { date: date.trim(), label: rest.join("|").trim() };
      }),
    parentSlugs: parents()
      .split(",")
      .map(s => s.trim())
      .filter(Boolean),
    links: links()
      .split("\n")
      .map(l => l.trim())
      .filter(Boolean)
      .map(l => {
        const [kind, label, ...rest] = l.split("|");
        return {
          kind: kind.trim() as any,
          label: (label ?? "").trim(),
          url: rest.join("|").trim()
        };
      }),
    installGuide: installGuide(),
    tutorial: tutorial(),
    commonFunctions: commonFunctions()
  });

  /** Saves the current fields; creates the node on first save. Returns id. */
  const save = async (): Promise<number> => {
    const input = collect();
    if (!input.name) throw new Error("Name is required");
    const id = nodeId();
    if (id === null) {
      const res = await createNode(input);
      setNodeId(res.id);
      setSlug(res.slug);
      return res.id;
    }
    await updateNode(id, input);
    return id;
  };

  const run = async (label: string, fn: () => Promise<void>) => {
    if (busy()) return; // double-click guard on top of the disabled state
    setBusy(label);
    setError(null);
    try {
      await fn();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  };

  const onSaveDraft = () =>
    run("save", async () => {
      await save();
    });

  const onPreview = () =>
    run("preview", async () => {
      const id = await save();
      if (status() === "draft") {
        await setStatus(id, "preview");
        setStatusSig("preview");
      }
      navigate(`/admin/preview/${collect().slug}`);
    });

  const onPublish = () =>
    run("publish", async () => {
      if (
        !window.confirm(
          "Publish this node to the tree?\n\nOnce published it can be edited or hidden, but NEVER deleted."
        )
      )
        return;
      const id = await save();
      await setStatus(id, "published");
      setStatusSig("published");
      navigate(`/n/${collect().slug}`);
    });

  const onToggleVisible = () =>
    run("visible", async () => {
      const id = nodeId();
      if (id === null) return;
      await setVisibility(id, !visible());
      setVisibleSig(!visible());
    });

  return (
    <div class="form-grid" style={{ margin: "1.5rem 0 4rem" }}>
      <div style={{ display: "flex", gap: "0.6rem", "align-items": "center" }}>
        <span class={`status-badge status-${status()}`}>{status()}</span>
        <Show when={status() === "published" && !visible()}>
          <span class="status-badge status-hidden">hidden</span>
        </Show>
      </div>

      <div style={{ display: "grid", "grid-template-columns": "2fr 1fr 1fr", gap: "0.9rem" }}>
        <label>
          Name *
          <input type="text" value={name()} onInput={e => setName(e.currentTarget.value)} />
        </label>
        <label>
          Slug {status() === "published" ? "(frozen after publish)" : "(auto from name if empty)"}
          <input
            type="text"
            value={slug()}
            disabled={status() === "published"}
            onInput={e => setSlug(e.currentTarget.value)}
          />
        </label>
        <label>
          Kind
          <select value={kind()} onChange={e => setKind(e.currentTarget.value)}>
            <option value="language">language</option>
            <option value="package">package</option>
            <option value="framework">framework</option>
            <option value="library">library</option>
            <option value="module">module</option>
            <option value="concept">concept</option>
          </select>
        </label>
      </div>

      <label>
        Summary
        <input type="text" value={summary()} onInput={e => setSummary(e.currentTarget.value)} />
      </label>

      <div style={{ display: "grid", "grid-template-columns": "repeat(4, 1fr)", gap: "0.9rem" }}>
        <label>
          Launched on
          <input type="date" value={launchedAt()} onInput={e => setLaunchedAt(e.currentTarget.value)} />
        </label>
        <label>
          Launched by / owner
          <input type="text" value={launchedBy()} onInput={e => setLaunchedBy(e.currentTarget.value)} />
        </label>
        <label>
          Ownership
          <select value={ownership()} onChange={e => setOwnership(e.currentTarget.value)}>
            <option value="opensource">opensource</option>
            <option value="company">company</option>
            <option value="individual">individual</option>
            <option value="foundation">foundation</option>
          </select>
        </label>
        <label>
          License
          <input type="text" value={license()} onInput={e => setLicense(e.currentTarget.value)} />
        </label>
      </div>

      <label>
        Parents (comma-separated slugs — what this grows from, e.g. <code>python, math</code>)
        <input type="text" value={parents()} onInput={e => setParents(e.currentTarget.value)} />
      </label>

      <label>
        Important timestamps — one per line: <code>YYYY-MM-DD | label</code>
        <textarea value={milestones()} onInput={e => setMilestones(e.currentTarget.value)} />
      </label>

      <label>
        Links — one per line: <code>kind | label | url</code> (kinds: github, discord, forum, pypi,
        docs, website, custom)
        <textarea value={links()} onInput={e => setLinks(e.currentTarget.value)} />
      </label>

      <label>
        Installation / setup guide (markdown)
        <textarea rows={8} value={installGuide()} onInput={e => setInstallGuide(e.currentTarget.value)} />
      </label>
      <label>
        Tutorial (markdown)
        <textarea rows={8} value={tutorial()} onInput={e => setTutorial(e.currentTarget.value)} />
      </label>
      <label>
        Often-used functions &amp; examples (markdown)
        <textarea rows={8} value={commonFunctions()} onInput={e => setCommonFunctions(e.currentTarget.value)} />
      </label>

      <Show when={error()}>
        <p class="error-text">{error()}</p>
      </Show>

      <div style={{ display: "flex", gap: "0.7rem", "flex-wrap": "wrap" }}>
        <Show
          when={status() !== "published"}
          fallback={
            <>
              <Button busy={busy() === "save"} disabled={!!busy()} onClick={onSaveDraft}>
                Save changes
              </Button>
              <Button
                variant={visible() ? "danger" : "secondary"}
                busy={busy() === "visible"}
                disabled={!!busy()}
                onClick={onToggleVisible}
              >
                {visible() ? "Hide from tree" : "Unhide (show in tree)"}
              </Button>
            </>
          }
        >
          <Button variant="secondary" busy={busy() === "save"} disabled={!!busy()} onClick={onSaveDraft}>
            Save draft
          </Button>
          <Button variant="secondary" busy={busy() === "preview"} disabled={!!busy()} onClick={onPreview}>
            Save &amp; preview
          </Button>
          <Button busy={busy() === "publish"} disabled={!!busy()} onClick={onPublish}>
            Publish to tree
          </Button>
        </Show>
      </div>
      <p style={{ color: "var(--text-dim)", "font-size": "0.85rem" }}>
        Draft and preview never touch the public tree. Publishing is permanent: a published node can
        be edited or hidden, but never deleted.
      </p>
    </div>
  );
};
