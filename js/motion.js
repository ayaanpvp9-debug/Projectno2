/* ==========================================================================
   MOTION — the scroll choreography layer that runs over the whole document.

   · masked line-by-line typography reveals (scrubbed, so scrolling drives them)
   · a chapter atmosphere that changes hue as the story moves
   · oversized ghost numerals that parallax behind each chapter
   · a drawing rule under every chapter head
   · scrubbed parallax on the big visual panels
   · scroll-velocity skew on interactive panels (desktop only)
   ========================================================================== */
import { gsap, ScrollTrigger, reduceMotion, clamp, isMobileLayout } from "./core.js";

/* --------------------------------------------------------------------------
   1 · Split a heading into masked lines (splits on <br>, keeps inline HTML)
   -------------------------------------------------------------------------- */
function splitIntoLines(el) {
  if (el.dataset.linesSplit === "true") {
    return [...el.querySelectorAll(".line__in")];
  }
  const chunks = el.innerHTML.split(/<br\s*\/?>/i);
  if (!chunks.some((c) => c.trim().length)) return [];

  el.innerHTML = chunks
    .map((chunk) => `<span class="line"><span class="line__in">${chunk.trim()}</span></span>`)
    .join(" ");
  el.classList.add("is-split");
  el.dataset.linesSplit = "true";
  return [...el.querySelectorAll(".line__in")];
}

function initTypography() {
  const headings = gsap.utils.toArray("h2.display, .final__line, .sub-display");
  const closingLines = gsap.utils.toArray(".closing__line");

  headings.forEach((el) => {
    const lines = splitIntoLines(el);
    if (!lines.length) return;
    if (reduceMotion) return;

    gsap.set(lines, { yPercent: 118 });
    gsap.to(lines, {
      yPercent: 0,
      ease: "power4.out",
      stagger: 0.09,
      scrollTrigger: {
        trigger: el,
        start: "top 96%",
        end: "top 58%",
        scrub: 0.65,
      },
    });
  });

  // The closing couplet owns a gradient on the element itself, so it moves as a
  // block rather than per line (keeps the background-clip intact).
  if (!reduceMotion && closingLines.length) {
    gsap.fromTo(
      closingLines,
      { yPercent: 18, opacity: 0 },
      {
        yPercent: 0,
        opacity: 1,
        stagger: 0.1,
        ease: "none",
        scrollTrigger: {
          trigger: "#closing",
          start: "top 92%",
          end: "top 55%",
          scrub: 0.7,
        },
      }
    );
  }
}

/* --------------------------------------------------------------------------
   2 · Chapter atmosphere — the environment shifts hue with the story
   -------------------------------------------------------------------------- */
const CHAPTER_HUES = [
  { hue: 224, glow: 0.2 }, // prologue
  { hue: 232, glow: 0.18 }, // 01 foundations
  { hue: 268, glow: 0.2 }, // 02 data
  { hue: 196, glow: 0.16 }, // 03 network
  { hue: 252, glow: 0.18 }, // 04 training
  { hue: 214, glow: 0.18 }, // 05 language
  { hue: 236, glow: 0.15 }, // 06 applications
  { hue: 34, glow: 0.09 }, // 07 limits — restrained
  { hue: 266, glow: 0.22 }, // 08 human question
];

function initAtmosphere() {
  const atmos = document.createElement("div");
  atmos.className = "atmosphere";
  atmos.setAttribute("aria-hidden", "true");
  document.body.prepend(atmos);

  const sections = gsap.utils.toArray("#hero, main .chapter");
  const apply = (i, duration) => {
    const { hue, glow } = CHAPTER_HUES[Math.min(i, CHAPTER_HUES.length - 1)];
    if (reduceMotion) {
      atmos.style.setProperty("--hue", hue);
      atmos.style.setProperty("--glow", glow);
      return;
    }
    gsap.to(atmos, {
      "--hue": hue,
      "--glow": glow,
      duration,
      ease: "sine.inOut",
      overwrite: true,
    });
  };

  sections.forEach((section, i) => {
    ScrollTrigger.create({
      trigger: section,
      start: "top 60%",
      end: "bottom 40%",
      onToggle: (self) => {
        if (self.isActive) apply(i, 1.1);
      },
    });
  });

  apply(0, 0);

  // A slow vertical drift so the glow is never completely still.
  if (!reduceMotion) {
    gsap.to(atmos, {
      "--drift": 12,
      ease: "none",
      scrollTrigger: { start: 0, end: "max", scrub: 1 },
    });
  }
}

