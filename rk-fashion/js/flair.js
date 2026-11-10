// Vanilla (no-library) motion: measuring-tape scroll line, stitched section dividers, hero zoom,
// journey reveal, and the interactive "Studio" where a design can be tried in other colours.
import { $, $$, h, icon, prefersReducedMotion, trapFocus } from "./ui.js";
import { t, tr } from "./i18n.js";
import { optimizedUrl } from "./cloudinary.js";

const clamp = (x, a, b) => Math.min(b, Math.max(a, x));

export function initFlair() {
  initTape(); initStitches(); initReveal();
}

function initTape() {
  const tape = $("#tape"), num = $("#tapeNum"), hero = $(".hero");
  if (!tape) return;
  let ticking = false;
  const update = () => {
    ticking = false;
    const max = document.documentElement.scrollHeight - innerHeight;
    const p = max > 0 ? clamp(scrollY / max, 0, 1) : 0;
    tape.style.setProperty("--tp", p.toFixed(4));
    num.textContent = String(Math.round(p * 180));          // a body is ~180 cm: the tape "measures" the page
    if (hero && !prefersReducedMotion) hero.style.setProperty("--hz", clamp(scrollY / (innerHeight * 0.9), 0, 1).toFixed(3));
  };
  addEventListener("scroll", () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } }, { passive: true });
  addEventListener("resize", update);
  update();
}

// A dashed gold "stitch" sews itself across the top of every section as it comes into view.
function initStitches() {
  const secs = $$("main .section");
  const io = "IntersectionObserver" in window ? new IntersectionObserver((es) => es.forEach((e) => {
    if (e.isIntersecting) { e.target.classList.add("is-in"); io.unobserve(e.target); }
  }), { threshold: 0, rootMargin: "0px 0px -12% 0px" }) : null;
  secs.forEach((sec) => {
    const st = h("span", { class: "stitch", "aria-hidden": "true" }, h("i"));
    sec.prepend(st);
    io ? io.observe(st) : st.classList.add("is-in");
  });
}

// Journey steps light up one after another.
function initReveal() {
  const steps = $$("#steps .step");
  const list = $("#steps");
  if (!list) return;
  const mo = new MutationObserver(arm); mo.observe(list, { childList: true });
  function arm() {
    const els = $$("#steps .step");
    if (!("IntersectionObserver" in window)) return els.forEach((e) => e.classList.add("is-in"));
    const io = new IntersectionObserver((es) => es.forEach((e) => {
      if (e.isIntersecting) { e.target.classList.add("is-in"); io.unobserve(e.target); }
    }), { threshold: 0.35 });
    els.forEach((el, i) => { el.style.setProperty("--i", i); io.observe(el); });
  }
  arm();
}

/* ------------------------------ Studio ------------------------------ */
const SWATCHES = [
  ["burgundy", "#8c1d3c"], ["gold", "#c9a24b"], ["emerald", "#0f7a56"],
  ["navy", "#1c2a63"], ["rose", "#d98a9c"], ["noir", "#17110f"], ["ivory", "#efe4cf"]
];

let release = null;

export function openStudio(item, onRequest) {
  closeStudio();
  const rtl = document.documentElement.dir === "rtl";
  const tint = h("div", { class: "studio__tint" });
  const sheen = h("div", { class: "studio__sheen" });
  const img = h("img", { src: optimizedUrl(item.imageUrl, { w: 1100 }), alt: tr(item, "title"), draggable: "false", decoding: "async" });
  const stage = h("div", { class: "studio__stage" }, h("div", { class: "studio__fabric" }, img, tint, sheen));
  const label = h("span", { class: "studio__colour", text: t("studio.original") });

  const pick = (key, hex, btn) => {
    $$(".sw", box).forEach((b) => b.setAttribute("aria-pressed", String(b === btn)));
    if (!key) { tint.style.opacity = "0"; label.textContent = t("studio.original"); return; }
    tint.style.background = hex; tint.style.opacity = key === "noir" ? "1" : ".88";
    tint.dataset.k = key; label.textContent = t(`sw.${key}`);
  };
  const swatches = h("div", { class: "studio__sw", role: "group", "aria-label": t("studio.colour") },
    ...[["", ""], ...SWATCHES].map(([k, hex]) => {
      const b = h("button", { type: "button", class: "sw" + (k ? "" : " sw--orig"), "aria-pressed": String(!k), "aria-label": k ? t(`sw.${k}`) : t("studio.original") });
      if (hex) b.style.setProperty("--c", hex);
      b.addEventListener("click", () => pick(k, hex, b));
      return b;
    }));

  const box = h("div", { class: "studio__box", role: "dialog", "aria-modal": "true", "aria-label": t("studio.title") },
    h("button", { type: "button", class: "studio__x", "aria-label": t("studio.close"), onclick: closeStudio }, icon("close", 22)),
    stage,
    h("div", { class: "studio__panel" },
      h("p", { class: "studio__kicker", text: t("studio.title") }),
      h("h3", { class: "studio__title", text: tr(item, "title") }),
      h("p", { class: "studio__hint", text: t("studio.hint") }),
      swatches, label,
      h("p", { class: "studio__note", text: t("studio.note") }),
      h("button", { type: "button", class: "d__cta studio__cta", text: t("lb.request"), onclick: () => { closeStudio(); onRequest?.(item.title); } })));
  const wrap = h("div", { class: "studio", dir: rtl ? "rtl" : "ltr" }, h("div", { class: "studio__back", onclick: closeStudio }), box);
  document.body.append(wrap);
  document.documentElement.classList.add("studio-open");
  requestAnimationFrame(() => wrap.classList.add("is-in"));

  // the fabric leans toward the pointer and a soft highlight follows it, like light moving over satin
  const fabric = $(".studio__fabric", wrap);
  if (!prefersReducedMotion) {
    stage.addEventListener("pointermove", (e) => {
      const r = stage.getBoundingClientRect(), x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
      fabric.style.setProperty("--ry", `${(x - .5) * 14}deg`); fabric.style.setProperty("--rx", `${(.5 - y) * 10}deg`);
      sheen.style.setProperty("--mx", `${x * 100}%`); sheen.style.setProperty("--my", `${y * 100}%`); sheen.style.opacity = "1";
    });
    stage.addEventListener("pointerleave", () => { fabric.style.setProperty("--ry", "0deg"); fabric.style.setProperty("--rx", "0deg"); sheen.style.opacity = "0"; });
  }
  const onKey = (e) => { if (e.key === "Escape") closeStudio(); };
  document.addEventListener("keydown", onKey);
  const untrap = trapFocus(wrap);
  $(".studio__x", wrap).focus();
  release = () => { document.removeEventListener("keydown", onKey); untrap(); wrap.remove(); document.documentElement.classList.remove("studio-open"); };
}

export function closeStudio() { if (release) { const r = release; release = null; r(); } }
