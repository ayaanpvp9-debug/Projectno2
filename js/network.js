/* ==========================================================================
   CHAPTER 03 — "Not magic. Mathematics."
   A hand-built SVG network: real weighted sums, ReLU hidden layers, softmax
   output, inspectable neurons and an animated forward pass.
   ========================================================================== */
import { gsap, ScrollTrigger, reduceMotion, seededRandom, clamp } from "./core.js";

const NS = "http://www.w3.org/2000/svg";

const LAYERS = [
  { name: "INPUT", nodes: 3, labels: ["x₁", "x₂", "x₃"] },
  { name: "HIDDEN 1", nodes: 4, labels: null },
  { name: "HIDDEN 2", nodes: 4, labels: null },
  { name: "OUTPUT", nodes: 2, labels: ["P(A)", "P(B)"] },
];

const relu = (z) => Math.max(0, z);
const softmax = (arr) => {
  const max = Math.max(...arr);
  const ex = arr.map((v) => Math.exp(v - max));
  const sum = ex.reduce((a, b) => a + b, 0) || 1;
  return ex.map((v) => v / sum);
};
const fmt = (v) => (v >= 0 ? " " : "") + v.toFixed(2);

export function initNetwork() {
  const svg = document.getElementById("nn-svg");
  const readout = document.getElementById("nn-readout");
  const runBtn = document.getElementById("nn-run");
  const randomBtn = document.getElementById("nn-randomise");
  if (!svg) return;

  const sliders = {
    x1: document.getElementById("nn-x1"),
    x2: document.getElementById("nn-x2"),
    x3: document.getElementById("nn-x3"),
  };
  const outs = {
    x1: document.getElementById("nn-x1-out"),
    x2: document.getElementById("nn-x2-out"),
    x3: document.getElementById("nn-x3-out"),
  };

  const inputs = [Number(sliders.x1?.value ?? 0.8), Number(sliders.x2?.value ?? 0.35), Number(sliders.x3?.value ?? 0.6)];

  /* -- weights ------------------------------------------------------------ */
  let random = seededRandom(9042);
  let weights = [];
  let biases = [];

  function randomiseWeights() {
    weights = [];
    biases = [];
    for (let l = 0; l < LAYERS.length - 1; l++) {
      const from = LAYERS[l].nodes;
      const to = LAYERS[l + 1].nodes;
      const W = [];
      const B = [];
      for (let j = 0; j < to; j++) {
        const row = [];
        for (let i = 0; i < from; i++) row.push(Math.round((random() * 2 - 1) * 100) / 100);
        W.push(row);
        B.push(Math.round((random() * 1.6 - 0.8) * 100) / 100);
      }
      weights.push(W);
      biases.push(B);
    }
  }
  randomiseWeights();

  /* -- forward maths ------------------------------------------------------ */
  function forward() {
    const acts = [inputs.slice()];
    const zs = [];
    for (let l = 0; l < weights.length; l++) {
      const z = [];
      const a = [];
      for (let j = 0; j < weights[l].length; j++) {
        let sum = biases[l][j];
        for (let i = 0; i < weights[l][j].length; i++) sum += weights[l][j][i] * acts[l][i];
        z.push(sum);
        a.push(l === weights.length - 1 ? sum : relu(sum)); // logits for the output layer
      }
      zs.push(z);
      acts.push(l === weights.length - 1 ? softmax(z) : a);
    }
    return { acts, zs };
  }

  /* -- DOM refs used by the drawing code ---------------------------------- */
  const nodeEls = []; // nodeEls[layer][index] = {group, core, value, cx, cy, r}
  const linkEls = []; // linkEls[layer][i] = {line, from, to, w}
  let signalEls = []; // signalEls[layer][i] = circle
  let assembled = false;
  let focus = null; // {layer, index}

  /* -- layout + build ----------------------------------------------------- */
  function build() {
    const isNarrow = window.matchMedia("(max-width: 900px)").matches;
    const vbW = isNarrow ? 560 : 900;
    const vbH = isNarrow ? 820 : 520;
    svg.setAttribute("viewBox", `0 0 ${vbW} ${vbH}`);
    svg.innerHTML = "";
    nodeEls.length = 0;
    linkEls.length = 0;
    signalEls = [];

    const positions = LAYERS.map((layer, l) => {
      const items = [];
      if (isNarrow) {
        const y = 104 + l * 214;
        const spacing = 74;
        const startX = vbW / 2 - ((layer.nodes - 1) * spacing) / 2;
        for (let i = 0; i < layer.nodes; i++) items.push({ x: startX + i * spacing, y });
      } else {
        const x = 92 + l * ((vbW - 184) / 3);
        const spacing = layer.nodes === 4 ? 80 : 92;
        const startY = 290 - ((layer.nodes - 1) * spacing) / 2;
        for (let i = 0; i < layer.nodes; i++) items.push({ x, y: startY + i * spacing });
      }
      return items;
    });

    const r = isNarrow ? 19 : 18;

    /* links */
    const linkGroup = document.createElementNS(NS, "g");
    svg.appendChild(linkGroup);

    for (let l = 0; l < LAYERS.length - 1; l++) {
      const layerLinks = [];
      for (let i = 0; i < positions[l].length; i++) {
        for (let j = 0; j < positions[l + 1].length; j++) {
          const a = positions[l][i];
          const b = positions[l + 1][j];
          const w = weights[l][j][i];
          const line = document.createElementNS(NS, "line");
          line.setAttribute("x1", a.x);
          line.setAttribute("y1", a.y);
          line.setAttribute("x2", b.x);
          line.setAttribute("y2", b.y);
          line.setAttribute("class", "nn-link");
          line.style.stroke = w >= 0 ? "#4b7dff" : "#8b5cf6";
          line.style.strokeWidth = String(0.4 + Math.min(2.2, Math.abs(w) * 2));
          line.style.opacity = String(0.1 + Math.abs(w) * 0.34);
          line.style.strokeDasharray = String(Math.hypot(b.x - a.x, b.y - a.y));
          line.style.strokeDashoffset = reduceMotion ? "0" : String(Math.hypot(b.x - a.x, b.y - a.y));
          linkGroup.appendChild(line);

          const sig = document.createElementNS(NS, "circle");
          sig.setAttribute("r", "2.8");
          sig.setAttribute("class", "nn-signal");
          sig.setAttribute("cx", a.x);
          sig.setAttribute("cy", a.y);
          sig.setAttribute("opacity", "0");
          svg.appendChild(sig);

          layerLinks.push({ line, from: a, to: b, w, sig, fromIndex: i, toIndex: j });
        }
      }
      linkEls.push(layerLinks);
    }

    /* nodes */
    LAYERS.forEach((layer, l) => {
      const group = document.createElementNS(NS, "g");
      // layer label
      const label = document.createElementNS(NS, "text");
      label.setAttribute("class", "nn-layer-label");
      const firstY = positions[l][0].y;
      if (isNarrow) {
        label.setAttribute("x", vbW / 2);
        label.setAttribute("y", firstY - 58);
      } else {
        label.setAttribute("x", positions[l][0].x);
        label.setAttribute("y", 74);
      }
      label.textContent = layer.name;
      group.appendChild(label);

      const layerNodes = [];
      positions[l].forEach((pos, i) => {
        const g = document.createElementNS(NS, "g");
        g.setAttribute("class", `nn-neuron${l === 0 ? " is-input" : ""}${l === LAYERS.length - 1 ? " is-output" : ""}`);
        g.setAttribute("tabindex", "0");
        g.setAttribute("role", "button");
        g.setAttribute(
          "aria-label",
          `${layer.name} node ${i + 1}. Press to inspect its weights and activation.`
        );
        g.dataset.layer = String(l);
        g.dataset.index = String(i);

        const halo = document.createElementNS(NS, "circle");
        halo.setAttribute("class", "nn-halo");
        halo.setAttribute("cx", pos.x);
        halo.setAttribute("cy", pos.y);
        halo.setAttribute("r", r + 8);

        const node = document.createElementNS(NS, "circle");
        node.setAttribute("class", "nn-node");
        node.setAttribute("cx", pos.x);
        node.setAttribute("cy", pos.y);
        node.setAttribute("r", r);

        const core = document.createElementNS(NS, "circle");
        core.setAttribute("r", String(r - 7));
        core.setAttribute("cx", pos.x);
        core.setAttribute("cy", pos.y);
        core.setAttribute("fill", "rgba(75,125,255,0.18)");

        const value = document.createElementNS(NS, "text");
        value.setAttribute("class", "nn-node-value");
        value.setAttribute("x", pos.x);
        value.setAttribute("y", pos.y + 3.5);
        value.textContent = l === 0 ? inputs[i].toFixed(2) : "0.00";

        g.append(halo, node, core, value);

        if (l === 0) {
          const lab = document.createElementNS(NS, "text");
          lab.setAttribute("class", "nn-input-label");
          lab.setAttribute("x", isNarrow ? pos.x : pos.x - r - 12);
          lab.setAttribute("y", isNarrow ? pos.y - r - 12 : pos.y);
          lab.setAttribute("text-anchor", isNarrow ? "middle" : "end");
          lab.textContent = layer.labels[i];
          g.appendChild(lab);
        }
        if (l === LAYERS.length - 1) {
          const lab = document.createElementNS(NS, "text");
          lab.setAttribute("class", "nn-output-tag");
          lab.setAttribute("x", isNarrow ? pos.x : pos.x + r + 12);
          lab.setAttribute("y", isNarrow ? pos.y + r + 18 : pos.y + 3);
          lab.setAttribute("text-anchor", isNarrow ? "middle" : "start");
          lab.textContent = layer.labels ? layer.labels[i] : "";
          g.appendChild(lab);
        }

        g.addEventListener("pointerenter", () => setFocus(l, i));
        g.addEventListener("click", (e) => {
          e.stopPropagation();
          setFocus(l, i, true);
        });
        g.addEventListener("focus", () => setFocus(l, i));
        g.addEventListener("blur", () => clearFocus());
        g.addEventListener("keydown", (e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setFocus(l, i, true);
          }
        });

        group.appendChild(g);
        layerNodes.push({ group: g, core, value, ...pos, r });
      });
      svg.appendChild(group);
      nodeEls.push(layerNodes);
    });

    if (!assembled) prepareAssembly();
    else {
      gsap.set([...svg.querySelectorAll(".nn-neuron"), ...svg.querySelectorAll(".nn-link")], {
        opacity: 1,
        scale: 1,
        strokeDashoffset: 0,
      });
      linkEls.flat().forEach((l) => (l.line.style.strokeDashoffset = "0"));
      refresh();
    }
  }

  /* -- assembly ----------------------------------------------------------- */
  function prepareAssembly() {
    const links = linkEls.flat().map((l) => l.line);
    if (reduceMotion) {
      links.forEach((l) => (l.style.strokeDashoffset = "0"));
      return;
    }
    nodeEls.flat().forEach((n) => {
      gsap.set(n.group, { opacity: 0, scale: 0.2, transformOrigin: "center" });
    });
    links.forEach((l) => {
      l.style.strokeDashoffset = l.style.strokeDasharray;
    });
  }

  /* -- state updates ------------------------------------------------------ */
  let current = forward();

  function refresh() {
    current = forward();
    const { acts } = current;
    nodeEls.forEach((layer, l) => {
      layer.forEach((n, i) => {
        const a = acts[l][i];
        n.value.textContent = l === 0 ? inputs[i].toFixed(2) : a.toFixed(2);
        const strength = l === LAYERS.length - 1 ? a : clamp(a / 1.5, 0, 1);
        n.core.setAttribute("fill", `rgba(75,125,255,${0.08 + strength * 0.42})`);
      });
    });
    if (focus) renderReadout(focus.layer, focus.index);
  }

  function clearFocus() {
    focus = null;
    svg.querySelectorAll(".nn-neuron").forEach((g) => g.classList.remove("is-focus", "is-muted"));
    linkEls.flat().forEach(({ line }) => line.classList.remove("is-dim", "is-toggle"));
    if (readout) {
      readout.innerHTML =
        '<span class="mini-label">INSPECT</span><p class="nn__readout-empty">Hover or tap any neuron to inspect its values and weights.</p>';
    }
  }

  function setFocus(l, i, lock) {
    focus = { layer: l, index: i };
    svg.querySelectorAll(".nn-neuron").forEach((g) => {
      const same = Number(g.dataset.layer) === l && Number(g.dataset.index) === i;
      g.classList.toggle("is-focus", same);
      g.classList.toggle("is-muted", !same && Number(g.dataset.layer) !== l);
    });

    linkEls.forEach((layerLinks, layerIdx) => {
      layerLinks.forEach((link) => {
        const connected = (layerIdx === l - 1 && link.toIndex === i) || (layerIdx === l && link.fromIndex === i);
        link.line.classList.toggle("is-toggle", connected);
        link.line.classList.toggle("is-dim", !connected);
      });
    });

    renderReadout(l, i, lock);
  }

  function renderReadout(l, i, locked) {
    if (!readout) return;
    const layer = LAYERS[l];
    const { acts, zs } = current;
    const isOutput = l === LAYERS.length - 1;
    const activation = acts[l][i];
    const z = l === 0 ? inputs[i] : zs[l - 1][i];

    let html = `<span class="mini-label">INSPECT${locked ? " · PINNED" : ""}</span>`;
    html += `<div class="nn__readout-title">${layer.name} · NODE 0${i + 1}</div>`;
    html += `<div class="nn__readout-sub">${
      l === 0 ? "INPUT VALUE" : isOutput ? "SOFTMAX PROBABILITY" : "ReLU ACTIVATION"
    }</div>`;

    if (l === 0) {
      html += `<div class="nn__kv"><span>value</span><span>${activation.toFixed(2)}</span></div>`;
    } else {
      html += `<div class="nn__kv"><span>z (weighted sum + bias)</span><span>${fmt(z)}</span></div>`;
      html += `<div class="nn__kv"><span>${isOutput ? "softmax" : "ReLU"}(z)</span><span>${activation.toFixed(3)}</span></div>`;
    }

    if (l > 0) {
      const ws = weights[l - 1][i];
      const bs = biases[l - 1][i];
      html += `<div class="nn__kv"><span>bias</span><span>${fmt(bs)}</span></div>`;
      html += '<div class="nn__weights">';
      ws.forEach((w, k) => {
        const fromValue = acts[l - 1][k];
        const contribution = w * fromValue;
        html += `<div class="nn__kv"><span>w${k + 1} · ${w >= 0 ? "+" : ""}${w.toFixed(2)}</span><span>${contribution >= 0 ? "+" : ""}${contribution.toFixed(3)}</span></div>`;
      });
      html += "</div>";
    }

    if (isOutput) {
      const p = acts[l];
      const winner = p[0] >= p[1] ? "A" : "B";
      html += `<div class="nn__kv"><span>prediction</span><span>CLASS ${winner}</span></div>`;
    }

    readout.innerHTML = html;
  }

  /* -- forward pass animation --------------------------------------------- */
  let passTimeline = null;
  function animatePass() {
    if (passTimeline) passTimeline.kill();
    refresh();
    if (reduceMotion) return;

    const tl = gsap.timeline({
      onComplete: () => {
        nodeEls[LAYERS.length - 1].forEach((n, i) => {
          gsap.fromTo(
            n.group,
            { scale: 1 },
            { scale: 1.16, duration: 0.18, yoyo: true, repeat: 1, transformOrigin: "center", delay: i * 0.08 }
          );
        });
      },
    });
    passTimeline = tl;

    linkEls.forEach((links, l) => {
      links.forEach((link, k) => {
        const start = l * 0.42 + k * 0.005;
        tl.set(link.sig, { attr: { cx: link.from.x, cy: link.from.y }, opacity: 0.9 }, start);
        tl.to(
          link.sig,
          { attr: { cx: link.to.x, cy: link.to.y }, duration: 0.34, ease: "power1.inOut" },
          start
        );
        tl.to(link.sig, { opacity: 0, duration: 0.12 }, start + 0.36);
        tl.to(link.line, { opacity: Math.min(0.9, 0.2 + Math.abs(link.w) * 0.6), duration: 0.1 }, start);
      });
    });
  }

  /* -- controls ----------------------------------------------------------- */
  Object.entries(sliders).forEach(([key, input]) => {
    if (!input) return;
    input.addEventListener("input", () => {
      inputs[Number(key.slice(1)) - 1] = Number(input.value);
      if (outs[key]) outs[key].textContent = Number(input.value).toFixed(2);
      refresh();
    });
  });

  if (runBtn) runBtn.addEventListener("click", animatePass);

  if (randomBtn) {
    randomBtn.addEventListener("click", () => {
      randomiseWeights();
      // Re-style every edge for the new weights (links are ordered i-major).
      for (let l = 0; l < LAYERS.length - 1; l++) {
        const toCount = LAYERS[l + 1].nodes;
        for (let i = 0; i < LAYERS[l].nodes; i++) {
          for (let j = 0; j < toCount; j++) {
            const link = linkEls[l][i * toCount + j];
            if (!link) continue;
            const w = weights[l][j][i];
            link.w = w;
            link.line.style.stroke = w >= 0 ? "#4b7dff" : "#8b5cf6";
            link.line.style.strokeWidth = String(0.4 + Math.min(2.2, Math.abs(w) * 2));
            link.line.style.opacity = String(0.1 + Math.abs(w) * 0.34);
          }
        }
      }
      animatePass();
    });
  }

  /* -- scroll assembly: the network draws itself as you scroll ------------- */
  build();
  refresh();

  function initScrollAssembly() {
    if (reduceMotion) {
      assembled = true;
      gsap.set(
        nodeEls.flat().map((n) => n.group),
        { opacity: 1, scale: 1 }
      );
      linkEls.flat().forEach((l) => (l.line.style.strokeDashoffset = "0"));
      return;
    }

    prepareAssembly();
    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: "#nn",
        start: "top 82%",
        end: "bottom 58%",
        scrub: 0.7,
      },
    });

    nodeEls.forEach((layer, l) => {
      tl.to(
        layer.map((n) => n.group),
        { opacity: 1, scale: 1, duration: 0.45, stagger: 0.05, ease: "power2.out" },
        l * 0.16
      );
    });
    linkEls.forEach((links, l) => {
      tl.to(
        links.map((k) => k.line.style),
        { strokeDashoffset: 0, duration: 0.4, stagger: 0.004, ease: "none" },
        0.12 + l * 0.16
      );
    });

    assembled = true;

    // One automatic forward pass once the network is fully drawn.
    ScrollTrigger.create({
      trigger: "#nn",
      start: "top 35%",
      once: true,
      onEnter: () => animatePass(),
    });
  }
  initScrollAssembly();

  // Rebuild on breakpoint changes (mobile ↔ desktop layout).
  let resizeTimer = 0;
  let lastNarrow = window.matchMedia("(max-width: 900px)").matches;
  window.addEventListener("resize", () => {
    window.clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(() => {
      const narrow = window.matchMedia("(max-width: 900px)").matches;
      if (narrow === lastNarrow) return;
      lastNarrow = narrow;
      build();
      refresh();
      if (assembled) gsap.set(nodeEls.flat().map((n) => n.group), { opacity: 1, scale: 1 });
    }, 260);
  });

  document.addEventListener("pointerdown", (e) => {
    if (!svg.contains(e.target) && focus) clearFocus();
  });
}
