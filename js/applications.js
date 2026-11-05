/* ==========================================================================
   CHAPTER 06 — "From the screen into the world."
   A pinned, horizontally-scrubbed narrative gallery of eight domains.
   ========================================================================== */
import { gsap, ScrollTrigger, reduceMotion } from "./core.js";

/* --------------------------------------------------------------------------
   Small bespoke diagrams — one per domain, drawn as inline SVG
   -------------------------------------------------------------------------- */
const VISUALS = {
  healthcare: `
    <svg viewBox="0 0 320 180" role="img" aria-label="Retinal scan grid with flagged region">
      <defs>
        <radialGradient id="scanGlow"><stop offset="0" stop-color="#4b7dff" stop-opacity=".5"/><stop offset="1" stop-color="#4b7dff" stop-opacity="0"/></radialGradient>
      </defs>
      <rect x="18" y="18" width="132" height="144" class="vis-fill"/>
      <circle cx="84" cy="90" r="58" fill="url(#scanGlow)"/>
      <circle cx="84" cy="90" r="44" class="vis-line"/>
      <circle cx="84" cy="90" r="12" class="vis-line"/>
      <g class="vis-line" stroke-opacity=".18">
        <path d="M30 54h108M30 90h108M30 126h108M48 30v120M84 30v120M120 30v120"/>
      </g>
      <circle cx="104" cy="70" r="13" class="vis-fill" stroke="#38e1f0" fill="rgba(56,225,240,.16)"/>
      <path d="M117 66h38v18h-38z" class="vis-line" stroke="#38e1f0"/>
      <text x="121" y="78" class="vis-text vis-text--bright">LESION · 0.91</text>
      <g>
        <rect x="176" y="38" width="124" height="6" class="vis-line" stroke-opacity=".2"/>
        <rect x="176" y="38" width="96" height="6" fill="#4b7dff" opacity=".75"/>
        <text x="176" y="30" class="vis-text">CONFIDENCE</text>
        <rect x="176" y="70" width="124" height="6" class="vis-line" stroke-opacity=".2"/>
        <rect x="176" y="70" width="54" height="6" fill="#8b5cf6" opacity=".7"/>
        <text x="176" y="62" class="vis-text">HUMAN REVIEW</text>
        <text x="176" y="102" class="vis-text vis-text--bright">TRIAGE · PRIORITY 2</text>
        <text x="176" y="118" class="vis-text">SCAN 04 / 128</text>
        <text x="176" y="134" class="vis-text">MODEL v3 · 2024</text>
      </g>
      <circle cx="104" cy="70" r="24" class="vis-pulse" fill="none" stroke="#38e1f0" stroke-width=".8"/>
    </svg>`,
  education: `
    <svg viewBox="0 0 320 180" role="img" aria-label="Adaptive learning path with mastery bars">
      <path d="M28 140 C 80 140, 78 72, 130 72 S 190 120, 236 62" class="vis-line vis-line--accent" stroke-dasharray="4 5"/>
      <g class="vis-fill">
        <circle cx="28" cy="140" r="7"/><circle cx="130" cy="72" r="7"/>
      </g>
      <circle cx="236" cy="62" r="7" fill="rgba(56,225,240,.2)" stroke="#38e1f0"/>
      <g>
        <text x="22" y="158" class="vis-text">START</text>
        <text x="118" y="54" class="vis-text">PRACTICE</text>
        <text x="214" y="44" class="vis-text vis-text--bright">MASTERY</text>
      </g>
      <g>
        <rect x="196" y="90" width="98" height="5" class="vis-line" stroke-opacity=".2"/>
        <rect x="196" y="90" width="72" height="5" fill="#4b7dff" opacity=".8"/>
        <rect x="196" y="108" width="98" height="5" class="vis-line" stroke-opacity=".2"/>
        <rect x="196" y="108" width="46" height="5" fill="#8b5cf6" opacity=".75"/>
        <rect x="196" y="126" width="98" height="5" class="vis-line" stroke-opacity=".2"/>
        <rect x="196" y="126" width="86" height="5" fill="#38e1f0" opacity=".7"/>
      </g>
      <text x="28" y="40" class="vis-text vis-text--bright">NEXT ITEM CHOSEN BY</text>
      <text x="28" y="54" class="vis-text">ESTIMATED KNOWLEDGE</text>
    </svg>`,
  agriculture: `
    <svg viewBox="0 0 320 180" role="img" aria-label="Aerial field rows with disease detection">
      <g class="vis-line" stroke-opacity=".2">
        <path d="M24 36h272M24 66h272M24 96h272M24 126h272M24 156h272"/>
      </g>
      <g fill="rgba(75,125,255,.16)" stroke="rgba(75,125,255,.4)">
        <rect x="38" y="42" width="18" height="18"/><rect x="86" y="42" width="18" height="18"/>
        <rect x="134" y="42" width="18" height="18"/><rect x="38" y="102" width="18" height="18"/>
        <rect x="86" y="132" width="18" height="18"/><rect x="182" y="102" width="18" height="18"/>
      </g>
      <rect x="134" y="132" width="18" height="18" fill="rgba(240,178,58,.2)" stroke="#f0b23a"/>
      <path d="M143 150v14h44" class="vis-line" stroke="#f0b23a"/>
      <text x="190" y="170" class="vis-text" fill="#f0b23a">STRESS DETECTED · ROW 5</text>
      <circle cx="143" cy="141" r="22" class="vis-pulse" fill="none" stroke="#f0b23a" stroke-width=".8"/>
      <g>
        <text x="236" y="42" class="vis-text vis-text--bright">PLOT 12-B</text>
        <text x="236" y="58" class="vis-text">Moisture 41%</text>
        <text x="236" y="74" class="vis-text">Yield est. −8%</text>
        <text x="236" y="90" class="vis-text">Action: irrigate</text>
      </g>
      <g stroke="#38e1f0" stroke-opacity=".6" fill="none">
        <path d="M286 132l16-10M286 140h20M286 148l16 10"/>
      </g>
    </svg>`,
  transportation: `
    <svg viewBox="0 0 320 180" role="img" aria-label="Road scene with perception boxes and sensor arcs">
      <path d="M70 180 L118 0 M250 180 L202 0" class="vis-line"/>
      <path d="M160 180 L160 0" class="vis-line" stroke-dasharray="12 14" stroke-opacity=".35"/>
      <rect x="126" y="70" width="44" height="58" rx="4" class="vis-fill" stroke="#38e1f0"/>
      <text x="126" y="64" class="vis-text" fill="#38e1f0">CAR · 0.98</text>
      <rect x="88" y="102" width="20" height="34" class="vis-fill vis-fill--violet"/>
      <text x="60" y="98" class="vis-text">PED · 0.94</text>
      <g stroke="#4b7dff" stroke-opacity=".5" fill="none">
        <path d="M60 166 Q160 116 260 166"/><path d="M74 174 Q160 132 246 174"/>
      </g>
      <g fill="#38e1f0"><circle cx="126" cy="118" r="2"/><circle cx="146" cy="128" r="2"/><circle cx="118" cy="140" r="2"/></g>
      <text x="18" y="26" class="vis-text vis-text--bright">LIDAR · 20 Hz</text>
      <text x="18" y="40" class="vis-text">CAM · 60 FPS</text>
      <text x="236" y="26" class="vis-text">HUMAN IN</text>
      <text x="236" y="40" class="vis-text">CONTROL</text>
    </svg>`,
  accessibility: `
    <svg viewBox="0 0 320 180" role="img" aria-label="Live speech turned into captions">
      <g fill="#4b7dff" opacity=".8">
        ${Array.from({ length: 24 }, (_, i) => {
          const h = 6 + Math.abs(Math.sin(i * 1.31) * 34);
          return `<rect x="${20 + i * 8}" y="${58 - h / 2}" width="3" height="${h.toFixed(1)}" rx="1.5"/>`;
        }).join("")}
      </g>
      <path d="M216 40v40" class="vis-line" stroke="#8b5cf6"/>
      <path d="M212 34l8 6-8 6" fill="none" stroke="#8b5cf6"/>
      <g>
        <rect x="228" y="46" width="76" height="4" fill="#38e1f0" opacity=".8"/>
        <rect x="228" y="58" width="54" height="4" fill="#38e1f0" opacity=".45"/>
        <rect x="228" y="70" width="66" height="4" fill="#38e1f0" opacity=".3"/>
      </g>
      <g>
        <rect x="20" y="100" width="280" height="1" fill="rgba(255,255,255,.1)"/>
        <text x="20" y="122" class="vis-text vis-text--bright">“THE NEXT TRAIN LEAVES FROM PLATFORM</text>
        <text x="20" y="138" class="vis-text vis-text--bright">FOUR IN TWO MINUTES.”</text>
        <text x="20" y="158" class="vis-text">CAPTIONS · 240 ms LATENCY</text>
        <text x="222" y="158" class="vis-text">EN · HI · ES</text>
      </g>
    </svg>`,
  research: `
    <svg viewBox="0 0 320 180" role="img" aria-label="Folded protein structure with prediction confidence">
      <path d="M46 132 C 86 132, 74 46, 118 46 S 168 128, 204 96 S 244 44, 274 60"
            fill="none" stroke="#4b7dff" stroke-width="3" stroke-linecap="round" opacity=".85"/>
      <path d="M46 132 C 86 132, 74 46, 118 46 S 168 128, 204 96 S 244 44, 274 60"
            fill="none" stroke="#38e1f0" stroke-width="1" stroke-dasharray="2 5"/>
      ${[
        [46, 132],
        [118, 46],
        [204, 96],
        [274, 60],
      ]
        .map(([x, y]) => `<circle cx="${x}" cy="${y}" r="4" fill="#0a0d16" stroke="#8b5cf6" stroke-width="1.4"/>`)
        .join("")}
      <g>
        <text x="36" y="164" class="vis-text">RESIDUE 1</text>
        <text x="212" y="164" class="vis-text">RESIDUE 441</text>
        <text x="196" y="30" class="vis-text vis-text--bright">pLDDT 92.4</text>
      </g>
      <g>
        <rect x="18" y="18" width="96" height="1" fill="rgba(255,255,255,.12)"/>
        <text x="18" y="14" class="vis-text">PREDICTION</text>
      </g>
      <g class="vis-pulse" fill="none" stroke="#8b5cf6" stroke-width=".7">
        <circle cx="204" cy="96" r="14"/>
      </g>
    </svg>`,
  manufacturing: `
    <svg viewBox="0 0 320 180" role="img" aria-label="Conveyor inspection with a flagged defect">
      <path d="M18 118h284" class="vis-line"/>
      <g fill="rgba(75,125,255,.14)" stroke="rgba(75,125,255,.45)">
        <rect x="34" y="92" width="34" height="26" rx="2"/>
        <rect x="92" y="92" width="34" height="26" rx="2"/>
        <rect x="150" y="92" width="34" height="26" rx="2"/>
        <rect x="208" y="92" width="34" height="26" rx="2"/>
        <rect x="266" y="92" width="34" height="26" rx="2"/>
      </g>
      <rect x="150" y="92" width="34" height="26" rx="2" fill="rgba(240,178,58,.12)" stroke="#f0b23a"/>
      <path d="M167 92V58h52" class="vis-line" stroke="#f0b23a"/>
      <text x="222" y="62" class="vis-text" fill="#f0b23a">SCRATCH · 12 px</text>
      <g>
        <text x="18" y="44" class="vis-text vis-text--bright">INSPECTION 04</text>
        <text x="18" y="58" class="vis-text">1 204 parts / min</text>
        <rect x="18" y="70" width="80" height="4" class="vis-line" stroke-opacity=".2"/>
        <rect x="18" y="70" width="58" height="4" fill="#4b7dff" opacity=".7"/>
      </g>
      <g stroke="rgba(255,255,255,.14)" fill="none">
        <circle cx="286" cy="42" r="18"/><path d="M286 42l10-8"/>
      </g>
    </svg>`,
  creative: `
    <svg viewBox="0 0 320 180" role="img" aria-label="Creative tool timeline with generated variants">
      <g>
        <rect x="20" y="34" width="60" height="40" fill="rgba(75,125,255,.16)" stroke="rgba(75,125,255,.45)"/>
        <rect x="20" y="82" width="60" height="40" fill="rgba(139,92,246,.16)" stroke="rgba(139,92,246,.45)"/>
        <rect x="20" y="130" width="60" height="28" fill="rgba(56,225,240,.1)" stroke="rgba(56,225,240,.35)"/>
        <text x="26" y="58" class="vis-text">DRAFT</text>
        <text x="26" y="106" class="vis-text">VARIANT</text>
        <text x="26" y="148" class="vis-text">FINAL</text>
      </g>
      <path d="M88 54h34M88 102h34M88 144h34" class="vis-line" stroke-dasharray="3 4"/>
      <g>
        <rect x="126" y="34" width="174" height="40" fill="none" stroke="rgba(255,255,255,.1)"/>
        <rect x="126" y="82" width="174" height="40" fill="none" stroke="rgba(255,255,255,.1)"/>
        <rect x="126" y="130" width="174" height="28" fill="none" stroke="rgba(255,255,255,.1)"/>
      </g>
      <g fill="#4b7dff" opacity=".55">
        ${Array.from({ length: 18 }, (_, i) => {
          const h = 4 + Math.abs(Math.sin(i * 0.9) * 26);
          return `<rect x="${132 + i * 9}" y="${54 - h / 2}" width="4" height="${h.toFixed(1)}" rx="1"/>`;
        }).join("")}
      </g>
      <g stroke="#8b5cf6" stroke-opacity=".65" fill="none">
        <path d="M132 108c14-18 26 18 40 0s26 18 40 0 24 14 36 0"/>
      </g>
      <text x="132" y="152" class="vis-text">TIMELINE · 00:42</text>
      <text x="236" y="152" class="vis-text">3 LAYERS</text>
      <text x="236" y="26" class="vis-text vis-text--bright">HUMAN EDIT</text>
    </svg>`,
};

