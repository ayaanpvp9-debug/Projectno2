/* ==========================================================================
   CHAPTER 01 — "Intelligence, Engineered"
   Pinned ruins-vs-learning sequence + a live "learn by example" experiment
   (a polynomial logistic regression trained in the browser).
   ========================================================================== */
import { gsap, ScrollTrigger, reduceMotion, seededRandom, clamp, scroll } from "./core.js";

/* --------------------------------------------------------------------------
   Copy that follows the scroll position
   -------------------------------------------------------------------------- */
const CAPTIONS = [
  {
    from: 0,
    to: 0.13,
    text: "A programmer writes the rules. The computer applies them, exactly, to every input.",
  },
  {
    from: 0.13,
    to: 0.25,
    text: "The rules are explicit — conditions a human wrote down, one line at a time. Every edge case is somebody's job.",
  },
  {
    from: 0.25,
    to: 0.34,
    text: "Same input, same rules, same output. Nothing here is learned. Add a case nobody anticipated and it fails.",
  },
  {
    from: 0.34,
    to: 0.47,
    text: "Now take the rules away. Give the computer examples instead: inputs paired with the right answers.",
  },
  {
    from: 0.47,
    to: 0.63,
    text: "Training compares the model's guesses with the real answers, then nudges thousands of internal numbers.",
  },
   {
    from: 0.63,
    to: 1.01,
    text: "What comes out is a learned model: not a rule you can read, but a function that generalises to new inputs.",
  },
];

const TRAD_STEPS = ["Inputs arrive", "Rules are applied", "An output is produced"];
const LEARN_STEPS = ["Examples are gathered", "Weights are adjusted", "A model is produced"];

/* --------------------------------------------------------------------------
   Pinned sequence
   -------------------------------------------------------------------------- */
