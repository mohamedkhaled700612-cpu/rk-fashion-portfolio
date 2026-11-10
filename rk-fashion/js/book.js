// RK FASHION lookbook: a hardcover book that turns real 3D pages.
// Wide screens: every design is a spread (photo on the left page, details on the right).
// Phones: one page at a time. Leaves are driven by JS (not CSS transitions) so lighting follows the turn.
import { h, icon, prefersReducedMotion } from "./ui.js";
import { t, tr } from "./i18n.js";
import { optimizedUrl } from "./cloudinary.js";

const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
const ease = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);   // easeInOutCubic
const pad = (n) => String(n).padStart(2, "0");

export function createBook(root, { onOpenItem, onRequest, onChange, reducedMotion = prefersReducedMotion }) {
  const mq = window.matchMedia("(max-width: 820px)");
  const single = () => mq.matches;
  let items = [], k = 0, leaves = [], angles = [];
  let bk, bookEl, counterEl, prevBtn, nextBtn, liveEl, hintEl;
  let interacted = false, observer = null;
  const moving = new Set(), tweens = new Map();
  const maxK = () => items.length + 1;     // 0 = closed cover … items.length = last design … +1 = closed back

  /* ---------------- faces ---------------- */
  const logo = () => h("img", { src: "assets/logo/rk-logo-360.png", alt: "", width: 360, height: 360, decoding: "async", draggable: "false" });
  const photo = (it, eager) => h("img", {
    src: optimizedUrl(it.imageUrl, { w: 900 }),
    srcset: [500, 900, 1400].map((w) => `${optimizedUrl(it.imageUrl, { w })} ${w}w`).join(", "),
    sizes: single() ? "86vw" : "46vw", alt: tr(it, "title"), loading: eager ? "eager" : "lazy", decoding: "async", draggable: "false"
  });
  const actions = (it, i) => h("div", { class: "d__actions" },
    h("button", { type: "button", class: "d__cta", onclick: () => onRequest?.(it.title), text: t("lb.request") }),
    h("button", { type: "button", class: "d__zoom", onclick: () => onOpenItem?.(items[i]._gi ?? i), text: t("book.zoom") }));

  const faceCover = () => h("div", { class: "face face--cover" }, h("div", { class: "cover" },
    h("span", { class: "cover__kicker foil", text: t("book.cover") }),
    h("div", { class: "cover__plate" }, logo()),
    h("span", { class: "cover__name foil", text: t("hero.name") }),
    h("span", { class: "cover__open", text: t("book.hint") })));
  const facePaper = (extra = "") => h("div", { class: `face face--paper ${extra}` }, h("img", { class: "mark", src: "assets/logo/rk-logo-360.png", alt: "", draggable: "false" }));
  const faceImage = (it, i) => h("div", { class: "face face--paper face--image" },
    h("div", { class: "plate" }, photo(it, i < 4)),
    h("span", { class: "plate__no", text: `№ ${pad(i + 1)}` }));
  const faceDetails = (it, i) => h("div", { class: "face face--paper face--details" }, h("div", { class: "d" },
    h("span", { class: "d__idx", text: pad(i + 1) }),
    tr(it, "category") ? h("span", { class: "d__cat", text: tr(it, "category") }) : null,
    h("h3", { class: "d__title", text: tr(it, "title") }),
    h("span", { class: "d__rule", "aria-hidden": "true" }),
    tr(it, "description") ? h("p", { class: "d__desc", text: tr(it, "description") }) : null,
    actions(it, i),
    h("span", { class: "d__foot", text: `${pad(i + 1)} / ${pad(items.length)}` })));
  const faceSingle = (it, i) => h("div", { class: "face face--paper face--single" },
    h("div", { class: "plate" }, photo(it, i < 3)),
    h("div", { class: "s" },
      h("span", { class: "d__cat", text: [pad(i + 1), tr(it, "category")].filter(Boolean).join(" · ") }),
      h("h3", { class: "d__title", text: tr(it, "title") }),
      actions(it, i)));
  const faceEnd = () => h("div", { class: "face face--paper face--end" }, h("div", { class: "e" },
    h("img", { class: "e__logo", src: "assets/logo/rk-logo-360.png", alt: "", draggable: "false" }),
    h("h3", { text: t("book.endTitle") }),
    h("p", { text: t("book.endText") }),
    h("button", { type: "button", class: "d__cta", onclick: () => onRequest?.(""), text: t("book.endCta") })));

  const leaf = (front, back) => {
    front.classList.add("face--front"); back.classList.add("face--back");
    return h("div", { class: "leaf" }, front, back);
  };

  /* ---------------- build ---------------- */
  function rebuild() {
    tweens.forEach((cancel) => cancel()); tweens.clear(); moving.clear();
    root.replaceChildren();
    if (!items.length) return;
    k = clamp(k, 0, maxK());
    const n = items.length;

    leaves = [];
    if (!single()) {
      leaves.push(leaf(faceCover(), faceImage(items[0], 0)));
      for (let i = 1; i < n; i++) leaves.push(leaf(faceDetails(items[i - 1], i - 1), faceImage(items[i], i)));
      leaves.push(leaf(faceDetails(items[n - 1], n - 1), faceEnd()));
    } else {
      leaves.push(leaf(faceCover(), facePaper("face--blank")));
      items.forEach((it, i) => leaves.push(leaf(faceSingle(it, i), facePaper("face--blank"))));
      leaves.push(leaf(faceEnd(), facePaper("face--blank")));
    }
    angles = leaves.map((_, i) => (i < k ? -180 : 0));

    bookEl = h("div", { class: "bk__book" },
      h("div", { class: "bk__board bk__board--l" }), h("div", { class: "bk__board bk__board--r" }),
      h("div", { class: "bk__block bk__block--l" }), h("div", { class: "bk__block bk__block--r" }),
      ...leaves);

    prevBtn = h("button", { type: "button", class: "bk__btn", "aria-label": t("book.prev"), onclick: () => goTo(k - 1) }, icon("prev", 22));
    nextBtn = h("button", { type: "button", class: "bk__btn", "aria-label": t("book.next"), onclick: () => goTo(k + 1) }, icon("next", 22));
    counterEl = h("span", { class: "bk__count", "aria-hidden": "true" });
    hintEl = h("p", { class: "bk__hint", text: t("book.hint") });
    liveEl = h("p", { class: "sr", "aria-live": "polite" });
    bk = h("div", { class: "bk", tabindex: "0", role: "group", "aria-roledescription": "book", "aria-label": t("book.aria"), dataset: { mode: single() ? "single" : "spread" } },
      h("div", { class: "bk__tilt" }, bookEl),
      h("div", { class: "bk__bar" }, prevBtn, counterEl, nextBtn),
      hintEl, liveEl);
    root.append(bk);

    leaves.forEach((_, i) => applyLeaf(i));
    syncUI(); shift();
    wireInput();
    watchForOpen();
  }

  /* ---------------- leaf angle, lighting, stacking ---------------- */
  function applyLeaf(i) {
    const a = angles[i], el = leaves[i], N = leaves.length;
    el.style.setProperty("--a", `${a}deg`);
    el.style.setProperty("--s", Math.abs(Math.sin((a * Math.PI) / 180)).toFixed(3));   // 0 flat … 1 edge-on: drives shading
    el.style.zIndex = moving.has(i) ? N + 10 : a < -90 ? i + 1 : N - i;
    if (single()) el.style.visibility = a <= -179.5 ? "hidden" : "visible";
  }
  const setAngle = (i, a) => { angles[i] = a; applyLeaf(i); };

  function animateLeaf(i, to, ms) {
    tweens.get(i)?.();
    const from = angles[i];
    if (reducedMotion || from === to) { setAngle(i, to); return; }
    const dur = Math.max(260, (ms * Math.abs(to - from)) / 180);
    moving.add(i);
    const t0 = performance.now();
    let raf = 0;
    const step = (now) => {
      const p = clamp((now - t0) / dur, 0, 1);
      setAngle(i, from + (to - from) * ease(p));
      if (p < 1) raf = requestAnimationFrame(step);
      else { moving.delete(i); tweens.delete(i); applyLeaf(i); }
    };
    raf = requestAnimationFrame(step);
    tweens.set(i, () => { cancelAnimationFrame(raf); moving.delete(i); });
  }

  /* ---------------- state ---------------- */
  function shift() {
    const state = bk.dataset.state;
    const x = single() ? "0%" : state === "cover" ? "-25%" : state === "end" ? "25%" : "0%";   // keep a closed book centred
    bookEl.style.setProperty("--shift", x);
  }

  function syncUI() {
    const n = items.length;
    const state = k === 0 ? "cover" : k === maxK() ? "end" : "open";
    bk.dataset.state = state; bk.dataset.k = String(k);
    counterEl.textContent = k >= 1 && k <= n ? `${pad(k)} / ${pad(n)}` : "—";
    prevBtn.disabled = k === 0; nextBtn.disabled = k === maxK();
    leaves.forEach((lf, i) => {   // only the faces you can see are focusable / readable
      const sets = [[lf.querySelector(".face--front"), i === k], [lf.querySelector(".face--back"), !single() && i === k - 1]];
      sets.forEach(([el, vis]) => { el.inert = !vis; el.setAttribute("aria-hidden", String(!vis)); });
    });
    if (k >= 1 && k <= n) liveEl.textContent = `${tr(items[k - 1], "title")} — ${t("book.page", { n: k, total: n })}`;
    onChange?.(k >= 1 && k <= n ? k - 1 : -1);
  }

  function goTo(target) {
    target = clamp(target, 0, maxK());
    if (target === k) return;
    interacted = true; hintEl.classList.add("is-off");
    const from = k, dir = target > from ? 1 : -1, count = Math.abs(target - from);
    k = target; syncUI(); shift();
    const stagger = Math.min(120, 900 / count);
    for (let j = 0; j < count; j++) {
      const idx = dir > 0 ? from + j : from - 1 - j;
      setTimeout(() => animateLeaf(idx, dir > 0 ? -180 : 0, count > 1 ? 650 : 950), j * stagger);
    }
  }

  /* ---------------- input: tap, drag, keys, tilt ---------------- */
  function wireInput() {
    let drag = null;
    const pageW = () => bookEl.getBoundingClientRect().width / (single() ? 1 : 2);

    bookEl.addEventListener("pointerdown", (e) => {
      if (e.button > 0 || e.target.closest("button, a")) return;
      drag = { x0: e.clientX, y0: e.clientY, t0: performance.now(), moved: false, dir: 0, leaf: -1, p: 0, id: e.pointerId };
    });

    bookEl.addEventListener("pointermove", (e) => {
      if (!drag) return;
      const dx = e.clientX - drag.x0;
      if (!drag.moved) {
        if (Math.abs(dx) < 8) return;
        const dir = dx < 0 ? 1 : -1;
        const r = bookEl.getBoundingClientRect();
        const rightSide = (drag.x0 - r.left) / r.width > 0.5;
        const ok = single() ? (dir === 1 ? k < maxK() : k >= 1)
          : dir === 1 ? (k === 0 || rightSide) && k < maxK() : (k === maxK() || !rightSide) && k >= 1;
        if (!ok) { drag = null; return; }
        drag.moved = true; drag.dir = dir; drag.leaf = dir === 1 ? k : k - 1;
        tweens.get(drag.leaf)?.(); moving.add(drag.leaf);
        bookEl.setPointerCapture?.(drag.id);
        bk.classList.add("is-dragging");
        interacted = true; hintEl.classList.add("is-off");
      }
      const p = clamp((drag.dir === 1 ? -dx : dx) / (pageW() * 0.9), 0, 1);
      drag.p = p;
      setAngle(drag.leaf, drag.dir === 1 ? -180 * p : -180 + 180 * p);
    });

    const end = (e) => {
      if (!drag) return;
      const d = drag; drag = null;
      bk.classList.remove("is-dragging");
      if (!d.moved) {                                    // a tap: right side turns forward, left side back
        if (e.type === "pointercancel" || Math.abs(e.clientX - d.x0) > 8 || Math.abs(e.clientY - d.y0) > 8) return;
        const r = bookEl.getBoundingClientRect(), x = (e.clientX - r.left) / r.width;
        if (single()) goTo(x > 0.4 ? k + 1 : k - 1);
        else if (k === 0) goTo(1);
        else if (k === maxK()) goTo(k - 1);
        else goTo(x > 0.5 ? k + 1 : k - 1);
        return;
      }
      const commit = d.p > 0.25 && e.type !== "pointercancel";
      moving.delete(d.leaf);
      const from = k;
      k = commit ? from + d.dir : from;
      syncUI(); shift();
      animateLeaf(d.leaf, (d.dir === 1) === commit ? -180 : 0, 700);
    };
    bookEl.addEventListener("pointerup", end);
    bookEl.addEventListener("pointercancel", end);

    bk.addEventListener("keydown", (e) => {
      const map = { ArrowRight: k + 1, PageDown: k + 1, ArrowLeft: k - 1, PageUp: k - 1, Home: 0, End: maxK() };
      if (e.key in map) { e.preventDefault(); goTo(map[e.key]); }
    });

    if (!reducedMotion) {                                // gentle 3D tilt that follows the mouse
      const tilt = bk.querySelector(".bk__tilt");
      bk.addEventListener("pointermove", (e) => {
        if (e.pointerType !== "mouse" || drag?.moved) return;
        const r = bk.getBoundingClientRect();
        tilt.style.setProperty("--ry", `${(((e.clientX - r.left) / r.width) - 0.5) * 7}deg`);
        tilt.style.setProperty("--rx", `${(0.5 - ((e.clientY - r.top) / r.height)) * 5}deg`);
      });
      bk.addEventListener("pointerleave", () => { tilt.style.setProperty("--ry", "0deg"); tilt.style.setProperty("--rx", "0deg"); });
    }
  }

  // The first time the book scrolls into view it opens itself, so the visitor sees it turn.
  function watchForOpen() {
    observer?.disconnect();
    if (interacted || reducedMotion || k !== 0 || !("IntersectionObserver" in window)) return;
    observer = new IntersectionObserver(([en]) => {
      if (!en.isIntersecting) return;
      observer.disconnect();
      setTimeout(() => { if (!interacted && k === 0) goTo(1); }, 1100);
    }, { threshold: 0.55 });
    observer.observe(bk);
  }

  mq.addEventListener?.("change", () => { if (items.length) rebuild(); });

  return {
    setItems(list) { items = list || []; k = 0; interacted = false; rebuild(); },
    refreshText() { if (items.length) rebuild(); },
    goTo,
    goToCategory(cat) { const i = items.findIndex((x) => x.category === cat); goTo(i >= 0 ? i + 1 : 1); },
    current: () => (k >= 1 && k <= items.length ? k - 1 : -1)
  };
}
