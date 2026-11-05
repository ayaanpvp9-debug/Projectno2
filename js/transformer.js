/* ==========================================================================
   CHAPTER 05 — "From words to tokens. From tokens to responses."
   An illustrative pipeline: tokenizer → embeddings → causal attention →
   next-token sampling. Clearly labelled as a teaching model, not ChatGPT.
   ========================================================================== */
import { gsap, ScrollTrigger, reduceMotion, hashString, seededRandom, clamp } from "./core.js";

const VOCAB_SIZE = 50257;
const MAX_ATTENTION_TOKENS = 12;
const MAX_GENERATED = 14;

/* --------------------------------------------------------------------------
   Tokenizer — whitespace + sub-word splitting with a leading-space convention
   (similar in spirit to BPE, far simpler in practice).
   -------------------------------------------------------------------------- */
function tokenize(text) {
  const raw = text.match(/\s+|[A-Za-z]+(?:'[A-Za-z]+)?|[0-9]+|[^\sA-Za-z0-9]+/g) || [];
  const tokens = [];
  let pendingSpace = false;

  raw.forEach((piece) => {
    if (/^\s+$/.test(piece)) {
      pendingSpace = true;
      return;
    }
    let type = "word";
    if (/^[0-9]+$/.test(piece)) type = "number";
    else if (!/^[A-Za-z]/.test(piece)) type = "punct";

    const prefix = pendingSpace ? " " : "";
    pendingSpace = false;

    if (type === "word" && piece.length > 7) {
      // Long words break into two sub-word pieces.
      const chunks = [piece.slice(0, 4), piece.slice(4)];
      chunks.forEach((chunk, i) => {
        const surface = (i === 0 ? prefix : "") + chunk;
        tokens.push({
          text: surface,
          display: i === 0 ? chunk : chunk,
          continuation: i > 0,
          type: "subword",
          id: Math.floor(hashString(surface.toLowerCase()) * VOCAB_SIZE),
        });
      });
      return;
    }

    const surface = prefix + piece;
    tokens.push({
      text: surface,
      display: piece,
      continuation: false,
      type,
      id: Math.floor(hashString(surface.trim().toLowerCase()) * VOCAB_SIZE),
    });
  });

  return tokens;
}

/* --------------------------------------------------------------------------
   Deterministic pseudo-embeddings
   -------------------------------------------------------------------------- */
function embeddingFor(token) {
  const random = seededRandom(Math.floor(hashString(token.text.trim().toLowerCase()) * 4294967295) + 1);
  return Array.from({ length: 8 }, () => Number((random() * 2 - 1).toFixed(2)));
}

/* --------------------------------------------------------------------------
   Causal self-attention (illustrative)
   -------------------------------------------------------------------------- */
function attentionMatrix(vectors) {
  const n = vectors.length;
  const Q = vectors.map((v) => v.slice(0, 4));
  const K = vectors.map((v) => v.slice(4, 8));
  const rows = [];

  for (let i = 0; i < n; i++) {
    const scores = [];
    for (let j = 0; j <= i; j++) {
      let dot = 0;
      for (let d = 0; d < 4; d++) dot += Q[i][d] * K[j][d];
      const positional = -0.06 * Math.abs(i - j);
      scores.push(dot / 2 + positional);
    }
    const max = Math.max(...scores);
    const exps = scores.map((s) => Math.exp(s - max));
    const sum = exps.reduce((a, b) => a + b, 0) || 1;
    const row = new Array(n).fill(0);
    exps.forEach((e, j) => (row[j] = e / sum));
    rows.push(row);
  }
  return rows;
}

/* --------------------------------------------------------------------------
   A tiny bigram language model, trained on a small in-page corpus
   -------------------------------------------------------------------------- */
const CORPUS = [
  "Artificial intelligence learns patterns from examples.",
  "Neural networks adjust their weights to reduce error.",
  "A model is only as good as the data it was trained on.",
  "Language models predict the next token in a sequence.",
  "Attention lets a token look at the tokens before it.",
  "Training a large model requires enormous amounts of compute.",
  "The model does not know what the words mean to you.",
  "A confident answer can still be completely wrong.",
  "Scientists use machine learning to study proteins and stars.",
  "Teachers use intelligent tools to give faster feedback.",
  "Farmers use computer vision to spot disease in crops.",
  "The data must be cleaned before it can teach anything.",
  "Gradient descent takes a small step downhill every time.",
  "Human feedback shapes how a model answers questions.",
  "Careful evaluation matters more than an impressive demo.",
  "The future of artificial intelligence is not just about machines.",
  "Every model begins with a decision about what to measure.",
  "A language model predicts one token and then another.",
  "The next token depends on all the tokens before it.",
  "Attention is a way of deciding what matters right now.",
  "Machine learning finds patterns that people did not write down.",
  "A prediction is not an explanation of why something happened.",
  "The network has no idea that you are asking a question.",
  "Good data is difficult expensive and often incomplete.",
  "The answer sounds certain because certainty is easy to imitate.",
  "Testing a model on its own training data proves very little.",
  "Human oversight is still the last line of defence.",
  "A small error in the data becomes a large error in the model.",
  "The model learns the patterns and the prejudices of its data.",
  "Tokens are pieces of words and words are pieces of meaning.",
  "We built the machines and now we must decide how to use them.",
  "A transformer reads the whole sequence at once.",
  "The same weights answer a billion different questions.",
  "Intelligence is not the same thing as understanding.",
];

function buildBigramModel() {
  const table = new Map();
  const unigram = new Map();

  CORPUS.forEach((line) => {
    const words = line
      .toLowerCase()
      .replace(/[^a-z0-9' ]/g, "")
      .split(/\s+/)
      .filter(Boolean);
    words.forEach((word, i) => {
      unigram.set(word, (unigram.get(word) || 0) + 1);
      if (i === 0) return;
      const prev = words[i - 1];
      if (!table.has(prev)) table.set(prev, new Map());
      const nextMap = table.get(prev);
      nextMap.set(word, (nextMap.get(word) || 0) + 1);
    });
  });

  return { table, unigram };
}

const MODEL = buildBigramModel();

function candidatesFor(word) {
  const key = String(word || "").toLowerCase().replace(/[^a-z0-9' ]/g, "");
  const nextMap = MODEL.table.get(key);
  const scored = new Map();

  if (nextMap) {
    const total = [...nextMap.values()].reduce((a, b) => a + b, 0) || 1;
    nextMap.forEach((count, token) => scored.set(token, (count / total) * 0.72));
  }

  // Back off to the most common words so every context has a distribution.
  const backoffMass = nextMap ? 0.28 : 1;
  const topUnigrams = [...MODEL.unigram.entries()].sort((a, b) => b[1] - a[1]).slice(0, 120);
  const topSum = topUnigrams.reduce((a, b) => a + b[1], 0) || 1;
  topUnigrams.forEach(([token, count]) => {
    scored.set(token, (scored.get(token) || 0) + (count / topSum) * backoffMass);
  });

  const sum = [...scored.values()].reduce((a, b) => a + b, 0) || 1;
  return [...scored.entries()]
    .map(([token, p]) => ({ token, p: p / sum }))
    .filter((c) => c.p > 0.0005)
    .sort((a, b) => b.p - a.p);
}

/* --------------------------------------------------------------------------
   Init
   -------------------------------------------------------------------------- */
export function initTransformer() {
  const input = document.getElementById("tx-input");
  const runBtn = document.getElementById("tx-run");
  const presets = [...document.querySelectorAll("#tx-presets button")];
  const tokensEl = document.getElementById("tx-tokens");
  const tokenCount = document.getElementById("tx-token-count");
  const embedEl = document.getElementById("tx-embed");
  const attnLabels = document.getElementById("tx-attn-labels");
  const attnMatrix = document.getElementById("tx-attn-matrix");
  const attnReadout = document.getElementById("tx-attn-readout");
  const candidatesEl = document.getElementById("tx-candidates");
  const genText = document.getElementById("tx-gen-text");
  const genStep = document.getElementById("tx-gen-step");
  const genReset = document.getElementById("tx-gen-reset");
  const pipeNodes = [...document.querySelectorAll(".tx__node")];
  if (!input || !tokensEl) return;

  const state = {
    tokens: [],
    vectors: [],
    attention: [],
    generated: [],
    baseText: "",
  };

  const setPipe = (index) => {
    pipeNodes.forEach((n, i) => n.classList.toggle("is-active", i === index));
  };

  /* -- 1 · tokens ---------------------------------------------------------- */
  function renderTokens() {
    tokensEl.innerHTML = state.tokens
      .map((t, i) => {
        const cls = t.type === "punct" ? "token--punct" : t.continuation ? "token--sub" : "token--word";
        return `<span class="token ${cls}" title="token id ${t.id}">
          <span class="token__text">${escapeHtml(t.display)}</span>
          <span class="token__id">${t.id}</span>
        </span>`;
      })
      .join("");

    if (tokenCount) {
      const words = state.tokens.filter((t) => t.type === "word" || t.type === "number").length;
      tokenCount.textContent = `${state.tokens.length} tokens · ${words} whole words · this local tokenizer is illustrative, not GPT's`;
    }

    if (!reduceMotion) {
      gsap.fromTo(
        tokensEl.children,
        { opacity: 0, y: 8 },
        { opacity: 1, y: 0, duration: 0.35, stagger: 0.018, ease: "power2.out", overwrite: true }
      );
    }
  }

  /* -- 2 · embeddings ------------------------------------------------------ */
  function renderEmbeddings() {
    state.vectors = state.tokens.map((t) => embeddingFor(t));
    embedEl.innerHTML = state.vectors
      .slice(0, 14)
      .map((vec, i) => {
        const cells = vec
          .map((v) => {
            const alpha = 0.08 + Math.abs(v) * 0.5;
            const color = v >= 0 ? `rgba(75,125,255,${alpha})` : `rgba(139,92,246,${alpha})`;
            return `<span class="embed-cell" style="background:${color}">${v.toFixed(1)}</span>`;
          })
          .join("");
        return `<div class="embed-row">
          <span class="embed-row__label">${escapeHtml(state.tokens[i].display || "␣")}</span>
          <span class="embed-row__cells">${cells}</span>
        </div>`;
      })
      .join("");

    if (state.vectors.length > 14) {
      embedEl.innerHTML += `<div class="embed-row"><span class="embed-row__label">…</span></div>`;
    }
    if (!reduceMotion) {
      gsap.fromTo(
        embedEl.querySelectorAll(".embed-row"),
        { opacity: 0, x: -8 },
        { opacity: 1, x: 0, duration: 0.3, stagger: 0.03, ease: "power2.out", overwrite: true }
      );
    }
  }

  /* -- 3 · attention ------------------------------------------------------- */
  function renderAttention() {
    const n = Math.min(MAX_ATTENTION_TOKENS, state.vectors.length);
    state.attention = attentionMatrix(state.vectors.slice(0, n));

    attnLabels.innerHTML = state.tokens
      .slice(0, n)
      .map((t) => `<span title="${escapeHtml(t.text)}">${escapeHtml(t.display || "␣")}</span>`)
      .join("");

    attnMatrix.style.gridTemplateColumns = `repeat(${n}, 20px)`;
    let html = "";
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        if (j > i) {
          html += `<button class="attn-cell is-masked" disabled aria-hidden="true" tabindex="-1"></button>`;
        } else {
          const w = state.attention[i][j];
          const alpha = 0.06 + w * 0.92;
          html += `<button class="attn-cell" data-row="${i}" data-col="${j}" style="background:rgba(75,125,255,${alpha.toFixed(
            2
          )})" title="${escapeHtml(state.tokens[j].display)} → ${escapeHtml(
            state.tokens[i].display
          )}: ${(w * 100).toFixed(0)}%" aria-label="${escapeHtml(state.tokens[i].display)} attends to ${escapeHtml(
            state.tokens[j].display
          )} with ${(w * 100).toFixed(0)} percent"></button>`;
        }
      }
    }
    attnMatrix.innerHTML = html;

    const cells = [...attnMatrix.querySelectorAll(".attn-cell")];
    const highlightRow = (row) => {
      cells.forEach((cell) => cell.classList.toggle("is-row-hi", Number(cell.dataset.row) === row));
      const weights = state.attention[row];
      const top = weights
        .map((w, j) => ({ w, token: state.tokens[j].display }))
        .filter((entry, j) => j <= row && entry.w > 0.001)
        .sort((a, b) => b.w - a.w)
        .slice(0, 4);
      if (attnReadout) {
        attnReadout.innerHTML = `<b style="color:#dfe6f4">${escapeHtml(
          state.tokens[row].display
        )}</b> spends its attention on: ${top
          .map((t) => `${escapeHtml(t.token)} (${Math.round(t.w * 100)}%)`)
          .join(", ")}.`;
      }
    };

    cells.forEach((cell) => {
      if (cell.disabled) return;
      cell.addEventListener("pointerenter", () => highlightRow(Number(cell.dataset.row)));
      cell.addEventListener("focus", () => highlightRow(Number(cell.dataset.row)));
      cell.addEventListener("click", () => highlightRow(Number(cell.dataset.row)));
    });

    // Sensible default focus: the final token.
    if (n > 0) highlightRow(n - 1);

    if (!reduceMotion) {
      gsap.fromTo(
        cells,
        { opacity: 0 },
        { opacity: 1, duration: 0.4, stagger: { each: 0.002, from: "start" }, overwrite: true }
      );
    }
  }

  /* -- 4 · next token ------------------------------------------------------ */
  function lastWord() {
    const all = [...state.tokens.map((t) => t.display), ...state.generated];
    for (let i = all.length - 1; i >= 0; i--) {
      const w = String(all[i] || "").trim();
      if (/[A-Za-z0-9]/.test(w)) return w;
    }
    return "";
  }

  function renderCandidates() {
    const candidates = candidatesFor(lastWord()).slice(0, 6);
    const max = candidates[0] ? candidates[0].p : 1;

    candidatesEl.innerHTML = candidates
      .map((c, i) => {
        const pct = Math.round(c.p * 100);
        return `<div class="cand ${i === 0 ? "cand--top" : ""}">
          <span class="cand__tok">${escapeHtml(c.token)}</span>
          <span class="cand__track"><span class="cand__fill" data-w="${clamp((c.p / max) * 100, 2, 100)}"></span></span>
          <span class="cand__p">${pct}%</span>
        </div>`;
      })
      .join("");

    // Animate the bars in.
    requestAnimationFrame(() => {
      candidatesEl.querySelectorAll(".cand__fill").forEach((bar, i) => {
        bar.style.width = bar.dataset.w + "%";
        if (!reduceMotion) {
          bar.style.transitionDelay = i * 40 + "ms";
        }
      });
    });

    state._candidates = candidates;
  }

  function renderGenerated() {
    if (!genText) return;
    const base = escapeHtml(state.baseText);
    const generated = state.generated
      .map((w) => `<span class="new">${escapeHtml(w)}</span>`)
      .join(" ");
    genText.innerHTML = `${base}${generated ? " " + generated : ""}<span class="cursor"></span>`;
    if (genStep) {
      genStep.disabled = state.generated.length >= MAX_GENERATED;
    }
  }

  function generateToken() {
    if (state.generated.length >= MAX_GENERATED) return;
    const candidates = state._candidates || candidatesFor(lastWord()).slice(0, 8);
    if (!candidates.length) return;

    // Weighted sample from the top candidates (temperature ≈ 0.8).
    const temp = 0.8;
    const weights = candidates.slice(0, 8).map((c) => Math.pow(c.p, 1 / temp));
    const total = weights.reduce((a, b) => a + b, 0);
    let r = Math.random() * total;
    let chosen = candidates[0].token;
    for (let i = 0; i < weights.length; i++) {
      r -= weights[i];
      if (r <= 0) {
        chosen = candidates[i].token;
        break;
      }
    }

    state.generated.push(chosen);
    renderGenerated();
    renderCandidates();

    if (genStep) genStep.disabled = state.generated.length >= MAX_GENERATED;
  }

  /* -- pipeline run -------------------------------------------------------- */
  function process(animate = true) {
    const text = (input.value || "").trim();
    if (!text) {
      input.focus();
      return;
    }
    state.baseText = text;
    state.tokens = tokenize(text);
    state.generated = [];
    state.attention = [];

    renderTokens();
    renderEmbeddings();
    renderAttention();
    renderCandidates();
    renderGenerated();

    if (genStep) genStep.disabled = false;

    if (!animate || reduceMotion) return;

    gsap.fromTo(
      [tokensEl, embedEl, attnMatrix, candidatesEl],
      { opacity: 0.25 },
      { opacity: 1, duration: 0.5, stagger: 0.08, ease: "power2.out", overwrite: true }
    );
    setPipe(0);
    gsap.delayedCall(0.18, () => setPipe(1));
    gsap.delayedCall(0.36, () => setPipe(2));
    gsap.delayedCall(0.54, () => setPipe(3));
  }

  if (runBtn) runBtn.addEventListener("click", () => process(true));
  if (input) {
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        process(true);
      }
    });
  }
  presets.forEach((btn) => {
    btn.addEventListener("click", () => {
      input.value = btn.dataset.preset || btn.textContent;
      process(true);
    });
  });
  if (genStep) genStep.addEventListener("click", generateToken);
  if (genReset) {
    genReset.addEventListener("click", () => {
      state.generated = [];
      renderGenerated();
      renderCandidates();
    });
  }

  /* -- scroll progress through the four stages ----------------------------- */
  const pipelineEl = document.getElementById("tx-pipeline");
  if (pipelineEl) {
    const bar = document.createElement("div");
    bar.className = "tx__progress";
    bar.innerHTML = "<span></span>";
    bar.setAttribute("aria-hidden", "true");
    pipelineEl.after(bar);
    const fill = bar.firstElementChild;
    ScrollTrigger.create({
      trigger: ".tx__steps",
      start: "top 78%",
      end: "bottom 62%",
      onUpdate: (self) => {
        if (fill) fill.style.width = (self.progress * 100).toFixed(2) + "%";
      },
    });
  }

  /* -- the attention map redraws itself as it comes into view -------------- */
  if (attnMatrix && !reduceMotion) {
    ScrollTrigger.create({
      trigger: ".tx-attn",
      start: "top 88%",
      once: true,
      onEnter: () => {
        gsap.fromTo(
          [...attnMatrix.children],
          { opacity: 0, scale: 0.55 },
          { opacity: 1, scale: 1, duration: 0.5, stagger: { each: 0.004 }, ease: "power2.out" }
        );
      },
    });
  }

  /* -- scroll focus for the four stages ----------------------------------- */
  gsap.utils.toArray(".tx-step").forEach((step, i) => {
    ScrollTrigger.create({
      trigger: step,
      start: "top 62%",
      end: "bottom 38%",
      onToggle: (self) => {
        if (self.isActive) setPipe(i);
      },
    });
  });

  process(false);
}

/* --------------------------------------------------------------------------
   Helpers
   -------------------------------------------------------------------------- */
function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, (c) => {
    switch (c) {
      case "&":
        return "&amp;";
      case "<":
        return "&lt;";
      case ">":
        return "&gt;";
      case '"':
        return "&quot;";
      default:
        return "&#39;";
    }
  });
}