function initSequence() {
  const pin = document.getElementById("c1-pin");
  const trad = document.getElementById("c1-svg-traditional");
  const learn = document.getElementById("c1-svg-learning");
  const caption = document.getElementById("c1-caption");
  const progressFill = document.getElementById("c1-progress-fill");
  const eqKey = document.querySelector(".c1-eq__k");
  const eqVal = document.querySelector(".c1-eq__v");
  const steps = [...document.querySelectorAll("#c1-steps li")];
  const tabs = [...document.querySelectorAll(".c1-tab")];
  if (!pin || !trad || !learn) return;

  const tradLayers = [...trad.querySelectorAll(".c1-layer")];
  const learnLayers = [...learn.querySelectorAll(".c1-layer")];
  const tradWires = [...trad.querySelectorAll(".c1-wire")];
  const learnWires = [...learn.querySelectorAll(".c1-wire")];

  const allWires = [...tradWires, ...learnWires];
  allWires.forEach((wire) => {
    const len = wire.getTotalLength ? wire.getTotalLength() : 200;
    wire.style.strokeDasharray = String(len);
    wire.style.strokeDashoffset = String(len);
  });

  gsap.set(tradLayers, { opacity: 0, y: 10 });
  gsap.set(learnLayers, { opacity: 0, y: 10 });
  gsap.set(learn, { opacity: 0 });

  if (reduceMotion) {
    // Reduced motion: both diagrams exist side by side in time, swapped by the
    // tabs. No scrubbing, no drawing animation — but nothing is missing.
    gsap.set(trad, { opacity: 1 });
    gsap.set(tradLayers, { opacity: 1, y: 0 });
    gsap.set(allWires, { strokeDashoffset: 0 });

    const setStaticPhase = (phase) => {
      const traditional = phase === "traditional";
      gsap.set(trad, { opacity: traditional ? 1 : 0 });
      gsap.set(learn, { opacity: traditional ? 0 : 1 });
      if (traditional) gsap.set([tradLayers, tradWires], { opacity: 1, y: 0 });
      else gsap.set([learnLayers, learnWires], { opacity: 1, y: 0 });
      const labels = traditional ? TRAD_STEPS : LEARN_STEPS;
      tabs.forEach((t, i) => {
        const on = t.dataset.approach === phase;
        t.classList.toggle("is-active", on);
        t.setAttribute("aria-selected", String(on));
      });
      steps.forEach((li, i) => {
        li.innerHTML = `<span>0${i + 1}</span>${labels[i]}`;
        li.classList.toggle("is-active", traditional ? i === 2 : i === 2);
      });
      if (eqKey) eqKey.textContent = traditional ? "TRADITIONAL" : "MACHINE LEARNING";
      if (eqVal) {
        eqVal.textContent = traditional
          ? "INPUT + RULES → OUTPUT"
          : "INPUT + EXAMPLES → LEARNED MODEL";
      }
      if (caption) {
        caption.textContent = traditional
          ? CAPTIONS[0].text
          : CAPTIONS[CAPTIONS.length - 1].text;
      }
    };

    tabs.forEach((tab) =>
      tab.addEventListener("click", () => setStaticPhase(tab.dataset.approach))
    );
    setStaticPhase("traditional");
    return;
  }

  // The comparison is held in place by a CSS sticky track, so no pinning:
  // ScrollTrigger only reads progress and scrubs the diagrams.
  const tl = gsap.timeline({
    defaults: { ease: "none" },
    scrollTrigger: {
      trigger: document.getElementById("c1-scroll") || pin,
      start: "top top",
      end: "bottom bottom",
      scrub: 0.55,
      invalidateOnRefresh: true,
      onUpdate: (self) => updateCopy(self.progress),
    },
  });

  tl.addLabel("trad", 0)
    .set(trad, { opacity: 1 }, 0)
    .to(tradLayers[0], { opacity: 1, y: 0, duration: 0.06 }, 0.01)
    .to(tradWires[0], { strokeDashoffset: 0, duration: 0.07 }, 0.09)
    .to(tradLayers[1], { opacity: 1, y: 0, duration: 0.06 }, 0.12)
    .to(tradWires[1], { strokeDashoffset: 0, duration: 0.07 }, 0.21)
    .to(tradLayers[2], { opacity: 1, y: 0, duration: 0.06 }, 0.25)
    .to({}, { duration: 0.06 }, 0.31)
    // Swap: rules give way to examples.
    .to(trad, { opacity: 0, duration: 0.05 }, 0.34)
    .set(learn, { opacity: 1 }, 0.36)
    .to(learnLayers[0], { opacity: 1, y: 0, duration: 0.06 }, 0.37)
    .to(learnWires[0], { strokeDashoffset: 0, duration: 0.07 }, 0.46)
    .to(learnLayers[1], { opacity: 1, y: 0, duration: 0.06 }, 0.49)
    .to(learnWires[1], { strokeDashoffset: 0, duration: 0.07 }, 0.6)
    .to(learnLayers[2], { opacity: 1, y: 0, duration: 0.06 }, 0.63)
    .to({}, { duration: 0.3 }, 0.7);

  // Chips inside the "examples" box
  const chipGroup = document.getElementById("c1-chips");
  if (chipGroup) {
    const ns = "http://www.w3.org/2000/svg";
    for (let i = 0; i < 12; i++) {
      const c = document.createElementNS(ns, "circle");
      c.setAttribute("cx", String(48 + (i % 4) * 30));
      c.setAttribute("cy", String(300 + Math.floor(i / 4) * 16));
      c.setAttribute("r", "3.4");
      if (i % 3 === 0) c.setAttribute("class", "neg");
      chipGroup.appendChild(c);
    }
    gsap.set(chipGroup.children, { opacity: 0, scale: 0.4 });
    tl.to(chipGroup.children, { opacity: 0.85, scale: 1, duration: 0.05, stagger: 0.006 }, 0.4);
  }

  let lastPhase = null;
  function updateCopy(p) {
    if (progressFill) progressFill.style.width = (clamp(p, 0, 1) * 100).toFixed(1) + "%";

    const phase = p < 0.34 ? "traditional" : "learning";
    if (phase !== lastPhase) {
      lastPhase = phase;
      tabs.forEach((t) => {
        const on = t.dataset.approach === phase;
        t.classList.toggle("is-active", on);
        t.setAttribute("aria-selected", String(on));
      });
      const labels = phase === "traditional" ? TRAD_STEPS : LEARN_STEPS;
      steps.forEach((li, i) => {
        li.innerHTML = `<span>0${i + 1}</span>${labels[i]}`;
      });
      if (eqKey) eqKey.textContent = phase === "traditional" ? "TRADITIONAL" : "MACHINE LEARNING";
      if (eqVal) {
        eqVal.textContent =
          phase === "traditional"
            ? "INPUT + RULES → OUTPUT"
            : "INPUT + EXAMPLES → LEARNED MODEL";
      }
    }

    const activeStep = p < 0.12 ? 0 : p < 0.25 ? 1 : 2;
    steps.forEach((li, i) => li.classList.toggle("is-active", i === activeStep));

    const entry = CAPTIONS.find((c) => p >= c.from && p < c.to);
    if (entry && caption && caption.textContent !== entry.text) caption.textContent = entry.text;
  }

  updateCopy(0);

  // Tabs navigate the sequence by scrolling to the matching progress point.
  tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      const st = tl.scrollTrigger;
      if (!st) return;
      const target = tab.dataset.approach === "traditional" ? 0.02 : 0.55;
      const y = st.start + (st.end - st.start) * target;
      scroll.toY(y);
    });
  });
}

/* --------------------------------------------------------------------------
   Experiment 01 — learn by example
   -------------------------------------------------------------------------- */
