/* ==========================================================================
   CHAPTER 07 — "Power does not mean perfection."
   Restrained presentation: a list of failure modes, and a judgement exercise
   where the visitor decides what a careful person should do.
   ========================================================================== */
import { gsap, reduceMotion } from "./core.js";

const LIMITS = [
  {
    title: "Hallucination",
    tag: "LANGUAGE",
    body:
      "A language model produces the most plausible continuation of the text so far. Plausible is not true. It can invent a book, a page number, a legal precedent or a quotation — and state it with exactly the same confidence as a fact. This is not a bug that a patch removes; it follows from what the system is optimising for.",
    fix:
      "Treat output as a draft from a fast, confident colleague with no memory of checking. Demand sources, open those sources, and never let a citation you have not verified reach a reader.",
  },
  {
    title: "Bias",
    tag: "DATA",
    body:
      "A model learns the statistical shape of its training data, including historical inequalities and the assumptions of the people who labelled it. If past hiring favoured one group, a model trained on those decisions will reproduce that preference and present it as an objective score.",
    fix:
      "Audit outcomes across groups, not just overall accuracy. Ask who is in the data, who is missing, and whose judgement became the label.",
  },
  {
    title: "Privacy",
    tag: "DATA",
    body:
      "Training data can contain personal information, and models can memorise fragments of it. Anything you type into a hosted assistant may be stored, reviewed or used to improve a product, depending on the terms. 'It feels private' is not a privacy guarantee.",
    fix:
      "Read the data policy before pasting. Keep personal and confidential material in approved systems, and assume anything entered into a free tool could be retained.",
  },
  {
    title: "Misinformation",
    tag: "SOCIETY",
    body:
      "Generating convincing text, images and voices is now cheap. The cost of producing a false claim has collapsed while the cost of verifying one has not. Automated systems can also amplify whatever spreads fastest, regardless of whether it is accurate.",
    fix:
      "Check the source before sharing, prefer provenance signals such as signed metadata, and be most suspicious of exactly the material that confirms what you already believe.",
  },
  {
    title: "Copyright & attribution",
    tag: "LAW",
    body:
      "Generative models are trained on human work. Whether that use is lawful, how creators should be credited or paid, and who owns an output are live legal questions in many countries. Some models can reproduce substantial parts of the material they were trained on.",
    fix:
      "Check the licence of a tool before commercial use, keep human authorship documented, and treat an unattributed imitation of a living artist's style as an ethical problem even where the law is unclear.",
  },
  {
    title: "Human oversight",
    tag: "ACCOUNTABILITY",
    body:
      "A system that is right most of the time teaches people to stop checking — a well-documented effect called automation bias. But a model cannot be held responsible. If a diagnosis, a loan refusal or a suspension is wrong, the accountability has to land on a person or an institution that could have said no.",
    fix:
      "Keep a named human accountable for consequential decisions. Make the model's uncertainty visible, log what it recommended, and let people override it without penalty.",
  },
  {
    title: "Work & responsibility",
    tag: "SOCIETY",
    body:
      "Automation rarely deletes a whole job at once; it reshapes tasks inside one. Drafting, summarising and first-pass analysis move to the model, while verification and exception-handling move to the person — often with less time and more volume. The people whose work changes are usually not the people who chose the deployment.",
    fix:
      "Be specific about which tasks are automated and which are augmented. Train people for the supervision work, measure the change in workload, and decide in advance who is responsible when the system is wrong.",
  },
];