/* --------------------------------------------------------------------------
   3 · Ghost numerals
   -------------------------------------------------------------------------- */
function initGhostNumerals() {
  gsap.utils.toArray("main .chapter").forEach((chapter) => {
    const num = chapter.querySelector(".chapter-head__num")?.textContent.trim();
    if (!num) return;
    const ghost = document.createElement("span");
    ghost.className = "ghost-num";
    ghost.textContent = num;
    ghost.setAttribute("aria-hidden", "true");
    chapter.appendChild(ghost);

    if (reduceMotion) return;
    gsap.fromTo(
      ghost,
      { yPercent: 26, opacity: 0.15 },
      {
        yPercent: -14,
        opacity: 1,
        ease: "none",
        scrollTrigger: { trigger: chapter, start: "top bottom", end: "bottom top", scrub: true },
      }
    );
  });
}

/* --------------------------------------------------------------------------
   4 · Chapter head rule draws itself
   -------------------------------------------------------------------------- */
function initHeadRules() {
  if (reduceMotion) {
    gsap.set(".chapter-head", { "--rule": 1 });
    return;
  }
  gsap.utils.toArray(".chapter-head").forEach((head) => {
    gsap.fromTo(
      head,
      { "--rule": 0 },
      {
        "--rule": 1,
        ease: "none",
        scrollTrigger: { trigger: head, start: "top 88%", end: "top 48%", scrub: 0.6 },
      }
    );
  });
}

/* --------------------------------------------------------------------------
   5 · Panel parallax
   -------------------------------------------------------------------------- */
const PARALLAX = [
  [".factory", 26],
  [".nn__stage", 44],
  [".lab__plot", 30],
  [".tx-attn", 26],
  [".tx-next", 26],
  [".app__visual", 34],
  [".verdict", 28],
  [".c1-stage__visual", 22],
];

function initParallax() {
  if (reduceMotion) return;
  PARALLAX.forEach(([selector, amount]) => {
    gsap.utils.toArray(selector).forEach((el) => {
      gsap.fromTo(
        el,
        { y: amount },
        {
          y: -amount,
          ease: "none",
          scrollTrigger: { trigger: el, start: "top bottom", end: "bottom top", scrub: 0.4 },
        }
      );
    });
  });
}

/* --------------------------------------------------------------------------
   6 · Scroll-velocity skew — panels lean into the scroll, then settle
   -------------------------------------------------------------------------- */
function initVelocitySkew() {
  if (reduceMotion || isMobileLayout()) return;
  const targets = gsap.utils.toArray(".lab__plot, .factory__detail, .verdict, .c1-demo");
  if (!targets.length) return;

  const setters = targets.map((el) =>
    gsap.quickTo(el, "skewY", { duration: 0.55, ease: "power3.out" })
  );

  ScrollTrigger.create({
    onUpdate: (self) => {
      const skew = clamp(self.getVelocity() / -16000, -1.4, 1.4);
      setters.forEach((set) => set(skew));
    },
  });
}

/* --------------------------------------------------------------------------
   7 · Section entrances — blocks lift as they come into view
   -------------------------------------------------------------------------- */
function initSectionEntrances() {
  if (reduceMotion) return;
  gsap.utils.toArray(".c1-defs, .loop, .limits__list, .tx__truth, .stat-band, .callout").forEach((el) => {
    gsap.fromTo(
      el,
      { y: 42, opacity: 0.25 },
      {
        y: 0,
        opacity: 1,
        ease: "none",
        scrollTrigger: { trigger: el, start: "top 92%", end: "top 62%", scrub: 0.5 },
      }
    );
  });
}

/* --------------------------------------------------------------------------
   8 · A permanent progress line — the page is always visibly moving
   -------------------------------------------------------------------------- */
function initScrollProgress() {
  const bar = document.createElement("div");
  bar.className = "scroll-progress";
  bar.setAttribute("aria-hidden", "true");
  const fill = document.createElement("span");
  bar.appendChild(fill);
  document.body.appendChild(bar);

  ScrollTrigger.create({
    start: 0,
    end: "max",
    onUpdate: (self) => {
      fill.style.transform = `scaleX(${self.progress.toFixed(4)})`;
    },
  });
}

/* --------------------------------------------------------------------------
   Export
   -------------------------------------------------------------------------- */
export function initMotion() {
  initTypography();
  initAtmosphere();
  initGhostNumerals();
  initHeadRules();
  initParallax();
  initVelocitySkew();
  initSectionEntrances();
  initScrollProgress();
}
