/* ==========================================================================
   CHAPTER 04 — "The Training Room"
   A live training dashboard: real forward passes, real gradients, real
   decision boundary. Nothing about the learning loop depends on scroll.
   ========================================================================== */
import { gsap, ScrollTrigger, reduceMotion, clamp } from "./core.js";
import { NeuralNet, makeDataset } from "./nn.js";

const EPOCH_LIMIT = 1400;

export function initTrainingLab() {
  const plot = document.getElementById("lab-boundary");
  const chart = document.getElementById("lab-loss-chart");
  const playBtn = document.getElementById("lab-play");
  const resetBtn = document.getElementById("lab-reset");
  const lrSlider = document.getElementById("lab-lr");
  const datasetSelect = document.getElementById("lab-dataset");
  const hiddenSlider = document.getElementById("lab-hidden");
  const lrOut = document.getElementById("lab-lr-out");
  const hiddenOut = document.getElementById("lab-hidden-out");
  const epochEl = document.getElementById("lab-epoch");
  const lossEl = document.getElementById("lab-loss");
  const trainAccEl = document.getElementById("lab-acc-train");
  const testAccEl = document.getElementById("lab-acc-test");
  const statusEl = document.getElementById("lab-status");
  const statusText = document.getElementById("lab-status-text");
  const probeList = document.getElementById("lab-probes");
  if (!plot || !chart) return;

  const pctx = plot.getContext("2d");
  const cctx = chart.getContext("2d");
  const W = plot.width;
  const H = plot.height;

  // Offscreen buffer for the decision-boundary field.
  const GRID = 46;
  const field = document.createElement("canvas");
  field.width = GRID;
  field.height = GRID;
  const fctx = field.getContext("2d");
  const image = fctx.createImageData(GRID, GRID);

  let state = {
    kind: datasetSelect ? datasetSelect.value : "circles",
    hidden: hiddenSlider ? Number(hiddenSlider.value) : 8,
    lr: 0.3,
    running: false,
    diverged: false,
    epoch: 0,
    loss: 0,
    history: [],
    inView: true,
    trainX: [],
    trainY: [],
    testX: [],
    testY: [],
    net: null,
    before: [],
  };

  /* -- data ---------------------------------------------------------------- */
  function shuffle(array, seed = 99) {
    let s = seed;
    const rand = () => {
      s = (s * 1664525 + 1013904223) % 4294967296;
      return s / 4294967296;
    };
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  }

  function buildData() {
    const { X, Y } = makeDataset(state.kind, 260, 0.04);
    const idx = shuffle(X.map((_, i) => i), 1337);
    const shuffledX = idx.map((i) => X[i]);
    const shuffledY = idx.map((i) => Y[i]);
    const cut = Math.floor(X.length * 0.8);
    state.trainX = shuffledX.slice(0, cut);
    state.trainY = shuffledY.slice(0, cut);
    state.testX = shuffledX.slice(cut);
    state.testY = shuffledY.slice(cut);
  }

  /* -- model lifecycle ----------------------------------------------------- */
  function reset(keepData = true) {
    if (!keepData) {
      buildData();
      buildProbes();
    }
    state.net = new NeuralNet([2, state.hidden, state.hidden, 1], 7);
    state.before = PROBES.map((p) => state.net.predict([p.x, p.y]));
    state.epoch = 0;
    state.loss = 0;
    state.history = [];
    state.diverged = false;
    state.running = false;
    setStatus("IDLE", "");
    updatePlayLabel();
    updateStats();
    drawPoints();
    drawBoundary();
    drawChart();
    renderProbes();
  }

  function lrValue() {
    return Math.pow(10, Number(lrSlider ? lrSlider.value : -0.52));
  }

  function lrLabel(v) {
    return v < 0.01 ? v.toFixed(3) : v.toFixed(2);
  }

  /* -- status -------------------------------------------------------------- */
  function setStatus(text, tone) {
    if (statusText) statusText.textContent = text;
    if (!statusEl) return;
    statusEl.classList.toggle("is-running", tone === "running");
    statusEl.classList.toggle("is-warn", tone === "warn");
  }

  function updatePlayLabel() {
    if (!playBtn) return;
    if (state.running) playBtn.innerHTML = "PAUSE";
    else if (state.diverged) playBtn.innerHTML = "RESTART TRAINING";
    else if (state.epoch > 0) playBtn.innerHTML = "RESUME";
    else playBtn.innerHTML = "START TRAINING";
  }

  /* -- drawing ------------------------------------------------------------- */
  const bg = () => {
    pctx.fillStyle = "#05070d";
    pctx.fillRect(0, 0, W, H);
  };

  function drawBoundary() {
    if (!state.net) return;
    const net = state.net;
    const data = image.data;
    for (let gy = 0; gy < GRID; gy++) {
      for (let gx = 0; gx < GRID; gx++) {
        const x = (gx / (GRID - 1)) * 2 - 1;
        const y = 1 - (gy / (GRID - 1)) * 2;
        const p = net.predict([x, y]);
        const i = (gy * GRID + gx) * 4;
        // blue (class 0) → violet (class 1)
        data[i] = 26 + p * 96;
        data[i + 1] = 40 + p * 26;
        data[i + 2] = 92 + p * 108;
        data[i + 3] = 200;
      }
    }
    fctx.putImageData(image, 0, 0);

    bg();
    pctx.imageSmoothingEnabled = true;
    pctx.globalAlpha = 0.72;
    pctx.drawImage(field, 0, 0, W, H);
    pctx.globalAlpha = 1;

    // frame + crosshair grid
    pctx.strokeStyle = "rgba(255,255,255,0.07)";
    pctx.lineWidth = 1;
    for (let i = 1; i < 4; i++) {
      const x = (W / 4) * i;
      const y = (H / 4) * i;
      pctx.beginPath();
      pctx.moveTo(x, 0);
      pctx.lineTo(x, H);
      pctx.moveTo(0, y);
      pctx.lineTo(W, y);
      pctx.stroke();
    }

    drawPoints();
  }

  function pointToPx(x, y) {
    return [((x + 1) / 2) * W, ((1 - (y + 1) / 2)) * H];
  }

  function drawPoints() {
    // Draw both splits so visitors can see how much of the plane is "held out".
    const draw = (X, Y, hollow) => {
      for (let i = 0; i < X.length; i++) {
        const [px, py] = pointToPx(X[i][0], X[i][1]);
        pctx.beginPath();
        pctx.arc(px, py, hollow ? 4.4 : 3.6, 0, Math.PI * 2);
        if (hollow) {
          pctx.fillStyle = "rgba(6,8,14,0.85)";
          pctx.fill();
          pctx.strokeStyle = Y[i] ? "#c3a6ff" : "#9dc0ff";
          pctx.lineWidth = 1.4;
          pctx.stroke();
        } else {
          pctx.fillStyle = Y[i] ? "#b58cff" : "#6f9dff";
          pctx.fill();
          pctx.strokeStyle = "rgba(255,255,255,0.55)";
          pctx.lineWidth = 0.8;
          pctx.stroke();
        }
      }
    };
    draw(state.testX, state.testY, true);
    draw(state.trainX, state.trainY, false);
  }

  function drawChart() {
    const cw = chart.width;
    const ch = chart.height;
    cctx.clearRect(0, 0, cw, ch);
    cctx.fillStyle = "#070910";
    cctx.fillRect(0, 0, cw, ch);

    // grid
    cctx.strokeStyle = "rgba(255,255,255,0.06)";
    cctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
      const y = 14 + (i / 4) * (ch - 34);
      cctx.beginPath();
      cctx.moveTo(38, y);
      cctx.lineTo(cw - 10, y);
      cctx.stroke();
    }

    const hist = state.history;
    const maxLoss = Math.max(0.8, ...hist);
    const minLoss = 0;
    const plotW = cw - 52;
    const plotH = ch - 34;

    cctx.font = "9px 'JetBrains Mono Variable', monospace";
    cctx.fillStyle = "rgba(140,148,170,0.7)";
    cctx.fillText(maxLoss.toFixed(2), 4, 20);
    cctx.fillText(minLoss.toFixed(2), 4, ch - 14);

    if (hist.length > 1) {
      const step = plotW / Math.max(120, hist.length - 1);
      cctx.beginPath();
      hist.forEach((v, i) => {
        const x = 38 + i * step;
        const y = 14 + (1 - clamp((v - minLoss) / (maxLoss - minLoss), 0, 1)) * plotH;
        i === 0 ? cctx.moveTo(x, y) : cctx.lineTo(x, y);
      });
      cctx.strokeStyle = "#4b7dff";
      cctx.lineWidth = 1.8;
      cctx.stroke();

      // gradient wash under the curve
      cctx.lineTo(38 + (hist.length - 1) * step, 14 + plotH);
      cctx.lineTo(38, 14 + plotH);
      cctx.closePath();
      cctx.fillStyle = "rgba(75,125,255,0.10)";
      cctx.fill();
    } else {
      cctx.fillStyle = "rgba(140,148,170,0.55)";
      cctx.fillText("press START TRAINING", 60, ch / 2 + 4);
    }

    cctx.fillStyle = "rgba(140,148,170,0.55)";
    cctx.fillText("epoch " + state.epoch, cw - 88, ch - 6);
  }

  /* -- probes -------------------------------------------------------------- */
  // Probe points chosen so each dataset gets an informative spread.
  const PROBE_SETS = {
    xor: [
      { x: 0.6, y: 0.6 },
      { x: -0.6, y: 0.6 },
      { x: 0.6, y: -0.6 },
      { x: -0.6, y: -0.6 },
    ],
    circles: [
      { x: 0, y: 0 },
      { x: 0.4, y: 0.35 },
      { x: 0.85, y: 0.85 },
      { x: -0.7, y: 0.2 },
    ],
    moons: [
      { x: -0.2, y: 0.45 },
      { x: 0.55, y: -0.1 },
      { x: 0.2, y: 0.2 },
      { x: 0.85, y: -0.35 },
    ],
  };
  let PROBES = PROBE_SETS.circles;

  function buildProbes() {
    if (!probeList) return;
    PROBES = PROBE_SETS[state.kind] || PROBE_SETS.circles;
    probeList.innerHTML = PROBES.map(
      (p, i) => `
      <div class="probe" data-probe="${i}">
        <div class="probe__k"><span>(${p.x.toFixed(2)}, ${p.y.toFixed(2)})</span><span class="probe__class">—</span></div>
        <div class="probe__track"><span class="probe__fill"></span></div>
        <span class="probe__v">p = 0.50 · uncertain</span>
        <span class="probe__was">untrained</span>
      </div>`
    ).join("");
  }

  function renderProbes() {
    if (!probeList || !state.net) return;
    PROBES.forEach((p, i) => {
      const card = probeList.querySelector(`[data-probe="${i}"]`);
      if (!card) return;
      const prob = state.net.predict([p.x, p.y]);
      const cls = prob > 0.5 ? 1 : 0;
      const confidence = Math.max(prob, 1 - prob);
      card.querySelector(".probe__class").textContent = `CLASS ${cls}`;
      card.querySelector(".probe__fill").style.width = (prob * 100).toFixed(0) + "%";
      card.querySelector(".probe__v").textContent = `p = ${prob.toFixed(2)} · ${
        confidence > 0.9 ? "confident" : confidence > 0.65 ? "leaning" : "uncertain"
      }`;
      const was = state.before[i];
      const wasEl = card.querySelector(".probe__was");
      if (wasEl) wasEl.textContent = `was ${was.toFixed(2)}`;
    });
  }

  /* -- stats --------------------------------------------------------------- */
  function updateStats() {
    if (epochEl) epochEl.textContent = String(state.epoch);
    if (lossEl) lossEl.textContent = state.epoch ? state.loss.toFixed(3) : "—";
    if (state.net) {
      if (trainAccEl) trainAccEl.textContent = state.epoch ? (state.net.accuracy(state.trainX, state.trainY) * 100).toFixed(0) + "%" : "—";
      if (testAccEl) testAccEl.textContent = state.epoch ? (state.net.accuracy(state.testX, state.testY) * 100).toFixed(0) + "%" : "—";
    }
  }

  /* -- the loop ------------------------------------------------------------ */
  let lastFrame = 0;
  let frames = 0;

  function tick(now) {
    requestAnimationFrame(tick);
    if (!state.running || !state.inView || !state.net) return;
    if (document.hidden) return;
    if (now - lastFrame < 16) return; // cap ~60fps
    lastFrame = now;
    frames++;

    const lr = state.lr;
    // A few epochs per frame: fast enough to watch, cheap enough for a phone.
    for (let i = 0; i < 3; i++) {
      state.loss = state.net.trainEpoch(state.trainX, state.trainY, lr, 0.9);
      state.epoch++;
      if (state.epoch % 2 === 0) state.history.push(state.loss);
      if (!Number.isFinite(state.loss) || state.loss > 2.4) break;
      if (state.loss < 0.02) break;
    }
    if (state.history.length > 420) state.history.shift();

    if (!Number.isFinite(state.loss) || state.loss > 2.4) {
      state.diverged = true;
      state.running = false;
      setStatus("DIVERGED", "warn");
      updatePlayLabel();
    }

    if (frames % 3 === 0) {
      drawBoundary();
      drawChart();
      updateStats();
      renderProbes();
    }

    if (state.epoch >= EPOCH_LIMIT || state.loss < 0.02) {
      state.running = false;
      setStatus(state.loss < 0.02 ? "CONVERGED" : "EPOCH LIMIT", "");
      updatePlayLabel();
      drawBoundary();
      drawChart();
      updateStats();
      renderProbes();
    }
  }
  requestAnimationFrame(tick);

  /* -- controls ------------------------------------------------------------ */
  if (playBtn) {
    playBtn.addEventListener("click", () => {
      if (!state.net) return;
      if (state.diverged) {
        // A diverged run restarts from fresh weights, keeping the same lesson.
        reset(true);
        state.running = true;
      } else {
        state.running = !state.running;
      }
      state.lr = lrValue();
      setStatus(state.running ? "TRAINING" : "PAUSED", state.running ? "running" : "");
      updatePlayLabel();
    });
  }

  if (resetBtn) {
    resetBtn.addEventListener("click", () => {
      reset(true);
      if (trainAccEl) trainAccEl.textContent = "—";
      if (testAccEl) testAccEl.textContent = "—";
    });
  }

  if (lrSlider) {
    lrSlider.addEventListener("input", () => {
      state.lr = lrValue();
      if (lrOut) lrOut.textContent = lrLabel(state.lr);
    });
  }

  if (datasetSelect) {
    datasetSelect.addEventListener("change", () => {
      state.kind = datasetSelect.value;
      reset(false);
    });
  }

  if (hiddenSlider) {
    hiddenSlider.addEventListener("input", () => {
      state.hidden = Number(hiddenSlider.value);
      if (hiddenOut) hiddenOut.textContent = String(state.hidden);
    });
    hiddenSlider.addEventListener("change", () => reset(true));
  }

  /* -- pause offscreen ----------------------------------------------------- */
  ScrollTrigger.create({
    trigger: "#lab",
    start: "top bottom",
    end: "bottom top",
    onToggle: (self) => {
      state.inView = self.isActive;
    },
  });

  /* -- init ---------------------------------------------------------------- */
  state.lr = lrValue();
  if (lrOut) lrOut.textContent = lrLabel(state.lr);
  if (hiddenOut) hiddenOut.textContent = String(state.hidden);
  buildProbes();
  reset(false);

  // Nudge the chart to say something friendly on first paint.
  drawChart();

  // Chapter caption drift
  if (!reduceMotion) {
    const captions = [
      "Forward pass → the network guesses.",
      "Loss → one number for how wrong the guess was.",
      "Backpropagation → every weight learns its share of the blame.",
      "Update → step downhill. Repeat thousands of times.",
    ];
    const caps = gsap.utils.toArray(".loop__step");
    const capEl = document.getElementById("loop-caption");
    caps.forEach((el, i) => {
      const activate = () => {
        if (capEl) capEl.textContent = captions[i];
        caps.forEach((c) => c.classList.toggle("is-active", c === el));
      };
      el.addEventListener("pointerenter", activate);
      el.addEventListener("click", activate);
    });
  }
}
