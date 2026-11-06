/* ==========================================================================
   MOTION — the scroll choreography layer that runs over the whole document.

   Every animation here is a transform or an opacity on an element the layout
   owns from the start: nothing is re-parented, no pinned nodes, no clipped
   text. That means if the scroll engine ever fails to update, the page still
   reads perfectly — it simply stops moving.

   · scrubbed block entrances
   · a chapter atmosphere that changes hue as the story moves
   · a drawing rule under every chapter head
   · scrubbed parallax on the big visual panels
   · scroll-velocity skew on interactive panels (desktop only)
   · a permanent document progress line
   ========================================================================== */
import { gsap, ScrollTrigger, reduceMotion, clamp, isMobileLayout } from "./core.js";

/* --------------------------------------------------------------------------
   1 · Block reveals — the whole block rises, nothing is split or masked
   -------------------------------------------------------------------------- */
function initTypography() {
  if (reduceMotion) return;

  const blocks = gsap.utils.toArray(
    "h2.display, .sub-display, .final__line, .closing__line, .gallery__head .display"
  );
  if (!blocks.length) return;

  blocks.forEach((el) => {
    gsap.fromTo(
      el,
      { y: 54, opacity: 0.12 },
      {
        y: 0,
        opacity: 1,
        ease: "none",
        scrollTrigger: {
          trigger: el,
          start: "top 95%",
          end: "top 60%",
          scrub: 0.6,
        },
      }
    );
  });
}

/* --------------------------------------------------------------------------
   2 · Chapter atmosphere — the environment shifts hue with the story
   -------------------------------------------------------------------------- */
const CHAPTER_HUES = [
  { hue: 224, glow: 0.22 }, // prologue
  { hue: 232, glow: 0.18 }, // 01 foundations
  { hue: 268, glow: 0.22 }, // 02 data
  { hue: 196, glow: 0.17 }, // 03 network
  { hue: 252, glow: 0.2 }, // 04 training
  { hue: 214, glow: 0.19 }, // 05 language
  { hue: 236, glow: 0.16 }, // 06 applications
  { hue: 34, glow: 0.1 }, // 07 limits — restrained
  { hue: 266, glow: 0.24 }, // 08 human question
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
    gsap.to(atmos, { "--hue": hue, "--glow": glow, duration, ease: "sine.inOut", overwrite: true });
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
   3 · Chapter head rule draws itself
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
        scrollTrigger: { trigger: head, start: "top 90%", end: "top 50%", scrub: 0.6 },
      }
    );
  });
}

/* --------------------------------------------------------------------------
   4 · Panel parallax
   -------------------------------------------------------------------------- */
const PARALLAX = [
  [".factory", 30],
  [".nn__stage", 54],
  [".lab__plot", 36],
  [".tx-attn", 30],
  [".tx-next", 30],
  [".app__visual", 40],
  [".verdict", 32],
  [".c1-stage__visual", 26],
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
   5 · Scroll-velocity skew — panels lean into the scroll, then settle
   -------------------------------------------------------------------------- */
function initVelocitySkew() {
  if (reduceMotion || isMobileLayout()) return;
  const targets = gsap.utils.toArray(".lab__plot, .factory__detail, .verdict, .c1-demo");
  if (!targets.length) return;

  const setters = targets.map((el) => gsap.quickTo(el, "skewY", { duration: 0.55, ease: "power3.out" }));

  ScrollTrigger.create({
    onUpdate: (self) => {
      const skew = clamp(self.getVelocity() / -16000, -1.4, 1.4);
      setters.forEach((set) => set(skew));
    },
  });
}

/* --------------------------------------------------------------------------
   6 · Section entrances — blocks lift as they come into view
   -------------------------------------------------------------------------- */
function initSectionEntrances() {
  if (reduceMotion) return;
  gsap.utils
    .toArray(".c1-defs, .loop, .limits__list, .tx__truth, .stat-band, .callout")
    .forEach((el) => {
      gsap.fromTo(
        el,
        { y: 46, opacity: 0.2 },
        {
          y: 0,
          opacity: 1,
          ease: "none",
          scrollTrigger: { trigger: el, start: "top 94%", end: "top 62%", scrub: 0.5 },
        }
      );
    });
}

/* --------------------------------------------------------------------------
   7 · A permanent progress line — the page is always visibly moving
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
  initHeadRules();
  initParallax();
  initVelocitySkew();
  initSectionEntrances();
  initScrollProgress();
}
