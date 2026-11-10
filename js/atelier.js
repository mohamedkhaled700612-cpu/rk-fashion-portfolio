// The atelier: a paint canvas with a fan of colour chips, brush strokes that draw themselves,
// and a self-painting demo ribbon. Pure canvas + pointer events, no libraries.
import { $, $$, h, prefersReducedMotion } from "./ui.js";
import { t } from "./i18n.js";

const CHIPS = [["burgundy", "#8c1d3c", "19-1629"], ["gold", "#c9a24b", "15-0948"], ["emerald", "#0f7a56", "18-5642"], ["navy", "#1c2a63", "19-3920"], ["rose", "#d98a9c", "15-1920"], ["noir", "#17110f", "19-0303"], ["ivory", "#efe4cf", "11-0602"]];

export function initAtelier() {
  const canvas = $("#atelierCanvas"), fan = $("#atelierFan");
  if (!canvas || !fan) return;
  const ctx = canvas.getContext("2d");
  let color = CHIPS[0][1], size = 18, dpr = 1, W = 0, H = 0, drawn = false;

  // ---- colour chips (Pantone-style cards in a fan)
  const mid = (CHIPS.length - 1) / 2;
  const chipEls = CHIPS.map(([k, hex, code], i) => {
    const b = h("button", { type: "button", class: "chip", "aria-pressed": String(i === 0), style: `--r:${(i - mid) * 7}deg; --d:${i * 0.08}s; --c:${hex}` },
      h("span", { class: "chip__c" }),
      h("span", { class: "chip__n", dataset: { k }, text: t(`sw.${k}`) }),
      h("span", { class: "chip__code", text: `RK ${code}` }));
    b.addEventListener("click", () => { color = hex; chipEls.forEach((c) => c.setAttribute("aria-pressed", String(c === b))); });
    return b;
  });
  fan.replaceChildren(...chipEls);
  document.addEventListener("rk:lang", () => $$(".chip__n", fan).forEach((n) => (n.textContent = t(`sw.${n.dataset.k}`))));

  // ---- canvas
  const resize = () => {
    const r = canvas.getBoundingClientRect();
    if (!r.width) return;
    const keep = drawn ? ctx.getImageData(0, 0, canvas.width, canvas.height) : null;
    dpr = Math.min(devicePixelRatio || 1, 2); W = r.width; H = r.height;
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.lineCap = "round"; ctx.lineJoin = "round";
    if (keep) ctx.putImageData(keep, 0, 0);
  };
  resize(); addEventListener("resize", resize);

  // a bristle brush: several thin offset lines per segment, so the stroke has a dry-brush grain
  const bristles = Array.from({ length: 7 }, (_, i) => ({ o: (i / 6 - 0.5) * 2, a: 0.55 + Math.random() * 0.4, w: 0.18 + Math.random() * 0.22 }));
  function seg(x0, y0, x1, y1, w, col) {
    const dx = x1 - x0, dy = y1 - y0, len = Math.hypot(dx, dy) || 1, nx = -dy / len, ny = dx / len;
    ctx.strokeStyle = col;
    for (const b of bristles) {
      const off = b.o * (w / 2);
      ctx.globalAlpha = b.a * 0.85; ctx.lineWidth = Math.max(1, w * b.w);
      ctx.beginPath(); ctx.moveTo(x0 + nx * off, y0 + ny * off); ctx.lineTo(x1 + nx * off, y1 + ny * off); ctx.stroke();
    }
    ctx.globalAlpha = 1; drawn = true;
  }

  let last = null;
  const pos = (e) => { const r = canvas.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
  canvas.addEventListener("pointerdown", (e) => { canvas.setPointerCapture(e.pointerId); const [x, y] = pos(e); last = { x, y, t: performance.now(), w: size }; seg(x, y, x + .01, y + .01, size, color); $("#atelierHint").classList.add("is-off"); stopDemo(); });
  canvas.addEventListener("pointermove", (e) => {
    if (!last) return;
    const [x, y] = pos(e), now = performance.now();
    const v = Math.hypot(x - last.x, y - last.y) / Math.max(8, now - last.t);       // faster stroke = thinner line, like a real brush
    const w = last.w + (size * clamp(1.15 - v * 0.35, 0.35, 1.15) - last.w) * 0.25;
    seg(last.x, last.y, x, y, w, color);
    last = { x, y, t: now, w };
  });
  const up = () => { last = null; };
  canvas.addEventListener("pointerup", up); canvas.addEventListener("pointercancel", up);
  const clamp = (a, lo, hi) => Math.min(hi, Math.max(lo, a));

  $("#atelierSize").addEventListener("input", (e) => (size = +e.target.value));
  $("#atelierClear").addEventListener("click", () => { stopDemo(); ctx.clearRect(0, 0, canvas.width, canvas.height); drawn = false; $("#atelierHint").classList.remove("is-off"); });
  $("#atelierSave").addEventListener("click", () => {
    const out = document.createElement("canvas"); out.width = canvas.width; out.height = canvas.height;
    const o = out.getContext("2d"); o.fillStyle = "#f7efe2"; o.fillRect(0, 0, out.width, out.height); o.drawImage(canvas, 0, 0);
    out.toBlob((blob) => { if (!blob) return; const a = h("a", { href: URL.createObjectURL(blob), download: "rk-fashion-sketch.png" }); document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 4000); });
  });

  // ---- the demo ribbon that paints itself the first time the canvas is seen
  let demoRaf = 0;
  function stopDemo() { cancelAnimationFrame(demoRaf); demoRaf = 0; }
  function demo() {
    if (drawn) return;
    $("#atelierHint").classList.add("is-off");
    const cols = ["#8c1d3c", "#c9a24b", "#8c1d3c"];
    const total = prefersReducedMotion ? 1 : 2600, t0 = performance.now();
    const pt = (u) => [W * (0.08 + 0.84 * u), H * (0.5 + Math.sin(u * 6.28 * 1.25) * 0.26 * (1 - u * 0.25))];
    let u0 = 0;
    const step = (now) => {
      const u = prefersReducedMotion ? 1 : Math.min(1, (now - t0) / total);
      for (let s = u0; s < u; s += 0.004) {
        const [x0, y0] = pt(s), [x1, y1] = pt(Math.min(1, s + 0.004));
        const w = 6 + 26 * Math.sin(Math.min(1, s) * Math.PI);
        seg(x0, y0, x1, y1, w, cols[Math.min(2, Math.floor(s * 3))]);
      }
      u0 = u;
      if (u < 1) demoRaf = requestAnimationFrame(step); else demoRaf = 0;
    };
    demoRaf = requestAnimationFrame(step);
  }
  if ("IntersectionObserver" in window) {
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { io.disconnect(); resize(); setTimeout(demo, 400); } }, { threshold: 0.4 });
    io.observe(canvas);
  } else demo();

  // ---- brush strokes + splatters reveal
  const sec = $("#atelier");
  if ("IntersectionObserver" in window) {
    const io2 = new IntersectionObserver(([e]) => { if (e.isIntersecting) { sec.classList.add("is-in"); io2.disconnect(); } }, { threshold: 0.15 });
    io2.observe(sec);
  } else sec.classList.add("is-in");
}
