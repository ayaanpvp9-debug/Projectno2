/* ==========================================================================
   CORE — shared state, scroll plumbing, chrome and reveal helpers
   ========================================================================== */
import { initHero } from "./hero.js";
import { initChapterOne } from "./chapter1.js";
import { initDataFactory } from "./chapter2.js";
import { initNetwork } from "./network.js";
import { initTrainingLab } from "./training.js";
import { initTransformer } from "./transformer.js";
import { initApplications } from "./applications.js";
import { initLimits } from "./limits.js";
import { initQuiz } from "./quiz.js";
import { initMotion } from "./motion.js";

/* --------------------------------------------------------------------------
   Environment
   -------------------------------------------------------------------------- */
export const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
export const isTouch = window.matchMedia("(hover: none), (pointer: coarse)").matches;
export const isMobileLayout = () => window.matchMedia("(max-width: 900px)").matches;

export const gsap = window.gsap;
export const ScrollTrigger = window.ScrollTrigger;

gsap.registerPlugin(ScrollTrigger);
gsap.config({ nullTargetWarn: false });
ScrollTrigger.config({ ignoreMobileResize: true });

/* --------------------------------------------------------------------------
   Small maths / helpers
   -------------------------------------------------------------------------- */
export const clamp = (v, min, max) => Math.min(max, Math.max(min, v));
export const lerp = (a, b, t) => a + (b - a) * t;
export const mapRange = (v, a, b, c, d) => c + ((clamp(v, a, b) - a) / (b - a)) * (d - c);
export const round = (v, d = 2) => Number(v.toFixed(d));

/** Deterministic 32-bit hash — used for stable, reproducible demo values. */
export function hashString(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) / 4294967295;
}

