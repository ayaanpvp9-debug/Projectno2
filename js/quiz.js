/* ==========================================================================
   CHAPTER 08 — "The human question."
   Final cinematic lines + a six-question knowledge challenge.
   ========================================================================== */
import { gsap, ScrollTrigger, reduceMotion, scroll } from "./core.js";

const QUESTIONS = [
  {
    prompt: "Which sentence best describes machine learning?",
    options: [
      "A programmer writes a rule for every possible input.",
      "A program adjusts internal numbers by comparing its answers to examples.",
      "A database returns stored facts when it is asked.",
      "A robot that thinks the way a person thinks.",
    ],
    correct: 1,
    why:
      "The shift is from writing rules to supplying examples. Training changes parameters — weights and biases — until the outputs match, and the 'rule' ends up distributed across those numbers.",
  },
  {
    prompt: "In a neural network, what is a weight?",
    options: [
      "A rule that a human wrote down.",
      "A preference for certain kinds of words.",
      "A number that scales how strongly one neuron's output affects another.",
      "The number of layers in the network.",
    ],
    correct: 2,
    why:
      "Weights and biases are the learnable parameters. Nothing else changes during training: the data flows through, the loss is measured, and those numbers are adjusted by a small step.",
  },
  {
    prompt: "Why keep a separate test set?",
    options: [
      "To make training run faster.",
      "To measure whether the model generalises to data it has never seen.",
      "To store the labels used during training.",
      "To increase the number of parameters.",
    ],
    correct: 1,
    why:
      "If the test data ever influences training, the score measures memorisation rather than learning. A model that is 99% accurate on its training set and 60% on unseen data has learned the wrong thing.",
  },
  {
    prompt: "What does a language model actually do?",
    options: [
      "Searches the internet for the answer.",
      "Looks facts up in a database.",
      "Predicts the next token, appends it, and repeats.",
      "Reasons step by step exactly as a human would.",
    ],
    correct: 2,
    why:
      "Next-token prediction, repeated. Retrieval and tool use are systems built around the model to make answers more grounded — the model itself only continues a sequence.",
  },
  {
    prompt: "Why can a chatbot state something false with total confidence?",
    options: [
      "Its data is always out of date.",
      "It is trained to produce plausible text, not to verify truth.",
      "It is deliberately lying to you.",
      "It simply does not have enough parameters.",
    ],
    correct: 1,
    why:
      "Fluency is what the objective rewards. Nothing inside a base model checks a claim against the world, so a fabrication and a fact arrive in the same calm tone.",
  },
  {
    prompt: "What does backpropagation compute?",
    options: [
      "The final prediction of the network.",
      "The gradient of the loss with respect to every weight.",
      "The size of the training dataset.",
      "How many epochs remain.",
    ],
    correct: 1,
    why:
      "The chain rule, applied backwards: each weight receives a share of the blame for the error. Gradient descent then takes a step opposite to that gradient.",
  },
];

const TIERS = [
  {
    min: 6,
    title: "You saw inside the machine.",
    body:
      "You can separate the mechanism from the marketing: patterns, parameters, gradients, probabilities. Share the training lab with someone who still thinks AI is magic — and keep the habit of asking what a model was trained on.",
  },
  {
    min: 4,
    title: "A solid understanding.",
    body:
      "You have the core picture. The gaps are probably in the details — how attention weights mix information, or what a gradient actually measures. Chapters 3 and 4 are worth a second pass.",
  },
  {
    min: 2,
    title: "The foundations are there.",
    body:
      "You know that something is being learned from data, and that prediction is not understanding. Revisit the training room and run the simulation a few times with different learning rates.",
  },
  {
    min: 0,
    title: "The journey has just begun.",
    body:
      "Start with chapter one and take your time. Nothing here requires advanced mathematics — only the willingness to look at the machinery instead of the performance.",
  },
];