const APPS = [
  {
    key: "healthcare",
    cat: "MEDICINE",
    title: "Healthcare",
    desc: "Models read scans, flag anomalies and help prioritise the queue — trained on thousands of labelled images rather than a doctor's rules.",
    example:
      "At Moorfields Eye Hospital, a deep-learning system trained on retinal scans matched expert clinicians at recommending referrals for over 50 eye diseases (2018 study).",
    benefits: ["Faster triage for overloaded clinics", "Consistent screening in remote areas", "Second opinion that never gets tired"],
    limits: ["Training data often from one hospital", "Needs clinician oversight", "Rare conditions are underrepresented"],
  },
  {
    key: "education",
    cat: "LEARNING",
    title: "Education",
    desc: "Adaptive practice systems estimate what a learner knows and choose the next question — a statistical model of progress, not a replacement for a teacher.",
    example:
      "Spaced-repetition and tutoring systems adjust difficulty after every answer, and writing assistants give instant feedback on drafts. The teacher still sets the goal.",
    benefits: ["Practice matched to each learner", "Instant feedback at any hour", "Frees teacher time for discussion"],
    limits: ["Optimises what is measured, not what matters", "Can reinforce a learner's errors", "Access depends on devices"],
  },
  {
    key: "agriculture",
    cat: "FOOD",
    title: "Agriculture",
    desc: "Computer vision reads a leaf, a drone reads a field, a model forecasts a harvest. The inputs are cheap cameras and the output is a decision.",
    example:
      "Phone-based leaf-disease classifiers help smallholder farmers identify blight before it spreads; satellite models estimate yield field by field.",
    benefits: ["Early disease detection", "Precision irrigation and fertiliser", "Advice without an agronomist on site"],
    limits: ["Works poorly offline", "Training images from other climates", "Advice must fit local practice"],
  },
  {
    key: "transportation",
    cat: "MOBILITY",
    title: "Transportation",
    desc: "Perception models turn camera, radar and lidar data into objects and trajectories. Planning then decides what the vehicle should do next.",
    example:
      "Driver-assistance systems brake for pedestrians and keep lanes; autonomous shuttles run fixed routes in dozens of cities under remote supervision.",
    benefits: ["Collision avoidance assistance", "Smoother traffic flow", "Accessible mobility"],
    limits: ["Rare 'long tail' events", "Weather and glare", "Validation is genuinely hard"],
  },
  {
    key: "accessibility",
    cat: "ACCESS",
    title: "Accessibility",
    desc: "Speech recognition, image description and translation convert one channel of information into another — the clearest case of AI widening who can participate.",
    example:
      "Live captions in video calls, screen readers that describe an unlabelled photo, and text-to-speech in dozens of languages all run on models small enough for a phone.",
    benefits: ["Independence for disabled users", "Real-time translation", "Cheap, instant transcription"],
    limits: ["Accents and dialects degrade accuracy", "Descriptions can miss context", "Latency breaks conversation"],
  },
  {
    key: "research",
    cat: "SCIENCE",
    title: "Scientific research",
    desc: "Models propose structures, narrow search spaces and spot patterns in data too large to inspect — then experiments decide what is true.",
    example:
      "AlphaFold predicted structures for over 200 million proteins, and its predictions are now used to guide laboratory work in structural biology.",
    benefits: ["Cuts years of trial and error", "Surfaces hidden patterns", "Makes predictions testable"],
    limits: ["Predictions still need experiments", "Confidence varies by region", "Not a substitute for theory"],
  },
  {
    key: "manufacturing",
    cat: "INDUSTRY",
    title: "Manufacturing",
    desc: "Cameras inspect every part on a line; vibration sensors predict when a motor will fail. The model learns what a defect looks like from examples.",
    example:
      "Visual inspection systems catch scratches and solder faults faster than the eye, and predictive maintenance schedules repairs before a machine stops.",
    benefits: ["Consistent inspection", "Fewer unplanned stoppages", "Less wasted material"],
    limits: ["Rare defects have few examples", "Lighting changes break models", "False alarms cost trust"],
  },
  {
    key: "creative",
    cat: "CULTURE",
    title: "Creative industries",
    desc: "Generative tools produce drafts, variations and assets. They are trained on human work, and the questions of consent, credit and payment are unresolved.",
    example:
      "Storyboard artists sketch variants, composers generate stems, and writers use assistants for first drafts — with human direction and editing still doing the deciding.",
    benefits: ["Faster exploration of ideas", "Tools for non-specialists", "Cheap iteration"],
    limits: ["Training data provenance", "Homogenised output", "Credit and compensation"],
  },
];

