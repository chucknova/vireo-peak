import "./style.css";
import Lenis from "lenis";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

const prefersReducedMotion = window.matchMedia(
  "(prefers-reduced-motion: reduce)"
).matches;

/* ------------------------------------------------------------------ *
 * Section data — order maps to media filenames 01–08 in /media.
 * ------------------------------------------------------------------ */
const sections = [
  {
    file: "01-hero-canopy",
    eyebrow: "Cloud Forest · 1,900m",
    title: "Vireo Peak",
    lede: "A canopy retreat where the mountain meets the mist.",
  },
  {
    file: "02-vireo-song",
    eyebrow: "The Vireo",
    title: "Wake to Birdsong",
    lede: "Named for the little green songbird that greets each dawn along the ridge.",
  },
  {
    file: "03-cottage-curtain",
    eyebrow: "The Cottages",
    title: "Rooms Open to the Morning",
    lede: "Linen curtains drift on the highland breeze. Every window frames the valley.",
  },
  {
    file: "04-garden",
    eyebrow: "The Garden",
    title: "Grown Steps From Your Table",
    lede: "Terraced beds of moringa, greens, and herbs picked the hour they're served.",
  },
  {
    file: "05-communal-table",
    eyebrow: "The Table",
    title: "Gather at the Long Table",
    lede: "Shared meals under the beams — slow food, open conversation, mountain wine.",
  },
  {
    file: "06-pavilion-sunrise",
    eyebrow: "The Pavilion",
    title: "Sunrise at the Pavilion",
    lede: "First light spills across the deck. Coffee, silence, and the waking valley.",
  },
  {
    file: "07-cottages-aerial",
    eyebrow: "The Grounds",
    title: "A Village in the Clouds",
    lede: "Scattered cottages threaded by garden paths, held in the fold of the ridge.",
  },
  {
    file: "08-summit",
    eyebrow: "The Summit",
    title: "The Summit Awaits",
    lede: "Trailheads from your door lead up to the peak and its endless horizon.",
  },
];

/* ------------------------------------------------------------------ *
 * Build the DOM.
 * ------------------------------------------------------------------ */
const app = document.querySelector("#app");

// Sections live inside a single .stage that gets pinned/fixed in motion mode,
// so they can be stacked and crossfaded. The .scroll-track supplies the
// scroll distance that the master timeline is scrubbed against.
app.innerHTML = `
  <div class="stage">
    ${sections
      .map(
        (s, i) => `
      <section class="section" id="section-${i + 1}">
        ${
          i === 0
            ? `<canvas
          class="section__video section__canvas hero-loading"
          data-hero-canvas
          style="background-image: url(/media/${s.file}.jpg)"></canvas>
        <div class="hero-loader" data-hero-loader><span></span></div>`
            : `<video
          class="section__video"
          muted loop playsinline
          preload="metadata"
          poster="/media/${s.file}.jpg">
          <source src="/media/${s.file}.webm" type="video/webm" />
          <source src="/media/${s.file}.mp4" type="video/mp4" />
        </video>`
        }
        <div class="section__scrim"></div>
        <div class="section__content">
          <p class="section__eyebrow">${s.eyebrow}</p>
          <h2 class="section__title">${s.title}</h2>
          <p class="section__lede">${s.lede}</p>
        </div>
      </section>`
      )
      .join("")}
  </div>
  <div class="scroll-track" aria-hidden="true"></div>
`;

/* ------------------------------------------------------------------ *
 * Palette tokens (read from tokens.css) for the Dawn Gold color drive.
 * ------------------------------------------------------------------ */
const css = getComputedStyle(document.documentElement);
const DAWN_GOLD = css.getPropertyValue("--dawn-gold").trim();
const TRADE_WIND = css.getPropertyValue("--trade-wind-sky").trim();

const track = document.querySelector(".scroll-track");
const sectionEls = [...document.querySelectorAll(".section")];

/* ------------------------------------------------------------------ *
 * Video playback.
 *
 * Every section is stacked in a fixed stage, so nothing is ever
 * geometrically off-screen — an IntersectionObserver can't tell which
 * section is active. We drive playback from opacity instead: any section
 * that is at all visible plays, so BOTH clips keep moving through a
 * crossfade (essential for the scale-through to read as one camera move);
 * fully-hidden sections pause. Section 1's layer is a <canvas>, not a
 * <video>, so it's simply skipped here.
 * ------------------------------------------------------------------ */