export function initQuiz() {
  const stage = document.getElementById("quiz-stage");
  const countEl = document.getElementById("quiz-count");
  const scoreEl = document.getElementById("quiz-score");
  const dotsEl = document.getElementById("quiz-dots");
  if (!stage) return;

  const state = {
    index: 0,
    score: 0,
    answered: false,
    results: [],
    finished: false,
  };

  if (dotsEl) {
    dotsEl.innerHTML = QUESTIONS.map(() => "<span></span>").join("");
  }

  function updateChrome() {
    if (countEl) countEl.textContent = `QUESTION ${Math.min(state.index + 1, QUESTIONS.length)} OF ${QUESTIONS.length}`;
    if (scoreEl) scoreEl.textContent = String(state.score);
    if (dotsEl) {
      [...dotsEl.children].forEach((dot, i) => {
        dot.classList.toggle("is-done", i < state.index || (state.finished && i === state.index));
        dot.classList.toggle("is-now", i === state.index && !state.finished);
      });
    }
  }

  function renderQuestion() {
    const q = QUESTIONS[state.index];
    state.answered = false;
    updateChrome();

    stage.innerHTML = `
      <div class="q">
        <p class="q__prompt">${q.prompt}</p>
        <div class="q__options" role="group" aria-label="Answer options">
          ${q.options
            .map(
              (opt, i) => `
            <button class="q__opt" type="button" data-opt="${i}">
              <span class="q__opt-key">${String.fromCharCode(65 + i)}</span>
              <span>${opt}</span>
            </button>`
            )
            .join("")}
        </div>
        <div id="q-feedback"></div>
      </div>`;

    const options = [...stage.querySelectorAll(".q__opt")];

    options.forEach((btn) => {
      btn.addEventListener("click", () => {
        if (state.answered) return;
        state.answered = true;
        const choice = Number(btn.dataset.opt);
        const isRight = choice === q.correct;

        options.forEach((b, i) => {
          b.disabled = true;
          if (i === q.correct) b.classList.add("is-correct");
          else if (i === choice) b.classList.add("is-wrong");
        });

        if (isRight) state.score++;
        state.results.push({ index: state.index, correct: isRight, choice });
        updateChrome();

        const feedback = stage.querySelector("#q-feedback");
        if (feedback) {
          const isLast = state.index === QUESTIONS.length - 1;
          feedback.innerHTML = `
            <div class="q__feedback ${isRight ? "is-right" : ""}" style="margin-top:18px">
              <b>${isRight ? "Correct." : "Not quite."}</b> ${q.why}
            </div>
            <div class="q__actions" style="margin-top:16px">
              <button class="btn ${isLast ? "btn--accent" : "btn--ghost"}" id="q-next" type="button">
                ${isLast ? "SEE YOUR RESULT →" : "NEXT QUESTION →"}
              </button>
            </div>`;

          if (!reduceMotion) {
            gsap.fromTo(
              feedback,
              { opacity: 0, y: 10 },
              { opacity: 1, y: 0, duration: 0.45, ease: "power2.out" }
            );
          }

          const next = feedback.querySelector("#q-next");
          next.addEventListener("click", () => {
            if (state.index < QUESTIONS.length - 1) {
              state.index++;
              renderQuestion();
              scrollStageIntoView();
            } else {
              state.finished = true;
              updateChrome();
              renderResult();
            }
          });
        }
      });
    });
  }

  function scrollStageIntoView() {
    if (reduceMotion) return;
    const rect = stage.getBoundingClientRect();
    if (rect.top < 60 || rect.bottom > window.innerHeight) {
      const y = stage.getBoundingClientRect().top + window.scrollY - 90;
      scroll.toY(y);
    }
  }

  function renderResult() {
    const tier = TIERS.find((t) => state.score >= t.min);
    stage.innerHTML = `
      <div class="result">
        <div class="result__score">${state.score}<small> / ${QUESTIONS.length}</small></div>
        <h3 class="result__title">${tier.title}</h3>
        <p class="result__body">${tier.body}</p>
        <div class="result__list">
          ${QUESTIONS.map((q, i) => {
            const res = state.results.find((r) => r.index === i);
            return `<div class="result__row">
              <i class="${res && res.correct ? "ok" : "no"}"></i>
              <span>${q.prompt}</span>
            </div>`;
          }).join("")}
        </div>
        <div class="q__actions">
          <button class="btn btn--accent" id="quiz-again" type="button">TRY AGAIN</button>
          <a class="btn btn--ghost" href="#c1" data-quiz-jump>REVISIT CHAPTER 01</a>
        </div>
      </div>`;

    if (!reduceMotion) {
      gsap.fromTo(
        stage.querySelectorAll(".result > *"),
        { opacity: 0, y: 16 },
        { opacity: 1, y: 0, duration: 0.6, stagger: 0.07, ease: "power3.out" }
      );
    }

    stage.querySelector("#quiz-again").addEventListener("click", () => {
      state.index = 0;
      state.score = 0;
      state.results = [];
      state.finished = false;
      renderQuestion();
    });

    stage.querySelector("[data-quiz-jump]").addEventListener("click", (e) => {
      e.preventDefault();
      scroll.to("#c1");
    });
  }

  renderQuestion();

  /* --------------------------------------------------------------------------
     Closing mark (the lines themselves are choreographed in motion.js)
     -------------------------------------------------------------------------- */
  ScrollTrigger.create({
    trigger: "#closing",
    start: "top 80%",
    once: true,
    onEnter: () => {
      if (reduceMotion) return;
      gsap.fromTo(
        ".closing__mark span",
        { scale: 0, opacity: 0 },
        { scale: 1, opacity: 1, duration: 0.6, stagger: 0.12, ease: "back.out(2)" }
      );
    },
  });
}