/* --------------------------------------------------------------------------
   Init
   -------------------------------------------------------------------------- */
export function initApplications() {
  const track = document.getElementById("gallery-track");
  const viewport = document.querySelector(".gallery__viewport");
  const indexEl = document.getElementById("gallery-index");
  const nameEl = document.getElementById("gallery-name");
  const fillEl = document.getElementById("gallery-fill");
  if (!track) return;

  track.innerHTML = APPS.map(
    (app, i) => `
    <article class="app" data-app="${app.key}" data-index="${i}">
      <div class="app__top">
        <span class="app__index">0${i + 1}</span>
        <span class="app__cat">${app.cat}</span>
      </div>
      <h3 class="app__title">${app.title}</h3>
      <div class="app__visual">${VISUALS[app.key] || ""}</div>
      <p class="app__desc">${app.desc}</p>
      <p class="app__example"><b>IN PRACTICE</b>${app.example}</p>
      <div class="app__cols">
        <div class="app__col">
          <h4>WHAT IT GIVES</h4>
          <ul>${app.benefits.map((b) => `<li>${b}</li>`).join("")}</ul>
        </div>
        <div class="app__col app__col--limit">
          <h4>WHAT IT MISSES</h4>
          <ul>${app.limits.map((b) => `<li>${b}</li>`).join("")}</ul>
        </div>
      </div>
    </article>`
  ).join("");

  const panels = [...track.querySelectorAll(".app")];
  let current = -1;

  function setActive(index) {
    if (index === current && indexEl && indexEl.textContent !== "—") return;
    current = index;
    const app = APPS[index];
    if (!app) return;
    if (indexEl) indexEl.textContent = "0" + (index + 1);
    if (nameEl) {
      nameEl.textContent = app.title.toUpperCase();
      if (!reduceMotion) {
        gsap.fromTo(nameEl, { opacity: 0, y: 6 }, { opacity: 1, y: 0, duration: 0.35, overwrite: true });
      }
    }
    panels.forEach((p, i) => p.classList.toggle("is-active", i === index));
  }

  setActive(0);

  const galleryRoot = document.getElementById("gallery");
  if (reduceMotion) {
    // No horizontal scrubbing when motion is reduced: stack the panels instead.
    if (galleryRoot) galleryRoot.classList.add("is-static");
    if (fillEl) fillEl.style.width = "100%";
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const i = panels.indexOf(entry.target);
            if (i >= 0) setActive(i);
          }
        });
      },
      { rootMargin: "-45% 0px -45% 0px" }
    );
    panels.forEach((p) => observer.observe(p));
    return;
  }

  const mm = gsap.matchMedia();

  /* -- desktop: pinned horizontal scrub ----------------------------------- */
  mm.add("(min-width: 901px)", () => {
    const padLeft = () => parseFloat(window.getComputedStyle(viewport).paddingLeft) || 0;
    const distance = () => Math.max(1, track.scrollWidth + padLeft() - viewport.clientWidth);

    const tween = gsap.to(track, {
      x: () => -distance(),
      ease: "none",
      scrollTrigger: {
        trigger: "#gallery-viewport",
        start: "top top",
        end: () => "+=" + distance() * 1.15,
        pin: true,
        scrub: 0.6,
        anticipatePin: 1,
        invalidateOnRefresh: true,
        onUpdate: (self) => {
          if (fillEl) fillEl.style.width = (self.progress * 100).toFixed(2) + "%";
          // Measure real transformed positions so the HUD always matches.
          const box = viewport.getBoundingClientRect();
          const center = box.left + box.width / 2;
          let best = 0;
          let bestDist = Infinity;
          panels.forEach((panel, i) => {
            const r = panel.getBoundingClientRect();
            const d = Math.abs(r.left + r.width / 2 - center);
            if (d < bestDist) {
              bestDist = d;
              best = i;
            }
          });
          setActive(best);
        },
      },
    });

    return () => {
      tween.scrollTrigger && tween.scrollTrigger.kill();
      tween.kill();
      gsap.set(track, { x: 0 });
    };
  });

  /* -- mobile: vertical stack, observer-driven HUD ------------------------ */
  mm.add("(max-width: 900px)", () => {
    if (fillEl) fillEl.style.width = "100%";
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const i = panels.indexOf(entry.target);
            if (i >= 0) setActive(i);
          }
        });
      },
      { rootMargin: "-45% 0px -45% 0px", threshold: 0 }
    );
    panels.forEach((p) => observer.observe(p));
    return () => observer.disconnect();
  });
}
