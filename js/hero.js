/* ==========================================================================
   HERO — "The Unknown Machine"
   A canvas neural lattice forms behind the opening typography, then expands
   as the visitor begins to scroll.
   ========================================================================== */
import { gsap, ScrollTrigger, reduceMotion, seededRandom, clamp } from "./core.js";

/* --------------------------------------------------------------------------
   Canvas lattice
   -------------------------------------------------------------------------- */
function createLattice(canvas) {
  const ctx = canvas.getContext("2d");
  const random = seededRandom(18571);

  const state = {
    animate: true,
    growth: 0,
    scale: 1,
    opacity: 1,
    visible: true,
    width: 0,
    height: 0,
    nodes: [],
    links: [],
    pulses: [],
  };

  function build() {
    const rect = canvas.parentElement.getBoundingClientRect();
    const w = Math.max(320, rect.width);
    const h = Math.max(320, rect.height);
    const dpr = clamp(window.devicePixelRatio || 1, 1, 2);

    state.width = w;
    state.height = h;
    canvas.width = Math.floor(w * dpr);
    canvas.height = Math.floor(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const columns = w < 720 ? 5 : w < 1100 ? 6 : 7;
    const marginX = w * 0.08;
    const marginY = h * 0.16;
    const usableH = h - marginY * 2;

    state.nodes = [];
    state.links = [];
    state.pulses = [];

    for (let c = 0; c < columns; c++) {
      const t = columns === 1 ? 0.5 : c / (columns - 1);
      const count = 3 + Math.round(Math.abs(Math.sin(c * 1.7 + 0.6)) * 3);
      for (let i = 0; i < count; i++) {
        const yt = count === 1 ? 0.5 : i / (count - 1);
        state.nodes.push({
          x: marginX + t * (w - marginX * 2) + (random() - 0.5) * w * 0.035,
          y: marginY + yt * usableH + (random() - 0.5) * usableH * 0.12,
          col: c,
          r: 1.1 + random() * 1.7,
          phase: random() * Math.PI * 2,
          appear: c / columns + random() * 0.16,
        });
      }
    }

    // Connect each node to the closest two nodes in the following column.
    for (let c = 0; c < columns - 1; c++) {
      const from = state.nodes.filter((n) => n.col === c);
      const to = state.nodes.filter((n) => n.col === c + 1);
      from.forEach((a) => {
        const sorted = [...to].sort((p, q) => Math.abs(p.y - a.y) - Math.abs(q.y - a.y));
        const targets = sorted.slice(0, random() > 0.55 ? 2 : 1);
        targets.forEach((b) => {
          state.links.push({ a, b, appear: 0.18 + (c / columns) * 0.7 + random() * 0.1 });
        });
      });
    }
  }

  function spawnPulse() {
    if (!state.links.length || state.pulses.length > 5) return;
    const link = state.links[Math.floor(random() * state.links.length)];
    state.pulses.push({ link, t: 0, speed: 0.5 + random() * 0.5 });
  }

  let last = performance.now();
  let pulseTimer = 0;

  function draw(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;

    if (!state.visible) {
      requestAnimationFrame(draw);
      return;
    }

    const { width: w, height: h } = state;
    ctx.clearRect(0, 0, w, h);
    ctx.save();
    ctx.translate(w / 2, h / 2);
    ctx.scale(state.scale, state.scale);
    ctx.translate(-w / 2, -h / 2);
    ctx.globalAlpha = state.opacity;
    ctx.globalCompositeOperation = "lighter";

    const time = now / 1000;

    // Links first — they sit beneath the nodes.
    state.links.forEach((l) => {
      const appear = clamp((state.growth - l.appear) / 0.25, 0, 1);
      if (appear <= 0) return;
      const mid = 0.5 + 0.06 * Math.sin(time * 0.4 + l.a.phase);
      const mx = l.a.x + (l.b.x - l.a.x) * mid;
      const my = l.a.y + (l.b.y - l.a.y) * mid;
      const grad = ctx.createLinearGradient(l.a.x, l.a.y, l.b.x, l.b.y);
      grad.addColorStop(0, `rgba(75,125,255,${0.13 * appear})`);
      grad.addColorStop(0.55, `rgba(139,92,246,${0.2 * appear})`);
      grad.addColorStop(1, `rgba(56,225,240,${0.1 * appear})`);
      ctx.strokeStyle = grad;
      ctx.lineWidth = 0.9;
      ctx.beginPath();
      ctx.moveTo(l.a.x, l.a.y);
      ctx.quadraticCurveTo(mx, my, l.b.x, l.b.y);
      ctx.stroke();
    });

    // Nodes
    state.nodes.forEach((n) => {
      const appear = clamp((state.growth - n.appear) / 0.22, 0, 1);
      if (appear <= 0) return;
      const flicker = 0.72 + 0.28 * Math.sin(time * 1.1 + n.phase);
      const r = n.r * (0.7 + appear * 0.3) * flicker;
      const g = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, r * 6);
      g.addColorStop(0, `rgba(190,220,255,${0.85 * appear})`);
      g.addColorStop(0.35, `rgba(90,140,255,${0.32 * appear})`);
      g.addColorStop(1, "rgba(75,125,255,0)");
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(n.x, n.y, r * 6, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = `rgba(235,244,255,${0.9 * appear})`;
      ctx.beginPath();
      ctx.arc(n.x, n.y, Math.max(0.6, r * 0.55), 0, Math.PI * 2);
      ctx.fill();
    });

    // Travelling signals
    pulseTimer += dt;
    if (pulseTimer > 0.55) {
      pulseTimer = 0;
      spawnPulse();
    }
    state.pulses.forEach((p) => {
      p.t += dt * p.speed;
      if (p.t >= 1) return;
      const { a, b } = p.link;
      const x = a.x + (b.x - a.x) * p.t;
      const y = a.y + (b.y - a.y) * p.t;
      const g = ctx.createRadialGradient(x, y, 0, x, y, 9);
      g.addColorStop(0, "rgba(180,250,255,0.95)");
      g.addColorStop(0.4, "rgba(56,225,240,0.5)");
      g.addColorStop(1, "rgba(56,225,240,0)");
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(x, y, 9, 0, Math.PI * 2);
      ctx.fill();
    });
    state.pulses = state.pulses.filter((p) => p.t < 1);

    ctx.restore();
    if (state.animate) requestAnimationFrame(draw);
  }

  build();

  let resizeTimer = 0;
  window.addEventListener("resize", () => {
    window.clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(build, 220);
  });

  if (reduceMotion) {
    state.animate = false;
    state.growth = 1;
    state.visible = true;
    // Single static frame; no animation loop.
    draw(performance.now());
    return { state, paint: () => draw(performance.now()), build };
  }

  requestAnimationFrame(draw);

  const io = new IntersectionObserver(
    ([entry]) => {
      state.visible = entry.isIntersecting;
    },
    { threshold: 0 }
  );
  if (canvas.parentElement) io.observe(canvas.parentElement);

  return { state, paint: () => draw(performance.now()), build };
}

/* --------------------------------------------------------------------------
   Opening sequence
   -------------------------------------------------------------------------- */
function playOpening(lattice) {
  const seq = gsap.utils.toArray("[data-seq]");
  const titleWrap = document.getElementById("hero-title-wrap");
  const titleA = document.querySelector(".hero__title-a");
  const titleB = document.querySelector(".hero__title-b");
  const sub = document.getElementById("hero-sub");
  const support = document.getElementById("hero-support");
  const meta = document.getElementById("hero-meta");
  const cue = document.getElementById("hero-cue");
  const kicker = document.querySelector(".hero__kicker");
  const canvas = document.getElementById("hero-canvas");

  if (reduceMotion) {
    gsap.set([seq, titleWrap, support, meta, cue, kicker], { opacity: 1, y: 0 });
    gsap.set(seq, { opacity: 0 });
    if (canvas) gsap.set(canvas, { opacity: 1 });
    return;
  }

  // The lattice assembles itself while the opening lines appear.
  if (lattice && lattice.state) {
    gsap.to(lattice.state, { growth: 1.2, duration: 3.4, ease: "power2.out", delay: 0.15 });
  }

  const tl = gsap.timeline({ defaults: { ease: "power3.out" } });

  tl.fromTo(canvas, { opacity: 0 }, { opacity: 1, duration: 2, ease: "power2.out" }, 0)
    .fromTo(kicker, { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: 0.8 }, 0.2)
    .fromTo(
      seq,
      { opacity: 0, y: 22, filter: "blur(6px)" },
      { opacity: 1, y: 0, filter: "blur(0px)", duration: 0.9, stagger: 0.45 },
      0.55
    )
    // The three lines step aside; the title arrives.
    .to(seq, { opacity: 0, y: -26, filter: "blur(8px)", duration: 0.55, stagger: 0.05 }, "+=0.2")
    .fromTo(
      titleWrap,
      { opacity: 0, y: 34 },
      { opacity: 1, y: 0, duration: 1, ease: "power3.out" },
      "-=0.4"
    )
    .fromTo(titleA, { yPercent: 24, opacity: 0 }, { yPercent: 0, opacity: 1, duration: 1.1, ease: "power4.out" }, "<")
    .fromTo(titleB, { yPercent: 34, opacity: 0 }, { yPercent: 0, opacity: 1, duration: 1.1, ease: "power4.out" }, "<0.1")
    .fromTo(sub, { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: 0.7 }, "-=0.55")
    .fromTo([support, meta, cue], { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: 0.8, stagger: 0.1 }, "-=0.4");

  return tl;
}

/* --------------------------------------------------------------------------
   Scroll choreography
   -------------------------------------------------------------------------- */
function createExit(lattice) {
  const hero = document.getElementById("hero");
  const handoff = document.getElementById("hero-handoff");
  const inner = document.querySelector(".hero__inner");
  const frame = document.querySelector(".hero__frame");
  if (!hero || !inner) return;

  const mm = gsap.matchMedia();

  // Desktop: pin the opening and let the environment transform.
  mm.add("(min-width: 901px)", () => {
    const tl = gsap.timeline({
      defaults: { ease: "none" },
      scrollTrigger: {
        trigger: hero,
        start: "top top",
        end: "+=125%",
        scrub: 0.7,
        pin: true,
        anticipatePin: 1,
        invalidateOnRefresh: true,
      },
    });

    // Animate the wrapper, never the children the intro timeline owns.
    tl.to(inner, { yPercent: -14, opacity: 0, duration: 0.55 }, 0)
      .to(inner, { scale: 0.97, duration: 0.55, transformOrigin: "50% 50%" }, 0)
      .to(frame, { opacity: 0.25, duration: 0.5 }, 0)
      .to(lattice.state, { scale: 1.42, opacity: 0.42, duration: 0.85 }, 0.12)
      .to(lattice.state, { opacity: 0, duration: 0.22 }, 0.78)
      .fromTo(handoff, { opacity: 0, y: 24 }, { opacity: 1, y: 0, duration: 0.32 }, 0.56)
      .to(handoff, { opacity: 0, duration: 0.1 }, 0.9);

    return () => {
      tl.scrollTrigger && tl.scrollTrigger.kill();
      tl.kill();
    };
  });

  // Mobile: the same story beat, pinned for a shorter distance.
  mm.add("(max-width: 900px)", () => {
    const tl = gsap.timeline({
      defaults: { ease: "none" },
      scrollTrigger: {
        trigger: hero,
        start: "top top",
        end: "+=85%",
        scrub: 0.6,
        pin: true,
        anticipatePin: 1,
        invalidateOnRefresh: true,
      },
    });
    tl.to(inner, { opacity: 0, y: -70, scale: 0.96, duration: 1 }, 0)
      .to(lattice.state, { scale: 1.28, opacity: 0.3, duration: 1 }, 0)
      .fromTo(handoff, { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.3 }, 0.58)
      .to(handoff, { opacity: 0, duration: 0.1 }, 0.9);
    return () => tl.kill();
  });
}

/* --------------------------------------------------------------------------
   Init
   -------------------------------------------------------------------------- */
export function initHero() {
  const canvas = document.getElementById("hero-canvas");
  const lattice = canvas ? createLattice(canvas) : { state: {} };

  playOpening(lattice);
  if (!reduceMotion) createExit(lattice);

  // Re-fit the canvas after the loader hands over (viewport height settles).
  window.setTimeout(() => lattice.build && lattice.build(), 800);
}