const SCENARIOS = [
  {
    kicker: "SCENARIO 01 · A CONFIDENT CITATION",
    prompt: "A student asks a chatbot for sources on the 1857 rebellion in northern India.",
    output:
      "“Certainly. See <em>The Sepoy War</em> by A. R. Havelock (1859), pages 214–231, and <em>Lucknow: A City Under Siege</em> by M. F. Ali (1902), page 88.”",
    options: [
      { label: "USE THE CITATIONS — PAGE NUMBERS ARE SPECIFIC", verdict: "wrong", why: "Specificity is the cheapest thing a language model can imitate. Wrong page numbers are a classic hallucination: the format looks authoritative precisely because nothing was checked." },
      { label: "VERIFY EACH TITLE AND AUTHOR BEFORE CITING", verdict: "right", why: "Correct. Titles, authors and page numbers are all generated guesses. A library catalogue or archive takes a minute and settles it." },
      { label: "ASSUME EVERYTHING IS FABRICATED AND STOP", verdict: "wrong", why: "Also wrong, in the other direction. The tool is useful for orientation and framing; the response is to verify, not to dismiss." },
    ],
  },
  {
    kicker: "SCENARIO 02 · THE HIRING MODEL",
    prompt:
      "A company trains a CV-screening model on ten years of its own hiring decisions. It begins rating graduates of one university 18% lower.",
    output:
      "“Model v2 · AUC 0.81. Ranking is based on similarity to previously successful hires.”",
    options: [
      { label: "IT'S MATHEMATICAL, SO IT'S NEUTRAL", verdict: "wrong", why: "The model learned ten years of human decisions, including whatever bias those decisions contained. A number is not a neutral object; it inherits the process that produced it." },
      { label: "DELETE THE UNIVERSITY FIELD AND SHIP IT", verdict: "wrong", why: "Removing one field does not remove the pattern. The information leaks through correlated features (activities, address, previous employers), and the audit you skipped stays skipped." },
      { label: "AUDIT OUTCOMES ACROSS GROUPS, THEN FIX THE PROCESS", verdict: "right", why: "Correct. Measure selection rates by group, inspect the historical labels, involve the people affected — and do not ship a consequential ranking system without ongoing review." },
    ],
  },
  {
    kicker: "SCENARIO 03 · THE CONFIDENTIAL CONTRACT",
    prompt: "You need a fast summary of a client's contract. A free chat assistant offers to read the whole thing if you paste the text.",
    output:
      "“Paste your document below. We may store conversations to improve our models. See terms.”",
    options: [
      { label: "PASTE IT — THE DEADLINE IS TOMORROW", verdict: "wrong", why: "You just read the sentence that should stop you. Pasting confidential client material into a service that may retain it can breach both the contract and data-protection law." },
      { label: "USE AN APPROVED TOOL, OR REDACT FIRST", verdict: "right", why: "Correct. Check the policy, use a system your organisation has approved, and redact names and figures when the tool is not cleared for them." },
      { label: "PASTE ONLY THE CONFIDENTIAL PARTS", verdict: "wrong", why: "That is the inverse of redaction. The confidential parts are exactly the ones that must not leave the approved environment." },
    ],
  },
];

