// Small, dependency-free motion extras: scroll progress line, marquee that leans with scroll speed, gold dust under the cursor.
import { prefersReducedMotion } from "./ui.js";

export function initEffects() {
  const bar = document.getElementById("scrollProgress"), marquee = document.querySelector(".marquee");
  let last = window.scrollY, timer = 0;
  const onScroll = () => {
    const y = window.scrollY, max = document.documentElement.scrollHeight - innerHeight;
    bar?.style.setProperty("--sp", max > 0 ? (y / max).toFixed(4) : "0");
    if (marquee && !prefersReducedMotion) {
      const dy = y - last; last = y;
      marquee.style.setProperty("--sk", `${Math.max(-12, Math.min(12, dy * -0.35)).toFixed(2)}deg`);
      clearTimeout(timer);
      timer = setTimeout(() => marquee.style.setProperty("--sk", "0deg"), 140);
    }
  };
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();
  initDust();
}

function initDust() {
  if (prefersReducedMotion || !matchMedia("(hover: hover) and (pointer: fine)").matches) return;
  const c = document.getElementById("dust");
  if (!c) return;
  const ctx = c.getContext("2d");
  let W = 0, H = 0, dpr = 1;
  const resize = () => {
    dpr = Math.min(devicePixelRatio || 1, 2); W = innerWidth; H = innerHeight;
    c.width = W * dpr; c.height = H * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  };
  resize(); window.addEventListener("resize", resize);
  const ps = []; let raf = 0, lx = 0, ly = 0;
  const rnd = (a, b) => a + Math.random() * (b - a);

  window.addEventListener("pointermove", (e) => {
    if (e.pointerType !== "mouse") return;
    const dx = e.clientX - lx, dy = e.clientY - ly; lx = e.clientX; ly = e.clientY;
    const n = Math.min(3, Math.ceil(Math.hypot(dx, dy) / 16));
    for (let i = 0; i < n; i++) ps.push({ x: e.clientX + rnd(-7, 7), y: e.clientY + rnd(-7, 7), vx: rnd(-.35, .35) + dx * .015, vy: rnd(-.55, .1) + dy * .015, life: 1, r: rnd(.9, 2.6) });
    if (ps.length > 150) ps.splice(0, ps.length - 150);
    if (!raf) raf = requestAnimationFrame(tick);
  }, { passive: true });

  function tick() {
    ctx.clearRect(0, 0, W, H);
    ctx.globalCompositeOperation = "lighter";
    for (let i = ps.length - 1; i >= 0; i--) {
      const p = ps[i];
      p.x += p.vx; p.y += p.vy; p.vy += .012; p.life -= .017;
      if (p.life <= 0) { ps.splice(i, 1); continue; }
      ctx.fillStyle = `rgba(227,203,143,${(p.life * .16).toFixed(3)})`;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r * 3.2, 0, 6.2832); ctx.fill();
      ctx.fillStyle = `rgba(255,236,190,${(p.life * .85).toFixed(3)})`;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 6.2832); ctx.fill();
    }
    raf = ps.length ? requestAnimationFrame(tick) : 0;
    if (!ps.length) ctx.clearRect(0, 0, W, H);
  }
}
