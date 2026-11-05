/* ==========================================================================
   CHAPTER 02 — "The Data Factory"
   A five-stage pipeline you can scroll through and inspect, with four
   different kinds of raw material.
   ========================================================================== */
import { gsap, ScrollTrigger, reduceMotion, seededRandom, clamp } from "./core.js";

const STAGES = [
  {
    name: "COLLECTION",
    lede: "Before a model exists, someone has to decide what the world looks like — and gather it.",
    body:
      "Data is scraped from the web, licensed from publishers, recorded in labs, or measured by sensors. The choice of source is a design decision: it decides what the model can know and what it will never see.",
    points: [
      "Convenience sampling: what is easy to collect is rarely what is representative.",
      "Permission and consent are often unclear or missing entirely.",
      "Rare events — a factory fault, a tropical disease — are rare in the data too.",
    ],
  },
  {
    name: "CLEANING",
    lede: "Raw data is noisy. Duplicates, broken files and junk inflate a model's apparent skill.",
    body:
      "Cleaning removes exact and near duplicates, repairs corrupted records, normalises formats and strips accidental personal information. It is unglamorous, slow, and the single biggest lever on final quality.",
    points: [
      "Duplicates leak between train and test, making results look better than they are.",
      "Encoding errors and broken files teach the model noise instead of signal.",
      "Names, addresses and IDs must be removed or hashed, not just ignored.",
    ],
  },
  {
    name: "LABELLING",
    lede: "Supervised learning needs answers. Somebody — usually many people — has to supply them.",
    body:
      "Labellers mark images, transcribe speech or grade responses. Instructions and agreement checks keep them consistent. Label quality becomes the ceiling on model quality: if two humans cannot agree, a model cannot learn the difference.",
    points: [
      "Labellers carry their own assumptions, and those enter the data.",
      "Ambiguous categories produce inconsistent labels — noise the model memorises.",
      "Scale is expensive: large datasets may be labelled by underpaid crowd work.",
    ],
  },
  {
    name: "PREPARATION",
    lede: "The same dataset is split three ways, and the split decides whether your results mean anything.",
    body:
      "Inputs are normalised — pixels resized, text tokenised, audio resampled — then shuffled and split into training, validation and test sets. The training set teaches; the validation set tunes; the test set is opened once, at the end.",
    points: [
      "A test set the model has seen proves nothing except memorisation.",
      "Class imbalance teaches the model to ignore the rare class.",
      "Normalisation must use training statistics only, not test statistics.",
    ],
  },
  {
    name: "TRAINING",
    lede: "The data never enters the model. It only shapes the numbers inside it.",
    body:
      "Batches of examples flow through the network. The loss measures the error; backpropagation assigns blame to each weight; gradient descent nudges them. After many passes the weights encode statistical patterns — and the biases — of the data.",
    points: [
      "More data helps only if it is relevant and correctly labelled.",
      "A model can memorise its training set and still fail on new inputs.",
      "Bias in the data becomes behaviour in the system. Retraining does not remove it.",
    ],
  },
];

/* --------------------------------------------------------------------------
   What each kind of data looks like at each stage
   -------------------------------------------------------------------------- */