function updateVideoPlayback() {
  sectionEls.forEach((section) => {
    const v = section.querySelector("video.section__video");
    if (!v) return; // hero canvas — no <video> to drive
    const visible = Number(gsap.getProperty(section, "opacity")) > 0.02;
    if (visible && v.paused) v.play().catch(() => {});
    else if (!visible && !v.paused) v.pause();
  });
}

/* ------------------------------------------------------------------ *
 * Hero (section 1) scroll-scrubbed image sequence.
 *
 * Replaces the hero video with a <canvas> that draws /seq/hero frames, the
 * frame index tied to scroll progress over a pinned ~150vh. Every frame is
 * preloaded before the scrub effect is enabled; until then the canvas shows
 * the poster and a loader.
 * ------------------------------------------------------------------ */
const HERO_FRAME_COUNT = 193;
const HERO_PINNED_VH = 1.5; // ~150vh of scroll drives the sequence
const heroFrameUrl = (n) =>
  `/seq/hero/frame-${String(n).padStart(4, "0")}.jpg`;

function setupHeroSequence({ enableScrub }) {
  const canvas = document.querySelector("[data-hero-canvas]");
  const loader = document.querySelector("[data-hero-loader]");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  const frames = [];

  const draw = (i) => {
    const img = frames[Math.max(0, Math.min(HERO_FRAME_COUNT - 1, i))];
    if (img && img.complete) ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  };

  // Preload every frame; resolve once all have settled (load or error).
  let settled = 0;
  const done = new Promise((resolve) => {
    for (let n = 1; n <= HERO_FRAME_COUNT; n++) {
      const img = new Image();
      img.onload = img.onerror = () => {
        if (++settled === HERO_FRAME_COUNT) resolve();
      };
      img.src = heroFrameUrl(n);
      frames[n - 1] = img;
    }
  });

  done.then(() => {
    // Size the canvas buffer to the native frame, draw frame 0, drop loader.
    const first = frames.find((f) => f.naturalWidth) || frames[0];
    canvas.width = first.naturalWidth || 1280;
    canvas.height = first.naturalHeight || 720;
    draw(0);
    canvas.classList.remove("hero-loading");
    if (loader) loader.remove();

    if (!enableScrub) return; // reduced motion: static first frame only

    // Frame index tied to scroll progress across a pinned ~150vh.
    ScrollTrigger.create({
      trigger: "#app",
      start: "top top",
      end: () => "+=" + window.innerHeight * HERO_PINNED_VH,
      scrub: true,
      invalidateOnRefresh: true,
      onUpdate: (self) => {
        draw(Math.round(self.progress * (HERO_FRAME_COUNT - 1)));
      },
    });
    ScrollTrigger.refresh();
  });
}

/* ------------------------------------------------------------------ *
 * Smooth scroll (Lenis) + one master, scrubbed crossfade timeline.
 * ------------------------------------------------------------------ */