/** Mulberry32 seeded PRNG. */
export function seededRandom(seed) {
  let a = seed >>> 0;
  return function random() {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* --------------------------------------------------------------------------
   Smooth scrolling — Lenis, wired into the GSAP ticker
   -------------------------------------------------------------------------- */
export const scroll = {
  lenis: null,
  enabled: false,
  init() {
    if (reduceMotion || typeof window.Lenis !== "function") return false;
    try {
      this.lenis = new window.Lenis({
        duration: 1.05,
        easing: (t) => 1 - Math.pow(1 - t, 3.2),
        smoothWheel: true,
        wheelMultiplier: 0.95,
        touchMultiplier: 1.6,
        syncTouch: false,
        autoRaf: false,
      });
      this.enabled = true;

      this.lenis.on("scroll", ScrollTrigger.update);
      gsap.ticker.add(this.raf);
      gsap.ticker.lagSmoothing(0);

      // Keep ScrollTrigger honest about the real document height.
      ScrollTrigger.addEventListener("refreshInit", () => this.lenis.resize());
    } catch (err) {
      console.warn("[INSIDE AI] Smooth scroll unavailable, using native scroll.", err);
      this.enabled = false;
    }
    return this.enabled;
  },
  raf(time) {
    if (scroll.lenis) scroll.lenis.raf(time * 1000);
  },
  to(target, opts = {}) {
    const el = typeof target === "string" ? document.querySelector(target) : target;
    if (!el) return;
    if (this.enabled && this.lenis) {
      this.lenis.scrollTo(el, { offset: 0, duration: 1.35, ...opts });
    } else {
      const top = el.getBoundingClientRect().top + window.scrollY + (opts.offset || 0);
      window.scrollTo({ top, behavior: reduceMotion ? "auto" : "smooth" });
    }
  },
  toY(y, opts = {}) {
    if (this.enabled && this.lenis) {
      this.lenis.scrollTo(y, { duration: 1.1, ...opts });
    } else {
      window.scrollTo({ top: y, behavior: reduceMotion ? "auto" : "smooth" });
    }
  },
  stop() {
    if (this.lenis) this.lenis.stop();
    document.body.style.overflow = "hidden";
  },
  start() {
    if (this.lenis) this.lenis.start();
    document.body.style.overflow = "";
  },
};

/* --------------------------------------------------------------------------
   Loader
   -------------------------------------------------------------------------- */
export function runLoader() {
  return new Promise((resolve) => {
    const loaderBar = document.getElementById("loader-fill");
    const loaderCount = document.getElementById("loader-count");
    const loaderLabel = document.getElementById("loader-label");
    const loader = document.getElementById("loader");

    const labels = ["INITIALISING EXPERIENCE", "BUILDING NEURAL GRAPH", "PREPARING MODELS", "READY"];

    if (reduceMotion) {
      if (loader) loader.classList.add("is-done");
      document.body.classList.remove("is-loading");
      resolve();
      return;
    }

    const progress = { v: 0 };
    gsap.to(progress, {
      v: 100,
      duration: 1.5,
      ease: "power2.inOut",
      onUpdate: () => {
        const p = Math.round(progress.v);
        if (loaderBar) loaderBar.style.width = p + "%";
        if (loaderCount) loaderCount.textContent = String(p).padStart(2, "0");
        if (loaderLabel) loaderLabel.textContent = labels[Math.min(3, Math.floor(p / 26))];
      },
      onComplete: () => {
        if (loader) loader.classList.add("is-done");
        document.body.classList.remove("is-loading");
        if (scroll.lenis) scroll.lenis.resize();
        ScrollTrigger.refresh();
        setTimeout(resolve, 220);
      },
    });
  });
}

/* --------------------------------------------------------------------------
   Chrome: rail navigation, topbar readout, scroll progress
   -------------------------------------------------------------------------- */
export function initChrome(chapters) {
  const railList = document.getElementById("rail-list");
  const railFill = document.getElementById("rail-fill");
  const topbarChapter = document.getElementById("topbar-chapter");
  const topbar = document.getElementById("topbar");
  const rail = document.getElementById("rail");
  const mobileFill = document.getElementById("mobile-fill");
  const mobileLabel = document.getElementById("mobile-label");

  let activeIndex = -1;
  const buttons = [];

  chapters.forEach((chapter, index) => {
    if (!railList) return;
    const li = document.createElement("li");
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "rail__item";
    btn.setAttribute("aria-label", `Go to ${chapter.num} — ${chapter.label}`);
    btn.innerHTML =
      `<span class="rail__label">${chapter.num} · ${chapter.label}</span>` +
      `<span class="rail__dot-wrap"><span class="rail__dot"></span></span>`;
    btn.addEventListener("click", () => scroll.to(chapter.el, { duration: 1.5 }));
    li.appendChild(btn);
    railList.appendChild(li);
    buttons.push(btn);
  });

  function setActive(index) {
    if (index === activeIndex) return;
    activeIndex = index;
    buttons.forEach((b, i) => {
      b.classList.toggle("is-active", i === index);
      b.classList.toggle("is-past", i < index);
    });

    const chapter = chapters[index];
    if (chapter) {
      if (topbarChapter) {
        topbarChapter.classList.add("is-swapping");
        window.setTimeout(() => {
          topbarChapter.textContent = `${chapter.num} / ${chapter.label.toUpperCase()}`;
          topbarChapter.classList.remove("is-swapping");
        }, 180);
      }
      if (mobileLabel) mobileLabel.textContent = `${chapter.num} · ${chapter.label}`;
      document.body.dataset.activeChapter = chapter.num;
    }
  }

  chapters.forEach((chapter, index) => {
    ScrollTrigger.create({
      trigger: chapter.el,
      start: "top 55%",
      end: "bottom 45%",
      onToggle: (self) => {
        if (self.isActive) setActive(index);
      },
    });
  });

  // Scroll progress → rail fill, meter fill, topbar background.
  const progressState = { last: 0 };
  ScrollTrigger.create({
    start: 0,
    end: "max",
    onUpdate: (self) => {
      const p = self.progress;
      progressState.last = p;
      const pct = (p * 100).toFixed(2) + "%";
      if (railFill) railFill.style.height = pct;
      if (mobileFill) mobileFill.style.width = pct;
      if (topbar) topbar.classList.toggle("is-scrolled", window.scrollY > 40);
    },
  });

  if (topbar) topbar.classList.add("is-ready");
  if (rail) rail.classList.add("is-ready");

  // Rail buttons mirror into keyboard-accessible landmarks.
  document.querySelectorAll("[data-scroll-to]").forEach((link) => {
    link.addEventListener("click", (e) => {
      e.preventDefault();
      scroll.to(link.getAttribute("data-scroll-to"));
    });
  });

  const restart = document.getElementById("btn-restart");
  if (restart) {
    restart.addEventListener("click", () => {
      scroll.toY(0);
      window.setTimeout(() => ScrollTrigger.refresh(), 900);
    });
  }

  return { setActive, get activeIndex() { return activeIndex; } };
}

/* --------------------------------------------------------------------------
   Reveals, counters, and heading entrances
   -------------------------------------------------------------------------- */
export function initReveals() {
  if (reduceMotion) return;

  const revealEls = gsap.utils.toArray("[data-reveal]");
  revealEls.forEach((el) => gsap.set(el, { opacity: 0, y: 28 }));

  ScrollTrigger.batch(revealEls, {
    start: "top 88%",
    once: true,
    onEnter: (batch) =>
      gsap.to(batch, {
        opacity: 1,
        y: 0,
        duration: 0.9,
        ease: "power3.out",
        stagger: 0.09,
        overwrite: true,
      }),
  });

  // Chapter heads
  gsap.utils.toArray(".chapter-head").forEach((head) => {
    const extras = head.querySelectorAll(".chapter-head__meta, .lede");
    if (!extras.length) return;
    gsap.fromTo(
      extras,
      { opacity: 0, y: 20 },
      {
        opacity: 1,
        y: 0,
        duration: 0.9,
        ease: "power3.out",
        stagger: 0.08,
        scrollTrigger: { trigger: head, start: "top 86%", once: true },
      }
    );
  });

  // Definition and stat blocks
  const cards = gsap.utils.toArray(".def, .stat");
  cards.forEach((card) => {
    gsap.fromTo(
      card,
      { opacity: 0, y: 22 },
      {
        opacity: 1,
        y: 0,
        duration: 0.8,
        ease: "power2.out",
        scrollTrigger: { trigger: card, start: "top 92%", once: true },
      }
    );
  });

  // Animated counters
  gsap.utils.toArray("[data-count]").forEach((el) => {
    const target = parseFloat(el.dataset.count) || 0;
    const suffix = el.dataset.suffix || "";
    const proxy = { v: 0 };
    ScrollTrigger.create({
      trigger: el,
      start: "top 90%",
      once: true,
      onEnter: () =>
        gsap.to(proxy, {
          v: target,
          duration: 1.6,
          ease: "power2.out",
          onUpdate: () => {
            el.textContent = Math.round(proxy.v) + suffix;
          },
        }),
    });
  });
}

/* --------------------------------------------------------------------------
   Utility: animate a number inside an element
   -------------------------------------------------------------------------- */
export function setText(el, value) {
  if (!el) return;
  const str = String(value);
  if (el.textContent !== str) el.textContent = str;
}

/* --------------------------------------------------------------------------
   Boot
   -------------------------------------------------------------------------- */
async function boot() {
  scroll.init();

  const chapters = [
    { num: "00", label: "Prologue", el: document.getElementById("hero") },
    { num: "01", label: "Intelligence, Engineered", el: document.getElementById("c1") },
    { num: "02", label: "The Data Factory", el: document.getElementById("c2") },
    { num: "03", label: "Inside the Network", el: document.getElementById("c3") },
    { num: "04", label: "The Training Room", el: document.getElementById("c4") },
    { num: "05", label: "Words into Tokens", el: document.getElementById("c5") },
    { num: "06", label: "Into the World", el: document.getElementById("c6") },
    { num: "07", label: "The Limits", el: document.getElementById("c7") },
    { num: "08", label: "The Human Question", el: document.getElementById("c8") },
  ].filter((c) => c.el);

  initChrome(chapters);

  // Each module is isolated: a failure in one chapter must not blind the rest.
  const modules = [
    ["hero", initHero],
    ["chapter1", initChapterOne],
    ["chapter2", initDataFactory],
    ["network", initNetwork],
    ["training", initTrainingLab],
    ["transformer", initTransformer],
    ["applications", initApplications],
    ["limits", initLimits],
    ["quiz", initQuiz],
  ];

  modules.forEach(([name, fn]) => {
    try {
      fn();
    } catch (err) {
      console.error(`[INSIDE AI] ${name} failed to initialise`, err);
    }
  });

  initReveals();
  initMotion();

  await runLoader();

  // Fonts shift metrics; one refresh after they settle keeps triggers aligned.
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(() => ScrollTrigger.refresh());
  }
  window.addEventListener("load", () => ScrollTrigger.refresh());
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", boot, { once: true });
} else {
  boot();
}

// Fail-safe: if anything goes wrong before reveals are set, never leave the
// page with invisible content.
window.addEventListener("error", () => {
  document.querySelectorAll("[data-reveal]").forEach((el) => {
    if (getComputedStyle(el).opacity === "0") {
      el.style.opacity = "1";
      el.style.transform = "none";
    }
  });
});