const MATERIALS = {
  text: {
    label: "TEXT",
    samples: [
      [["web pages"], ["books"], ["code"], ["forum posts"], ["contracts"], ["subtitles"]],
      [["duplicate article", true], ["broken encoding", true], ["html tags", true], ["clean prose"], ["numbers"], ["emoji"]],
      [["positive review"], ["negative review"], ["neutral"], ["sarcasm?", true], ["spam", true], ["unlabelled", true]],
      [["tokenised"], ["lowercased"], ["truncated 512"], ["shuffled"], ["train 80%"], ["test 10%"]],
      [["batch 001"], ["loss 0.41"], ["loss 0.22"], ["loss 0.11"], ["weights updated"], ["checkpoint"]],
    ],
    sampleStrip: [
      ["“The river froze in 1814.”"], ["“The river froze in 1814.”"], ["duplicate copy", true],
      ["tokens: The | river | froze"], ["batch of 32 sequences"],
    ],
  },
  image: {
    label: "IMAGES",
    samples: [
      [["photographs"], ["medical scans"], ["satellite"], ["street scenes"], ["product shots"], ["illustrations"]],
      [["blurred frame", true], ["duplicate", true], ["watermarked", true], ["cropped"], ["colour corrected"], ["EXIF stripped"]],
      [["cat · 1.0"], ["cat · 0.7", true], ["dog · 0.2", true], ["box: 34,88,210,260"], ["mask", true], ["unlabelable", true]],
      [["224 × 224"], ["normalised"], ["flipped"], ["cropped"], ["train 80%"], ["test 10%"]],
      [["batch 001"], ["loss 0.63"], ["loss 0.28"], ["loss 0.19"], ["weights updated"], ["checkpoint"]],
    ],
    sampleStrip: [
      ["retinal scan · 512×512"], ["retinal scan · 512×512"], ["motion blur", true],
      ["resize → 224×224 → normalise"], ["batch of 32 images"],
    ],
  },
  audio: {
    label: "AUDIO",
    samples: [
      [["speech"], ["music"], ["noise"], ["call centre"], ["radio"], ["field recordings"]],
      [["clipping", true], ["silence", true], ["background hum", true], ["loudness matched"], ["resampled 16 kHz"], ["trimmed"]],
      [["transcript aligned"], ["speaker A/B"], ["word timings"], ["overlapping speech", true], ["accent missing", true], ["misheard word", true]],
      [["16 kHz mono"], ["mel spectrogram"], ["2 s windows"], ["normalised"], ["train 80%"], ["test 10%"]],
      [["batch 001"], ["loss 1.42"], ["loss 0.71"], ["loss 0.44"], ["weights updated"], ["checkpoint"]],
    ],
    sampleStrip: [
      ["“book a table for two” · 3.1 s"], ["“book a table for two” · 3.1 s"], ["street noise", true],
      ["16 kHz → mel → 2 s windows"], ["batch of 32 clips"],
    ],
  },
  numeric: {
    label: "NUMBERS",
    samples: [
      [["sensor logs"], ["transactions"], ["weather"], ["traffic counts"], ["energy meters"], ["medical records"]],
      [["missing values", true], ["outlier 9999", true], ["duplicate row", true], ["unit mismatch", true], ["time aligned"], ["scaled"]],
      [["fraud · yes"], ["fraud · no"], ["delayed label", true], ["disputed label", true], ["proxy label", true], ["class 1.2%"]],
      [["mean 0 · std 1"], ["chronological split"], ["no leakage"], ["imputed"], ["train 80%"], ["test 10%"]],
      [["batch 001"], ["loss 0.68"], ["loss 0.31"], ["loss 0.24"], ["weights updated"], ["checkpoint"]],
    ],
    sampleStrip: [
      ["t=0.00 · 412.8 kWh"], ["t=0.05 · 413.1 kWh"], ["sensor offline", true],
      ["standardise → lag features"], ["batch of 256 rows"],
    ],
  },
};

/* --------------------------------------------------------------------------
   Build + wire
   -------------------------------------------------------------------------- */