if (!prefersReducedMotion) {
  document.documentElement.classList.add("motion");

  // Scroll distance per section. Higher = slower, more lingering.
  const PER_SECTION_VH = 220;
  track.style.height = `${sectionEls.length * PER_SECTION_VH}vh`;

  const lenis = new Lenis({ lerp: 0.1, smoothWheel: true });
  lenis.on("scroll", ScrollTrigger.update);
  gsap.ticker.add((time) => lenis.raf(time * 1000));
  gsap.ticker.lagSmoothing(0);

  const LAST = sectionEls.length - 1;
  const HOLD = 0.72; // point in each slot where the exit/crossfade begins
  const D = 0.3; // crossfade duration (timeline units)
  // Boundaries that use a scale-through instead of a plain dissolve:
  // 1->2 (outgoing index 0) and 7->8 (outgoing index 6).
  const SCALE_THROUGH = new Set([0, 6]);
  const THROUGH_SCALE = 1.6; // how hard the outgoing clip zooms past

  // Initial stacked state: only the first section is visible; every
  // section's content starts hidden, every eyebrow starts Trade Wind Sky.
  gsap.set(sectionEls, { autoAlpha: 0 });
  gsap.set(sectionEls[0], { autoAlpha: 1 });
  // A scale-through's outgoing clip must sit ABOVE its incoming neighbour so
  // it can zoom past and reveal the incoming scaling up behind it.
  SCALE_THROUGH.forEach((i) => gsap.set(sectionEls[i], { zIndex: 5 }));
  sectionEls.forEach((section) => {
    gsap.set([...section.querySelector(".section__content").children], {
      yPercent: 40,
      autoAlpha: 0,
    });
    gsap.set(section.querySelector(".section__eyebrow"), { color: TRADE_WIND });
  });

  // Play whatever's visible now (section 0); pause the rest.
  updateVideoPlayback();

  // A single timeline scrubbed across the whole track.
  const master = gsap.timeline({
    scrollTrigger: {
      trigger: "#app",
      start: "top top",
      end: "bottom bottom",
      scrub: true,
      onUpdate: updateVideoPlayback,
    },
  });

  sectionEls.forEach((section, i) => {
    const items = [...section.querySelector(".section__content").children];
    const eyebrow = section.querySelector(".section__eyebrow");
    const video = section.querySelector(".section__video");

    // Each clip gets a continuous push-in across its whole visible lifespan
    // — from when it fades in (the previous boundary) to when it finishes
    // leaving (its own boundary). Scale stays >= 1 so the cover video never
    // reveals its edges.
    const appear = i === 0 ? 0 : i - (1 - HOLD);
    const videoEnd = i === LAST ? sectionEls.length : i + 1;
    const isThroughOut = SCALE_THROUGH.has(i); // outgoing side of a scale-through
    const isThroughIn = SCALE_THROUGH.has(i - 1); // incoming side of a scale-through

    if (isThroughIn) {
      // Scale-through incoming: rush forward hard DURING the handoff window so
      // it visibly flies in behind the outgoing zoom, then continue scaling up
      // gently through the rest of the slot.
      const RUSH = 1.2;
      master
        .fromTo(video, { scale: 1.0 }, { scale: RUSH, ease: "power2.out", duration: D }, appear)
        .to(video, { scale: 1.28, ease: "none", duration: videoEnd - (appear + D) }, appear + D);
    } else {
      // Scale-through exits accelerate to a hard zoom; everything else drifts.
      master.fromTo(
        video,
        { scale: 1.0 },
        {
          scale: isThroughOut ? THROUGH_SCALE : 1.12,
          ease: isThroughOut ? "power2.in" : "none",
          duration: videoEnd - appear,
        },
        appear
      );
    }

    // Reveal content + Dawn Gold color drive at the start of the slot.
    master
      .to(items, { yPercent: 0, autoAlpha: 1, ease: "power2.out", stagger: 0.08, duration: 0.35 }, i)
      .to(eyebrow, { color: DAWN_GOLD, ease: "none", duration: 0.6 }, i);

    if (i === LAST) return;

    const next = sectionEls[i + 1];
    const t = i + HOLD; // transition window: [i+HOLD, i+1]

    // Content leaves.
    master.to(items, { yPercent: -20, autoAlpha: 0, ease: "power1.in", duration: D }, t);

    // Background crossfade — both clips stay mounted and playing. For a
    // scale-through the outgoing eases out later (power2.in) so its zoom is
    // still dominant as it dissolves, reading as one continuous push.
    master
      .to(section, { autoAlpha: 0, ease: SCALE_THROUGH.has(i) ? "power2.in" : "none", duration: D }, t)
      .fromTo(next, { autoAlpha: 0 }, { autoAlpha: 1, ease: "none", duration: D }, t);
  });

  ScrollTrigger.refresh();

  // Hero: preload frames, then enable the scroll-scrubbed sequence.
  setupHeroSequence({ enableScrub: true });
} else {
  // Reduced motion: no .motion class, so sections fall back to normal-flow
  // full-viewport panels. Show all content, pause every video (poster shows).
  gsap.set(".section__content > *", { autoAlpha: 1, y: 0 });
  document.querySelectorAll("video.section__video").forEach((v) => v.pause());

  // Hero: still preload + draw a static first frame, but no scrub.
  setupHeroSequence({ enableScrub: false });
}
