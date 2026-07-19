/**
 * WebGL tree renderer (three.js, orthographic "2.5D" camera).
 *
 * Built for 10k+ nodes:
 * - one InstancedMesh for every node circle (a single draw call),
 * - one LineSegments geometry for every edge (a single draw call),
 * - hover hit-testing is a plain array scan (μs at 10k), no raycaster,
 * - text labels are a pooled HTML overlay shown only when zoomed in and
 *   only for nodes inside the viewport (capped), never 10k DOM nodes,
 * - rendering is on-demand (dirty flag), so an idle tree costs ~0 CPU/GPU.
 *
 * Interactions: drag to pan, wheel/pinch to zoom (cursor-anchored), hover
 * tooltip, click to open the node, search box with fly-to.
 */
import { createSignal, onCleanup, onMount, For, Show } from "solid-js";
import { useNavigate } from "@solidjs/router";
import * as THREE from "three";
import { treeLayoutQuery } from "~/server/api";

type LayoutNode = {
  id: number;
  slug: string;
  name: string;
  kind: string;
  year: number | null;
  x: number;
  y: number;
};

const KIND_COLORS: Record<string, string> = {
  language: "#4ade80",
  framework: "#38bdf8",
  package: "#fbbf24",
  library: "#a78bfa",
  module: "#34d399",
  concept: "#94a3b8"
};
const NODE_RADIUS = 8;
const LABEL_ZOOM = 1.1; // show labels when 1 world unit >= 1/LABEL_ZOOM px
const MAX_LABELS = 260;

