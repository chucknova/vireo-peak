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
        <video
          class="section__video"
          muted loop playsinline
          preload="${i === 0 ? "auto" : "metadata"}"
          poster="/media/${s.file}.jpg">
          <source src="/media/${s.file}.webm" type="video/webm" />
          <source src="/media/${s.file}.mp4" type="video/mp4" />
        </video>
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
const videoEls = [...document.querySelectorAll(".section__video")];

/* ------------------------------------------------------------------ *
 * Active-video playback.
 *
 * In crossfade mode every section is stacked in a fixed stage, so nothing
 * is ever geometrically off-screen — an IntersectionObserver can't tell
 * which section is active. Instead we play whichever section is currently
 * the most opaque and pause the rest.
 * ------------------------------------------------------------------ */
let activeVideo = videoEls[0];
function updateActiveVideo() {
  let best = 0;
  let bestOpacity = -1;
  sectionEls.forEach((section, i) => {
    const opacity = Number(gsap.getProperty(section, "opacity"));
    if (opacity > bestOpacity) {
      bestOpacity = opacity;
      best = i;
    }
  });
  const wanted = videoEls[best];
  if (wanted !== activeVideo) {
    activeVideo.pause();
    activeVideo = wanted;
    activeVideo.play().catch(() => {});
  }
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

  // Initial stacked state: only the first section is visible; every
  // section's content starts hidden, every eyebrow starts Trade Wind Sky.
  gsap.set(sectionEls, { autoAlpha: 0 });
  gsap.set(sectionEls[0], { autoAlpha: 1 });
  sectionEls.forEach((section) => {
    gsap.set([...section.querySelector(".section__content").children], {
      yPercent: 40,
      autoAlpha: 0,
    });
    gsap.set(section.querySelector(".section__eyebrow"), { color: TRADE_WIND });
  });

  // Start the first video; the rest stay paused until they become active.
  videoEls.forEach((v, i) => (i === 0 ? v.play().catch(() => {}) : v.pause()));

  // A single timeline scrubbed across the whole track. Each section owns a
  // one-unit slot: reveal its content + drive the eyebrow to Dawn Gold, then
  // dissolve into the next section during the tail of the slot.
  const master = gsap.timeline({
    scrollTrigger: {
      trigger: "#app",
      start: "top top",
      end: "bottom bottom",
      scrub: true,
      onUpdate: updateActiveVideo,
    },
  });

  sectionEls.forEach((section, i) => {
    const items = [...section.querySelector(".section__content").children];
    const eyebrow = section.querySelector(".section__eyebrow");
    const video = section.querySelector(".section__video");

    // Reveal + Dawn Gold color drive + slow video push-in over the slot.
    master
      .to(items, { yPercent: 0, autoAlpha: 1, ease: "power2.out", stagger: 0.08, duration: 0.35 }, i)
      .to(eyebrow, { color: DAWN_GOLD, ease: "none", duration: 0.6 }, i)
      .fromTo(video, { scale: 1.0 }, { scale: 1.12, ease: "none", duration: 1 }, i);

    // Crossfade into the next section during the last third of this slot.
    if (i < sectionEls.length - 1) {
      const next = sectionEls[i + 1];
      master
        .to(items, { yPercent: -20, autoAlpha: 0, ease: "power1.in", duration: 0.3 }, i + 0.72)
        .to(section, { autoAlpha: 0, ease: "none", duration: 0.3 }, i + 0.72)
        .to(next, { autoAlpha: 1, ease: "none", duration: 0.3 }, i + 0.72);
    }
  });

  ScrollTrigger.refresh();
} else {
  // Reduced motion: no .motion class, so sections fall back to normal-flow
  // full-viewport panels. Show all content, pause every video (poster shows).
  gsap.set(".section__content > *", { autoAlpha: 1, y: 0 });
  videoEls.forEach((v) => v.pause());
}