export function initDataFactory() {
  const root = document.getElementById("factory");
  const stagesEl = document.getElementById("factory-stages");
  const detailKicker = document.getElementById("detail-kicker");
  const detailTitle = document.getElementById("detail-title");
  const detailLede = document.getElementById("detail-lede");
  const detailBody = document.getElementById("detail-body");
  const detailPoints = document.getElementById("detail-points");
  const detailSample = document.getElementById("detail-sample");
  const tabs = [...document.querySelectorAll(".factory__types .tab")];
  const detailBox = document.getElementById("factory-detail");
  if (!root || !stagesEl) return;

  let activeType = "text";
  let activeStage = 0;
  let didBuild = false;

  /* -- stage cards -------------------------------------------------------- */
  const stageButtons = STAGES.map((stage, i) => {
    const li = document.createElement("li");
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "stage";
    btn.dataset.stage = String(i);
    btn.setAttribute("aria-label", `Inspect stage ${i + 1}: ${stage.name}`);
    btn.innerHTML =
      `<span class="stage__index">0${i + 1}</span>` +
      `<span class="stage__name">${stage.name}</span>` +
      `<span class="stage__sample"></span>`;
    btn.addEventListener("click", () => {
      selectStage(i, true);
    });
    li.appendChild(btn);
    stagesEl.appendChild(li);
    return btn;
  });

  /* -- detail rendering --------------------------------------------------- */
  function renderStage(index, animate) {
    const stage = STAGES[index];
    const material = MATERIALS[activeType];
    const chips = material.samples[index] || [];

    if (detailKicker) detailKicker.textContent = `STAGE 0${index + 1} / 05 · ${material.label}`;
    if (detailTitle) detailTitle.textContent = stage.name;
    if (detailLede) detailLede.textContent = stage.lede;
    if (detailBody) detailBody.textContent = stage.body;
    if (detailPoints) {
      detailPoints.innerHTML = stage.points.map((p) => `<li>${p}</li>`).join("");
    }
    if (detailSample) {
      detailSample.innerHTML = (material.sampleStrip || [])
        .map(([text, bad]) => `<span class="sample-chip${bad ? " is-bad" : ""}">${text}</span>`)
        .join("");
    }

    stageButtons.forEach((btn, i) => {
      btn.classList.toggle("is-active", i === index);
      btn.classList.toggle("is-done", i < index);
      btn.querySelector(".stage__sample").innerHTML = (material.samples[i] || [])
        .map(([text, bad]) => `<span class="chip${bad ? " is-bad" : ""}">${text}</span>`)
        .join("");
    });

    if (animate && !reduceMotion && detailBox) {
      gsap.fromTo(
        [detailTitle, detailLede, detailBody, detailPoints, detailSample].filter(Boolean),
        { opacity: 0, y: 10 },
        { opacity: 1, y: 0, duration: 0.45, stagger: 0.035, ease: "power2.out", overwrite: true }
      );
    }
  }

  function selectStage(index, scrollToIt) {
    activeStage = clamp(index, 0, STAGES.length - 1);
    renderStage(activeStage, true);
    if (scrollToIt && trigger) {
      const target = trigger.start + (trigger.end - trigger.start) * ((activeStage + 0.5) / STAGES.length);
      const reduce = reduceMotion ? "auto" : "smooth";
      window.scrollTo({ top: target, behavior: reduce });
    }
  }

  /* -- type tabs ---------------------------------------------------------- */
  tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      activeType = tab.dataset.type || "text";
      tabs.forEach((t) => {
        const on = t === tab;
        t.classList.toggle("is-active", on);
        t.setAttribute("aria-selected", String(on));
      });
      renderStage(activeStage, true);
    });
  });

  /* -- scroll drive ------------------------------------------------------- */
  let trigger = ScrollTrigger.create({
    trigger: root,
    start: "top 72%",
    end: "bottom 68%",
    onUpdate: (self) => {
      const next = clamp(Math.floor(self.progress * STAGES.length), 0, STAGES.length - 1);
      if (next !== activeStage) {
        activeStage = next;
        renderStage(activeStage, true);
      }
    },
  });

  /* -- stream dots -------------------------------------------------------- */
  const streamGroup = document.getElementById("stream-dots");
  if (streamGroup) {
    const random = seededRandom(77);
    for (let i = 0; i < 16; i++) {
      const c = document.createElementNS("http://www.w3.org/2000/svg", "circle");
      c.setAttribute("cx", "0");
      c.setAttribute("cy", String(22 + (i % 4) * 5));
      c.setAttribute("r", String(1.2 + random() * 1.4));
      c.setAttribute("opacity", "0.7");
      streamGroup.appendChild(c);
      if (!reduceMotion) {
        gsap.fromTo(
          c,
          { attr: { cx: -20 }, opacity: 0 },
          {
            attr: { cx: 1020 },
            opacity: 0.75,
            duration: 3.2 + random() * 4,
            delay: random() * 4,
            repeat: -1,
            ease: "none",
          }
        );
      }
    }
  }

  renderStage(0, false);
  didBuild = true;

  // Rebuild chip widths once fonts are ready.
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(() => renderStage(activeStage, false));
  }

  return { didBuild };
}