export function initLimits() {
  const list = document.getElementById("limits-list");
  const verdictStage = document.getElementById("verdict-stage");
  const verdictProgress = document.getElementById("verdict-progress");
  const verdictRestart = document.getElementById("verdict-restart");

  /* -- failure modes ------------------------------------------------------ */
  if (list) {
    list.innerHTML = LIMITS.map(
      (limit, i) => `
      <li class="limit" data-limit="${i}">
        <button class="limit__head" type="button" aria-expanded="false">
          <span class="limit__num">0${i + 1}</span>
          <span class="limit__title">${limit.title}</span>
          <span class="limit__tag">${limit.tag}</span>
          <span class="limit__toggle" aria-hidden="true"></span>
        </button>
        <div class="limit__body">
          <div class="limit__body-inner">
            <p>${limit.body}</p>
            <div class="limit__fix">
              <h4>WHAT A CAREFUL PERSON DOES</h4>
              <p>${limit.fix}</p>
            </div>
          </div>
        </div>
      </li>`
    ).join("");

    const items = [...list.querySelectorAll(".limit")];

    function close(item) {
      const body = item.querySelector(".limit__body");
      const head = item.querySelector(".limit__head");
      item.classList.remove("is-open");
      head.setAttribute("aria-expanded", "false");
      if (reduceMotion) {
        body.style.height = "0px";
      } else {
        gsap.to(body, { height: 0, duration: 0.45, ease: "power2.inOut" });
      }
    }

    function open(item) {
      const body = item.querySelector(".limit__body");
      const head = item.querySelector(".limit__head");
      item.classList.add("is-open");
      head.setAttribute("aria-expanded", "true");
      if (reduceMotion) {
        body.style.height = "auto";
        return;
      }
      gsap.set(body, { height: "auto" });
      const h = body.offsetHeight;
      gsap.fromTo(body, { height: 0 }, { height: h, duration: 0.5, ease: "power2.out" });
    }

    items.forEach((item) => {
      const head = item.querySelector(".limit__head");
      head.addEventListener("click", () => {
        const isOpen = item.classList.contains("is-open");
        items.forEach((other) => {
          if (other !== item && other.classList.contains("is-open")) close(other);
        });
        isOpen ? close(item) : open(item);
      });
    });
  }

  /* -- judgement exercise ------------------------------------------------- */
  if (!verdictStage) return;

  let index = 0;
  let answered = false;

  function render() {
    const scenario = SCENARIOS[index];
    answered = false;
    verdictStage.innerHTML = `
      <div class="scenario">
        <span class="scenario__kicker">${scenario.kicker}</span>
        <p class="scenario__prompt">${scenario.prompt}</p>
        <div class="scenario__output">${scenario.output}</div>
        <div class="scenario__options" role="group" aria-label="Choose a response">
          ${scenario.options
            .map(
              (opt, i) =>
                `<button class="opt" type="button" data-opt="${i}" aria-label="Option ${i + 1}: ${opt.label
                  .replace(/"/g, "")
                  .toLowerCase()}">${opt.label}</button>`
            )
            .join("")}
        </div>
        <div class="scenario__feedback" id="scenario-feedback" aria-live="polite">Choose a response to see the reasoning.</div>
      </div>`;

    if (verdictProgress) verdictProgress.textContent = `SCENARIO ${index + 1} / ${SCENARIOS.length}`;

    const options = [...verdictStage.querySelectorAll(".opt")];
    const feedback = verdictStage.querySelector("#scenario-feedback");

    options.forEach((btn) => {
      btn.addEventListener("click", () => {
        if (answered) return;
        answered = true;
        const choice = scenario.options[Number(btn.dataset.opt)];
        options.forEach((otherBtn, i) => {
          const opt = scenario.options[i];
          otherBtn.disabled = true;
          if (opt.verdict === "right") otherBtn.classList.add("is-correct");
          if (otherBtn === btn && opt.verdict === "wrong") otherBtn.classList.add("is-wrong");
        });

        if (feedback) {
          feedback.innerHTML = `<b>${choice.verdict === "right" ? "Yes." : "Not quite."}</b> ${choice.why}`;
          feedback.classList.toggle("is-right", choice.verdict === "right");
        }

        if (!reduceMotion) {
          gsap.fromTo(feedback, { opacity: 0, y: 8 }, { opacity: 1, y: 0, duration: 0.4, ease: "power2.out" });
        }

        // Offer the next scenario once an answer is in.
        const next = document.createElement("button");
        next.type = "button";
        next.className = "btn btn--ghost btn--tiny";
        next.style.marginTop = "16px";
        next.textContent = index < SCENARIOS.length - 1 ? "NEXT SCENARIO →" : "START AGAIN";
        next.addEventListener("click", () => {
          index = index < SCENARIOS.length - 1 ? index + 1 : 0;
          render();
          if (!reduceMotion) {
            gsap.fromTo(
              verdictStage,
              { opacity: 0, y: 14 },
              { opacity: 1, y: 0, duration: 0.45, ease: "power2.out" }
            );
          }
        });
        feedback && feedback.appendChild(next);
      });
    });
  }

  render();

  if (verdictRestart) {
    verdictRestart.addEventListener("click", () => {
      index = 0;
      render();
    });
  }
}