function initDemo() {
  const svg = document.getElementById("c1-demo-svg");
  const pointGroup = document.getElementById("c1-demo-points");
  const gridGroup = document.getElementById("c1-demo-grid");
  const learnedPath = document.getElementById("c1-demo-learned");
  const rulePath = document.getElementById("c1-demo-rule");
  const slider = document.getElementById("c1-demo-n");
  const sliderOut = document.getElementById("c1-demo-n-out");
  const retrainBtn = document.getElementById("c1-demo-retrain");
  const ruleAccEl = document.getElementById("c1-demo-rule-acc");
  const learnedAccEl = document.getElementById("c1-demo-learned-acc");
  if (!svg || !pointGroup) return;

  const W = 480;
  const H = 340;
  const PAD_X = 42;
  const PAD_Y = 28;
  const toX = (x) => PAD_X + ((x + 1) / 2) * (W - PAD_X * 2);
  const toY = (y) => PAD_Y + ((1 - (y + 1) / 2)) * (H - PAD_Y * 2);

  /* -- data ---------------------------------------------------------------- */
  const rng = seededRandom(4242);
  const insideCircle = (x, y) => x * x + y * y < 0.42 * 0.42 || ((x - 0.6) ** 2 + (y + 0.4) ** 2 < 0.3 * 0.3);

  function makeData(n) {
    const pts = [];
    for (let i = 0; i < n; i++) {
      const x = rng() * 2 - 1;
      const y = rng() * 2 - 1;
      pts.push({ x, y, label: insideCircle(x, y) ? 1 : 0 });
    }
    return pts;
  }

  const trainPool = makeData(800);
  const testSet = makeData(400);

  /* -- the "human rule": a straight-ish line through the plane -------------- */
  const ruleScore = (x, y) => 0.72 * x + 0.52 * y;
  const rulePredict = (x, y) => (ruleScore(x, y) > 0.06 ? 1 : 0);

  const ruleAccuracy = testSet.reduce((acc, p) => acc + (rulePredict(p.x, p.y) === p.label ? 1 : 0), 0) / testSet.length;

  /* -- model: logistic regression on quadratic features -------------------- */
  const features = (x, y) => [1, x, y, x * x, y * y, x * y];
  const D = 6;

  function trainModel(data, iterations = 1200, lr = 0.9) {
    const w = new Float64Array(D);
    const n = data.length;
    if (!n) return w;

    for (let it = 0; it < iterations; it++) {
      const grad = new Float64Array(D);
      for (let i = 0; i < n; i++) {
        const { x, y, label } = data[i];
        const f = features(x, y);
        let z = 0;
        for (let d = 0; d < D; d++) z += w[d] * f[d];
        const p = 1 / (1 + Math.exp(-clamp(z, -30, 30)));
        const err = p - label;
        for (let d = 0; d < D; d++) grad[d] += err * f[d];
      }
      for (let d = 0; d < D; d++) w[d] -= (lr * grad[d]) / n;
    }
    return w;
  }

  const predict = (w, x, y) => {
    const f = features(x, y);
    let z = 0;
    for (let d = 0; d < D; d++) z += w[d] * f[d];
    return 1 / (1 + Math.exp(-clamp(z, -30, 30)));
  };

  /* -- marching squares for the 0.5 contour -------------------------------- */
  function contourPath(w, n = 56) {
    const vals = new Float64Array(n * n);
    for (let j = 0; j < n; j++) {
      for (let i = 0; i < n; i++) {
        const x = -1 + (2 * i) / (n - 1);
        const y = -1 + (2 * j) / (n - 1);
        vals[j * n + i] = predict(w, x, y);
      }
    }
    const lerp2 = (i1, j1, v1, i2, j2, v2) => {
      const t = (0.5 - v1) / (v2 - v1 || 1e-6);
      const x = -1 + (2 * (i1 + (i2 - i1) * t)) / (n - 1);
      const y = -1 + (2 * (j1 + (j2 - j1) * t)) / (n - 1);
      return `${toX(x).toFixed(1)} ${toY(y).toFixed(1)}`;
    };

    let d = "";
    const seg = (a, b) => {
      d += `M${a}L${b}`;
    };

    for (let j = 0; j < n - 1; j++) {
      for (let i = 0; i < n - 1; i++) {
        const a = vals[j * n + i];
        const b = vals[j * n + i + 1];
        const c = vals[(j + 1) * n + i + 1];
        const e = vals[(j + 1) * n + i];
        const idx = (a > 0.5 ? 1 : 0) | (b > 0.5 ? 2 : 0) | (c > 0.5 ? 4 : 0) | (e > 0.5 ? 8 : 0);
        if (idx === 0 || idx === 15) continue;

        const top = lerp2(i, j, a, i + 1, j, b);
        const right = lerp2(i + 1, j, b, i + 1, j + 1, c);
        const bottom = lerp2(i, j + 1, e, i + 1, j + 1, c);
        const left = lerp2(i, j, a, i, j + 1, e);

        switch (idx) {
          case 1: case 14: seg(left, top); break;
          case 2: case 13: seg(top, right); break;
          case 3: case 12: seg(left, right); break;
          case 4: case 11: seg(right, bottom); break;
          case 6: case 9: seg(top, bottom); break;
          case 7: case 8: seg(left, bottom); break;
          case 5: seg(left, top); seg(right, bottom); break;
          case 10: seg(top, right); seg(left, bottom); break;
          default: break;
        }
      }
    }
    return d;
  }

  /* -- static grid + rule line -------------------------------------------- */
  if (gridGroup) {
    let g = "";
    for (let i = 1; i < 6; i++) {
      const x = PAD_X + (i / 6) * (W - PAD_X * 2);
      const y = PAD_Y + (i / 6) * (H - PAD_Y * 2);
      g += `<line x1="${x}" y1="${PAD_Y}" x2="${x}" y2="${H - PAD_Y}"/>`;
      g += `<line x1="${PAD_X}" y1="${y}" x2="${W - PAD_X}" y2="${y}"/>`;
    }
    gridGroup.innerHTML = g;
  }

  // Rule: 0.72x + 0.52y = 0.06  →  solve for two x values
  if (rulePath) {
    const x1 = -1;
    const x2 = 1;
    const y1 = (0.06 - 0.72 * x1) / 0.52;
    const y2 = (0.06 - 0.72 * x2) / 0.52;
    rulePath.setAttribute("d", `M${toX(x1)} ${toY(y1)}L${toX(x2)} ${toY(y2)}`);
  }

  if (ruleAccEl) ruleAccEl.textContent = Math.round(ruleAccuracy * 100) + "%";

  /* -- render ------------------------------------------------------------- */
  const NS = "http://www.w3.org/2000/svg";
  let currentCount = Number(slider ? slider.value : 60);

  function render() {
    const count = clamp(currentCount, 6, trainPool.length);
    const sample = trainPool.slice(0, count);

    // points
    const frag = document.createDocumentFragment();
    sample.forEach((p) => {
      const c = document.createElementNS(NS, "circle");
      c.setAttribute("cx", toX(p.x).toFixed(1));
      c.setAttribute("cy", toY(p.y).toFixed(1));
      c.setAttribute("r", "3");
      c.setAttribute("fill", p.label ? "#8b5cf6" : "#4b7dff");
      c.setAttribute("opacity", "0.85");
      frag.appendChild(c);
    });
    pointGroup.innerHTML = "";
    pointGroup.appendChild(frag);

    // model
    const w = trainModel(sample);
    if (learnedPath) learnedPath.setAttribute("d", contourPath(w));

    const acc = testSet.reduce((a, p) => a + ((predict(w, p.x, p.y) > 0.5 ? 1 : 0) === p.label ? 1 : 0), 0) / testSet.length;
    if (learnedAccEl) learnedAccEl.textContent = Math.round(acc * 100) + "%";

    if (reduceMotion) return;
    gsap.fromTo(
      pointGroup.children,
      { opacity: 0, scale: 0.2, transformOrigin: "center" },
      { opacity: 0.85, scale: 1, duration: 0.4, stagger: { each: 0.002, from: "random" }, ease: "power2.out" }
    );
    if (learnedPath) {
      gsap.fromTo(learnedPath, { opacity: 0.2 }, { opacity: 1, duration: 0.7, ease: "power2.out" });
    }
    if (learnedAccEl) {
      gsap.fromTo(
        learnedAccEl,
        { y: 6, opacity: 0.3 },
        { y: 0, opacity: 1, duration: 0.5, ease: "power2.out" }
      );
    }
  }

  let raf = 0;
  function schedule() {
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(render);
  }

  if (slider) {
    slider.addEventListener("input", () => {
      currentCount = Number(slider.value);
      if (sliderOut) sliderOut.textContent = String(currentCount);
      schedule();
    });
  }

  if (retrainBtn) {
    retrainBtn.addEventListener("click", () => {
      // Reshuffle the pool so the model sees a different sample.
      for (let i = trainPool.length - 1; i > 0; i--) {
        const j = Math.floor(rng() * (i + 1));
        [trainPool[i], trainPool[j]] = [trainPool[j], trainPool[i]];
      }
      render();
    });
  }

  // First render only when the experiment approaches the viewport.
  ScrollTrigger.create({
    trigger: svg,
    start: "top 92%",
    once: true,
    onEnter: render,
  });

  // Guarantee content exists even if the trigger never fires (short pages).
  window.setTimeout(() => {
    if (!learnedPath || !learnedPath.getAttribute("d")) render();
  }, 6000);
}

export function initChapterOne() {
  initSequence();
  initDemo();
}