export default function TreeCanvas() {
  const navigate = useNavigate();
  let container!: HTMLDivElement;
  let labelLayer!: HTMLDivElement;

  const [loading, setLoading] = createSignal(true);
  const [error, setError] = createSignal<string | null>(null);
  const [nodeCount, setNodeCount] = createSignal(0);
  const [hovered, setHovered] = createSignal<LayoutNode | null>(null);
  const [tooltipPos, setTooltipPos] = createSignal({ x: 0, y: 0 });
  const [searchText, setSearchText] = createSignal("");
  const [searchOpen, setSearchOpen] = createSignal(false);

  let treeNodes: LayoutNode[] = [];
  let flyTo: (node: LayoutNode) => void = () => {};
  let resetView: () => void = () => {};

  const matches = () => {
    const q = searchText().trim().toLowerCase();
    if (q.length < 2) return [];
    const out: LayoutNode[] = [];
    for (const n of treeNodes) {
      if (n.name.toLowerCase().includes(q) || n.slug.includes(q)) {
        out.push(n);
        if (out.length >= 8) break;
      }
    }
    return out;
  };

  onMount(async () => {
    let layout;
    try {
      layout = await treeLayoutQuery();
    } catch (e) {
      setError("Could not load the tree. Please refresh.");
      setLoading(false);
      return;
    }
    treeNodes = layout.nodes;
    setNodeCount(treeNodes.length);
    setLoading(false);
    if (!treeNodes.length) return;

    const N = treeNodes.length;
    const xs = new Float32Array(N);
    const ys = new Float32Array(N);
    treeNodes.forEach((n, i) => {
      xs[i] = n.x;
      ys[i] = n.y;
    });

    // ---------- three.js scene ----------
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);
    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 10);
    camera.position.z = 5;

    // edges — one geometry, one draw call
    const edgePos = new Float32Array(layout.edges.length * 3);
    for (let e = 0; e < layout.edges.length; e += 2) {
      const p = layout.edges[e];
      const c = layout.edges[e + 1];
      edgePos.set([xs[p], ys[p], 0, xs[c], ys[c], 0], e * 3);
    }
    const edgeGeo = new THREE.BufferGeometry();
    edgeGeo.setAttribute("position", new THREE.BufferAttribute(edgePos, 3));
    const edgeMat = new THREE.LineBasicMaterial({
      color: 0x2c4636,
      transparent: true,
      opacity: 0.55
    });
    scene.add(new THREE.LineSegments(edgeGeo, edgeMat));

    // nodes — instanced circles, one draw call
    const circleGeo = new THREE.CircleGeometry(NODE_RADIUS, 24);
    const nodeMat = new THREE.MeshBasicMaterial();
    const mesh = new THREE.InstancedMesh(circleGeo, nodeMat, N);
    const m = new THREE.Matrix4();
    const color = new THREE.Color();
    const baseScale = (i: number) => (treeNodes[i].kind === "language" ? 2.1 : 1);
    for (let i = 0; i < N; i++) {
      m.makeScale(baseScale(i), baseScale(i), 1).setPosition(xs[i], ys[i], 1);
      mesh.setMatrixAt(i, m);
      mesh.setColorAt(i, color.set(KIND_COLORS[treeNodes[i].kind] ?? "#9db8a9"));
    }
    scene.add(mesh);

    // ---------- camera state ----------
    let W = 1;
    let H = 1;
    let scale = 1; // world units per CSS pixel (smaller = zoomed in)
    let cx = 0;
    let cy = 0;
    let dirty = true;

    const minX = Math.min(...Array.from(xs)) - 60;
    const maxX = Math.max(...Array.from(xs)) + 60;
    const minY = Math.min(...Array.from(ys)) - 60;
    const maxY = Math.max(...Array.from(ys)) + 60;

    const applyCamera = () => {
      camera.left = cx - (W / 2) * scale;
      camera.right = cx + (W / 2) * scale;
      camera.top = cy + (H / 2) * scale;
      camera.bottom = cy - (H / 2) * scale;
      camera.updateProjectionMatrix();
      dirty = true;
    };

    resetView = () => {
      scale = Math.max((maxX - minX) / W, (maxY - minY) / H, 0.05);
      cx = (minX + maxX) / 2;
      cy = (minY + maxY) / 2;
      applyCamera();
    };

    flyTo = node => {
      cx = node.x;
      cy = node.y;
      scale = Math.min(scale, 0.6); // zoom in enough that labels are on
      applyCamera();
      setSearchOpen(false);
    };

    const resize = () => {
      W = container.clientWidth;
      H = container.clientHeight;
      renderer.setSize(W, H);
      applyCamera();
    };
    const ro = new ResizeObserver(() => resize());
    ro.observe(container);
    resize();
    resetView();

    const toWorld = (px: number, py: number) => ({
      x: cx + (px - W / 2) * scale,
      y: cy - (py - H / 2) * scale
    });
    const toScreen = (wx: number, wy: number) => ({
      x: (wx - cx) / scale + W / 2,
      y: H / 2 - (wy - cy) / scale
    });

    // ---------- label overlay (pooled) ----------
    const pool: HTMLDivElement[] = [];
    for (let i = 0; i < MAX_LABELS; i++) {
      const d = document.createElement("div");
      d.className = "tree3d-label";
      d.style.display = "none";
      labelLayer.appendChild(d);
      pool.push(d);
    }
    const updateLabels = () => {
      let used = 0;
      if (1 / scale >= LABEL_ZOOM) {
        for (let i = 0; i < N && used < MAX_LABELS; i++) {
          const s = toScreen(xs[i], ys[i]);
          if (s.x < -40 || s.x > W + 40 || s.y < 0 || s.y > H) continue;
          const d = pool[used++];
          d.textContent = treeNodes[i].name;
          d.style.display = "block";
          d.style.transform = `translate(${Math.round(s.x)}px, ${Math.round(
            s.y + NODE_RADIUS / scale + 4
          )}px) translateX(-50%)`;
        }
      }
      for (let i = used; i < MAX_LABELS; i++) pool[i].style.display = "none";
    };

    // ---------- interaction ----------
    let hoveredIdx = -1;
    const setHoverScale = (i: number, factor: number) => {
      m.makeScale(baseScale(i) * factor, baseScale(i) * factor, 1).setPosition(xs[i], ys[i], 1);
      mesh.setMatrixAt(i, m);
      mesh.instanceMatrix.needsUpdate = true;
      dirty = true;
    };
    const hitTest = (px: number, py: number) => {
      const w = toWorld(px, py);
      const r = Math.max(NODE_RADIUS * 2.2, 10 * scale); // generous target
      let best = -1;
      let bestD = r * r;
      for (let i = 0; i < N; i++) {
        const dx = xs[i] - w.x;
        const dy = ys[i] - w.y;
        const d = dx * dx + dy * dy;
        if (d < bestD) {
          bestD = d;
          best = i;
        }
      }
      return best;
    };

    let dragging = false;
    let moved = false;
    let lastX = 0;
    let lastY = 0;
    const canvas = renderer.domElement;

    const onPointerDown = (e: PointerEvent) => {
      dragging = true;
      moved = false;
      lastX = e.clientX;
      lastY = e.clientY;
      canvas.setPointerCapture(e.pointerId);
    };
    const onPointerMove = (e: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      const px = e.clientX - rect.left;
      const py = e.clientY - rect.top;
      if (dragging) {
        const dx = e.clientX - lastX;
        const dy = e.clientY - lastY;
        if (Math.abs(dx) + Math.abs(dy) > 2) moved = true;
        cx -= dx * scale;
        cy += dy * scale;
        lastX = e.clientX;
        lastY = e.clientY;
        applyCamera();
        return;
      }
      const hit = hitTest(px, py);
      if (hit !== hoveredIdx) {
        if (hoveredIdx >= 0) setHoverScale(hoveredIdx, 1);
        hoveredIdx = hit;
        if (hit >= 0) setHoverScale(hit, 1.5);
        setHovered(hit >= 0 ? treeNodes[hit] : null);
        canvas.style.cursor = hit >= 0 ? "pointer" : "grab";
      }
      if (hit >= 0) setTooltipPos({ x: px, y: py });
    };
    const onPointerUp = (e: PointerEvent) => {
      dragging = false;
      if (!moved && hoveredIdx >= 0) navigate(`/n/${treeNodes[hoveredIdx].slug}`);
    };
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const rect = canvas.getBoundingClientRect();
      const px = e.clientX - rect.left;
      const py = e.clientY - rect.top;
      const before = toWorld(px, py);
      const factor = Math.pow(1.0015, e.deltaY);
      scale = Math.min(Math.max(scale * factor, 0.03), Math.max((maxX - minX) / W, 1) * 2);
      // keep the point under the cursor fixed
      cx = before.x - (px - W / 2) * scale;
      cy = before.y + (py - H / 2) * scale;
      applyCamera();
    };
    const onLeave = () => {
      if (hoveredIdx >= 0) setHoverScale(hoveredIdx, 1);
      hoveredIdx = -1;
      setHovered(null);
    };

    canvas.style.cursor = "grab";
    canvas.style.touchAction = "none"; // enables pointer-based pinch/drag on touch
    canvas.addEventListener("pointerdown", onPointerDown);
    canvas.addEventListener("pointermove", onPointerMove);
    canvas.addEventListener("pointerup", onPointerUp);
    canvas.addEventListener("pointerleave", onLeave);
    canvas.addEventListener("wheel", onWheel, { passive: false });

    // ---------- render loop (on demand) ----------
    let raf = 0;
    const loop = () => {
      raf = requestAnimationFrame(loop);
      if (!dirty) return;
      dirty = false;
      renderer.render(scene, camera);
      updateLabels();
    };
    loop();

    onCleanup(() => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      canvas.removeEventListener("pointerdown", onPointerDown);
      canvas.removeEventListener("pointermove", onPointerMove);
      canvas.removeEventListener("pointerup", onPointerUp);
      canvas.removeEventListener("pointerleave", onLeave);
      canvas.removeEventListener("wheel", onWheel);
      edgeGeo.dispose();
      circleGeo.dispose();
      nodeMat.dispose();
      edgeMat.dispose();
      renderer.dispose();
      container.removeChild(canvas);
    });
  });

  return (
    <div class="tree3d-wrap">
      <div class="tree3d-toolbar">
        <div class="tree3d-search">
          <input
            type="text"
            placeholder={`Search ${nodeCount() || ""} nodes…`}
            value={searchText()}
            onInput={e => {
              setSearchText(e.currentTarget.value);
              setSearchOpen(true);
            }}
            onFocus={() => setSearchOpen(true)}
            onBlur={() => setTimeout(() => setSearchOpen(false), 150)}
          />
          <Show when={searchOpen() && matches().length}>
            <div class="tree3d-search-results">
              <For each={matches()}>
                {n => (
                  <button type="button" onClick={() => flyTo(n)}>
                    <span class="dot" style={{ background: KIND_COLORS[n.kind] ?? "#9db8a9" }} />
                    {n.name}
                    <span class="kind">{n.kind}</span>
                  </button>
                )}
              </For>
            </div>
          </Show>
        </div>
        <button type="button" class="btn btn-ghost" onClick={() => resetView()}>
          ⤢ Fit tree
        </button>
      </div>

      <div class="tree3d-legend">
        <For each={Object.entries(KIND_COLORS)}>
          {([kind, c]) => (
            <span>
              <span class="dot" style={{ background: c }} /> {kind}
            </span>
          )}
        </For>
      </div>

      <div class="tree3d-canvas" ref={container} />
      <div class="tree3d-labels" ref={labelLayer} />

      <Show when={hovered()}>
        {n => (
          <div
            class="tree3d-tooltip"
            style={{ transform: `translate(${tooltipPos().x + 14}px, ${tooltipPos().y + 8}px)` }}
          >
            <b>{n().name}</b>
            <span>
              {n().kind}
              {n().year ? ` · since ${n().year}` : ""} — click to read
            </span>
          </div>
        )}
      </Show>

      <Show when={loading()}>
        <p class="tree3d-status">Growing the tree…</p>
      </Show>
      <Show when={error()}>
        <p class="tree3d-status error-text">{error()}</p>
      </Show>
      <Show when={!loading() && !error() && nodeCount() === 0}>
        <p class="tree3d-status">The tree is empty — publish the first node from /admin.</p>
      </Show>

      <p class="tree3d-hint">drag to pan · scroll to zoom · click a node to read it</p>
    </div>
  );
}
