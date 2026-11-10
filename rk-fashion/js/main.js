// RK FASHION — public site: content, gallery, request form, motion.
import { $, $$, h, toast, icon, safeUrl, debounce, prefersReducedMotion, trapFocus } from "./ui.js";
import { loadSettings, DEFAULT_SETTINGS } from "./settings.js";
import { fetchPublishedGallery, buildGalleryCard, refreshCardText } from "./gallery.js";
import { submitRequest, REQUEST_TYPES } from "./requests.js";
import { uploadToCloudinary, fileErrorCode, optimizedUrl } from "./cloudinary.js";
import { t, tr, getLang, isRtl, setLang, detectLang } from "./i18n.js";
import { renderServices, renderQuotes, renderBeforeAfter } from "./extras.js";
import { startFlow } from "./hero-shader.js";
import { createBook } from "./book.js";
import { initEffects } from "./effects.js";

const root = document.documentElement;
let gsapOk = false;
let lenis = null;
let flow = null;
let book = null;           // the 3D lookbook
let view = "book";         // "book" | "grid"
let items = [];            // all published gallery items
let activeCategory = "All";
let site = structuredClone(DEFAULT_SETTINGS);   // latest site settings, kept so a language switch can re-render
let galleryLoaded = null;  // null = loading, false = failed, true = ready
let refDesign = "";        // title of the design the visitor chose with "Request this design"
const fieldErr = {};       // currently shown form errors, so they can be re-translated

/* ------------------------------------------------------------------ */
/* helpers                                                             */
/* ------------------------------------------------------------------ */
const withTimeout = (p, ms, fallback) =>
  Promise.race([p, new Promise((r) => setTimeout(() => r(fallback), ms))]);

function splitChars(el) {
  const text = el.textContent.trim();
  el.textContent = "";
  for (const c of text) {
    if (c === " ") el.append(h("span", { class: "sp" }));
    else el.append(h("span", { class: "ch", "aria-hidden": "true" }, h("span", { text: c })));
  }
}
function wrapLine(el) {
  const text = el.textContent;
  el.textContent = "";
  el.append(h("span", { class: "ln" }, h("span", { text })));
}

/* ------------------------------------------------------------------ */
/* content rendering                                                   */
/* ------------------------------------------------------------------ */
function renderSettings(s) {
  site = s;
  $("#heroIntro").textContent = tr(s.hero, "intro").trim() || t("hero.intro");
  const img = safeUrl(s.hero.imageUrl, ["https:"]);
  if (img) {
    const el = $("#heroImage");
    el.style.backgroundImage = `url("${optimizedUrl(img, { w: 1800 })}")`;
    el.classList.add("has-image");
  }
  renderAbout(s.about);
  renderContact(s.contact);
  const counts = {
    services: renderServices(s.services),
    results: renderBeforeAfter(s.beforeAfter),
    reviews: renderQuotes(s.testimonials)
  };
  for (const [id, n] of Object.entries(counts)) $(`#${id}`).hidden = n === 0;
  $$("[data-needs=services]").forEach((a) => (a.hidden = counts.services === 0));
}

function renderAbout(a) {
  const body = $("#aboutBody");
  const block = (title, content) => h("section", { class: "block" }, h("h3", { text: title }), content);
  const timeline = (list) => h("ul", { class: "timeline" }, list.map((e) =>
    h("li", {},
      h("span", { class: "when", text: e.years || "" }),
      h("span", {},
        h("span", { class: "what", text: tr(e, "title") }),
        tr(e, "place") ? h("span", { class: "where", text: tr(e, "place") }) : null,
        tr(e, "details") ? h("span", { class: "more", text: tr(e, "details") }) : null))));

  const parts = [];
  const bio = tr(a, "bio").trim();
  if (bio) parts.push(h("p", { class: "about__bio", text: bio }));
  if (a.education?.length) parts.push(block(t("about.education"), timeline(a.education)));
  if (a.experience?.length) parts.push(block(t("about.experience"), timeline(a.experience)));
  const skills = getLang() === "ar" && a.skillsAr?.length ? a.skillsAr : a.skills;
  if (skills?.length) parts.push(block(t("about.skills"), h("ul", { class: "chips" }, skills.map((s) => h("li", { text: s })))));
  if (a.achievements?.length) parts.push(block(t("about.achievements"), timeline(a.achievements)));
  if (a.personal?.length) {
    parts.push(block(t("about.personal"), h("dl", { class: "facts" },
      a.personal.flatMap((p) => [h("dt", { text: tr(p, "label") }), h("dd", { text: tr(p, "value") })]))));
  }
  const cv = safeUrl(a.cvUrl, ["https:"]);
  if (cv) {
    parts.push(h("a", { class: "btn btn--gold magnetic", href: cv, target: "_blank", rel: "noopener", download: "" },
      icon("download", 18), t("about.cv")));
  }
  body.replaceChildren(...(parts.length ? parts : [h("p", { class: "about__empty", text: t("about.empty") })]));
}

function renderContact(c) {
  const rows = [];
  const add = (ic, label, text, href, ext = true) => {
    const url = safeUrl(href);
    if (!url) return;
    rows.push(h("li", {}, h("a", { class: "contact__link", href: url, ...(ext ? { target: "_blank", rel: "noopener" } : {}) },
      icon(ic, 26), h("small", { text: label }), h("span", { text, dir: "auto" }))));
  };
  if (c.email?.trim()) add("mail", t("contact.email"), c.email.trim(), `mailto:${c.email.trim()}`, false);
  if (c.phone?.trim()) add("phone", t("contact.phone"), c.phone.trim(), `tel:${c.phone.replace(/[^\d+]/g, "")}`, false);
  const wa = (c.whatsapp || "").replace(/\D/g, "");
  const waHref = wa ? `https://wa.me/${wa}?text=${encodeURIComponent(t("wa.message"))}` : "";
  if (wa) add("whatsapp", t("contact.whatsapp"), c.whatsapp.trim(), waHref);
  if (c.instagram?.trim()) {
    const v = c.instagram.trim();
    const handle = v.replace(/^@/, "").replace(/[^A-Za-z0-9._]/g, "");
    const href = /^https?:\/\//i.test(v) ? v : handle ? `https://instagram.com/${handle}` : "";
    add("instagram", t("contact.instagram"), /^https?:\/\//i.test(v) ? v.replace(/^https?:\/\/(www\.)?/i, "") : `@${handle}`, href);
  }
  for (const l of c.links || []) if (l?.url) add("link", t("contact.link"), l.label || l.url, l.url);
  $("#contactList").replaceChildren(...(rows.length ? rows : [h("li", { class: "contact__empty", text: t("contact.empty") })]));

  // floating WhatsApp button
  const fab = $("#waFab");
  fab.hidden = !waHref;
  if (waHref) {
    fab.href = waHref;
    if (!fab.firstChild) fab.append(icon("whatsapp", 28));
  }
}

/* ------------------------------------------------------------------ */
/* gallery                                                             */
/* ------------------------------------------------------------------ */
function categoryLabel(cat) {
  const it = items.find((i) => i.category === cat);
  return it ? tr(it, "category") : cat;
}

function buildFilters() {
  const filters = $("#filters");
  const cats = [...new Set(items.map((i) => i.category).filter(Boolean))];
  filters.hidden = cats.length < 2;
  if (cats.length < 2) return;
  filters.replaceChildren(...["All", ...cats].map((c) =>
    h("button", {
      type: "button", "aria-pressed": String(c === activeCategory), dataset: { cat: c },
      text: c === "All" ? t("filter.all") : categoryLabel(c), onclick: () => applyFilter(c)
    })));
}

function renderGalleryState() {
  const state = $("#galleryState");
  if (galleryLoaded === null) { state.hidden = false; state.textContent = t("gallery.loading"); }
  else if (galleryLoaded === false) { state.hidden = false; state.textContent = t("gallery.error"); }
  else if (!items.length) { state.hidden = false; state.textContent = t("gallery.empty"); }
  else state.hidden = true;
}

function syncBook() {
  if (!book) book = createBook($("#lookbook"), { onOpenItem: openLightbox, onRequest: (title) => chooseDesign(title || "") });
  const list = visibleItems();
  book.setItems(list.map((it) => ({ ...it, _gi: items.indexOf(it) })));
}

function setView(v) {
  view = v;
  $("#viewBook").setAttribute("aria-pressed", String(v === "book")); $("#viewGrid").setAttribute("aria-pressed", String(v === "grid"));
  $("#lookbook").hidden = v !== "book"; $("#grid").hidden = v !== "grid";
  setTimeout(() => window.ScrollTrigger?.refresh(), 100);
}

function renderGallery(list) {
  galleryLoaded = list === null ? false : true;
  items = list || [];
  renderGalleryState();
  $("#viewToggle").hidden = !items.length;
  $("#lookbook").hidden = !items.length || view !== "book";
  if (!items.length) return;
  $("#grid").replaceChildren(...items.map((it, i) => buildGalleryCard(it, i, openLightbox)));
  $("#grid").hidden = view !== "grid";
  buildFilters();
  syncBook();
  $("#grid").addEventListener("load", debounce(() => window.ScrollTrigger?.refresh(), 300), true);
}

// Language switch: update text in place so the scroll animations on existing cards keep working.
function refreshGalleryLang() {
  renderGalleryState();
  $$("#grid .card").forEach((li, i) => items[i] && refreshCardText(li, items[i]));
  buildFilters();
  book?.refreshText();
}

function visibleItems() {
  return activeCategory === "All" ? items : items.filter((i) => i.category === activeCategory);
}

function applyFilter(cat) {
  activeCategory = cat;
  $$("#filters button").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.cat === cat)));
  const cards = $$("#grid .card");
  cards.forEach((c, i) => {
    c._st?.kill(); c._pt?.kill();
    c.hidden = !(cat === "All" || items[i].category === cat);
  });
  syncBook();
  const shown = cards.filter((c) => !c.hidden);
  if (gsapOk && view === "grid") {
    gsap.fromTo(shown, { opacity: 0, y: 36, clipPath: "inset(0 0 0 0)" }, { opacity: 1, y: 0, duration: .9, stagger: .06, ease: "expo.out", overwrite: true });
    shown.forEach((c) => c.querySelector("img") && gsap.set(c.querySelector("img"), { yPercent: 0 }));
    setTimeout(() => ScrollTrigger.refresh(), 1000);
  }
}

/* ------------------------------------------------------------------ */
/* lightbox                                                            */
/* ------------------------------------------------------------------ */
const lb = { el: null, list: [], i: 0, release: null };
function initLightbox() {
  lb.el = $("#lightbox");
  $("#lbClose").append(icon("close", 24)); $("#lbPrev").append(icon("prev", 24)); $("#lbNext").append(icon("next", 24));
  $("#lbClose").addEventListener("click", closeLightbox);
  $("#lbPrev").addEventListener("click", () => lbShow(lb.i - 1));
  $("#lbNext").addEventListener("click", () => lbShow(lb.i + 1));
  $("#lbRequest").addEventListener("click", () => {
    const it = lb.list[lb.i];
    closeLightbox();
    chooseDesign(it?.title || "");
  });
  lb.el.addEventListener("click", (e) => { if (e.target === lb.el) closeLightbox(); });
  document.addEventListener("keydown", (e) => {
    if (lb.el.hidden) return;
    const next = isRtl() ? "ArrowLeft" : "ArrowRight", prev = isRtl() ? "ArrowRight" : "ArrowLeft";
    if (e.key === "Escape") closeLightbox();
    else if (e.key === next) lbShow(lb.i + 1);
    else if (e.key === prev) lbShow(lb.i - 1);
  });
  let x0 = null;
  lb.el.addEventListener("touchstart", (e) => { x0 = e.touches[0].clientX; }, { passive: true });
  lb.el.addEventListener("touchend", (e) => {
    if (x0 == null) return;
    const dx = e.changedTouches[0].clientX - x0; x0 = null;
    if (Math.abs(dx) > 50) lbShow(lb.i + (dx < 0 ? 1 : -1) * (isRtl() ? -1 : 1));
  }, { passive: true });
}
function lbShow(i) {
  lb.i = (i + lb.list.length) % lb.list.length;
  const it = lb.list[lb.i];
  const img = $("#lbImg");
  img.src = optimizedUrl(it.imageUrl, { w: 1800 });
  img.alt = tr(it, "title");
  const cap = $("#lbCap");
  cap.replaceChildren(tr(it, "title"), ...(tr(it, "description") ? [h("small", { text: tr(it, "description") })] : []));
  const many = lb.list.length > 1;
  $("#lbPrev").hidden = $("#lbNext").hidden = !many;
  if (gsapOk) gsap.fromTo(img, { opacity: 0, scale: .97 }, { opacity: 1, scale: 1, duration: .6, ease: "power3.out" });
}
function openLightbox(globalIndex) {
  lb.list = visibleItems();
  lb.i = Math.max(0, lb.list.indexOf(items[globalIndex]));
  lb.el.hidden = false;
  document.body.classList.add("is-locked");
  lenis?.stop();
  lbShow(lb.i);
  lb.release = trapFocus(lb.el);
  $("#lbClose").focus();
}
function closeLightbox() {
  lb.el.hidden = true;
  document.body.classList.remove("is-locked");
  lenis?.start();
  lb.release?.();
}

/* ------------------------------------------------------------------ */
/* request form                                                        */
/* ------------------------------------------------------------------ */
function buildTypeOptions() {
  const sel = $("#requestType"), keep = sel.value;
  sel.replaceChildren(
    h("option", { value: "", text: t("form.typePlaceholder") }),
    ...REQUEST_TYPES.map((ty) => h("option", { value: ty, text: t(`type.${ty}`) })));   // value stays English: the rules check it
  sel.value = keep;
}

function updateRefChip() {
  $("#refChip").hidden = !refDesign;
  $("#refText").textContent = refDesign ? `${t("ref.prefix")} ${refDesign}` : "";
}

// "Request this design": remember the piece, jump to the form and focus the first empty field.
function chooseDesign(title) {
  refDesign = title;
  updateRefChip();
  $("#request").classList.remove("is-done"); $("#success").hidden = true;
  const target = $("#request");
  const go = () => $("#fullName").focus({ preventScroll: true });
  if (lenis) lenis.scrollTo(target, { offset: -60, duration: 1.4, onComplete: go });
  else { window.scrollTo({ top: target.getBoundingClientRect().top + window.scrollY - 60, behavior: prefersReducedMotion ? "auto" : "smooth" }); setTimeout(go, prefersReducedMotion ? 0 : 700); }
}

function initForm() {
  const form = $("#requestForm"), desc = $("#description");
  buildTypeOptions(); updateRefChip();
  $("#refClear").append(icon("close", 16));
  $("#refClear").addEventListener("click", () => { refDesign = ""; updateRefChip(); });
  desc.addEventListener("input", () => { $("#description-count").textContent = `${desc.value.length} / 2000`; });

  const setErr = (name, key, vars) => {
    const msg = key ? t(key, vars) : "";
    if (key) fieldErr[name] = [key, vars]; else delete fieldErr[name];
    const field = $(`#${name}`).closest(".field");
    $(`#${name}-err`).textContent = msg;
    field.classList.toggle("has-error", !!msg);
    $(`#${name}`).setAttribute("aria-invalid", msg ? "true" : "false");
    return !msg;
  };
  const prefixFor = () => (refDesign ? `[Design: ${refDesign}]\n` : "");
  const validate = () => {
    const v = (n) => form.elements[n].value.trim();
    const email = /^[^\s@]+@[^\s@]+\.[^\s@]+$/, digits = v("contactInfo").replace(/\D/g, "");
    const file = form.elements.attachment.files[0];
    const fc = file ? fileErrorCode(file, { allowPdf: true, maxMB: 5 }) : null;
    const results = [
      ["fullName", v("fullName").length < 2 ? "err.name" : v("fullName").length > 80 ? "err.nameLong" : null],
      ["contactInfo", !(email.test(v("contactInfo")) || digits.length >= 7) || v("contactInfo").length > 120 ? "err.contact" : null],
      ["requestType", REQUEST_TYPES.includes(v("requestType")) ? null : "err.type"],
      ["attachment", fc === "type" ? "err.fileType" : fc === "size" ? "err.fileSize" : null, { mb: 5 }],
      ["description", v("description").length < 10 ? "err.descShort" : prefixFor().length + v("description").length > 2000 ? "err.descLong" : null]
    ].map(([n, k, vars]) => [n, setErr(n, k, vars)]);
    const firstBad = results.find(([, ok]) => !ok);
    if (firstBad) $(`#${firstBad[0]}`).focus();
    return !firstBad;
  };
  $$("input, select, textarea", form).forEach((el) => el.addEventListener("input", () => { if (el.id && $(`#${el.id}-err`)) setErr(el.id, null); }));

  let busy = false;
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (busy || form.elements.website.value) return;          // double-click guard + honeypot
    if (!validate()) return;
    try {
      const last = Number(localStorage.getItem("rk:lastSubmit") || 0);
      if (Date.now() - last < 15000) { toast(t("toast.recent"), "info"); return; }
    } catch { /* storage unavailable */ }

    busy = true; form.classList.add("is-busy"); $("#submitBtn").disabled = true; $("#submitBtn").classList.add("is-busy");
    $("#submitBtn .btn__label").textContent = t("form.sending");
    try {
      const file = form.elements.attachment.files[0];
      let attachmentUrl = "";
      if (file) attachmentUrl = (await uploadToCloudinary(file)).url;
      const res = await submitRequest({
        fullName: form.elements.fullName.value, contactInfo: form.elements.contactInfo.value,
        requestType: form.elements.requestType.value, description: prefixFor() + form.elements.description.value.trim(), attachmentUrl
      });
      if (res.duplicate) {
        toast(t("toast.duplicate"), "info", 7000);
      } else {
        try { localStorage.setItem("rk:lastSubmit", String(Date.now())); } catch { /* ignore */ }
        showSuccess(res.id);
      }
    } catch (err) {
      console.error(err);
      toast(err.code === "unavailable" || !navigator.onLine ? t("toast.offline")
        : err.message?.startsWith("Upload") || err.message?.startsWith("Network") ? t("toast.upload")
        : t("toast.generic"), "error", 7000);
    } finally {
      busy = false; form.classList.remove("is-busy"); $("#submitBtn").disabled = false; $("#submitBtn").classList.remove("is-busy");
      $("#submitBtn .btn__label").textContent = t("form.send");
    }
  });

  $("#again").addEventListener("click", () => {
    form.reset(); refDesign = ""; updateRefChip(); $("#description-count").textContent = "0 / 2000";
    $("#success").hidden = true; $("#request").classList.remove("is-done");
    $("#fullName").focus();
  });
}

function showSuccess(id) {
  $("#successRef").textContent = id.slice(0, 10).toUpperCase();
  $("#request").classList.add("is-done");
  const box = $("#success");
  box.hidden = false;
  box.focus({ preventScroll: true });
  box.scrollIntoView({ behavior: prefersReducedMotion ? "auto" : "smooth", block: "center" });
  if (gsapOk) {
    gsap.fromTo("#success > *", { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: .9, stagger: .1, ease: "power3.out" });
    gsap.fromTo(".success__logo", { scale: .8, rotate: -4 }, { scale: 1, rotate: 0, duration: 1.2, ease: "elastic.out(1, .6)" });
  }
}

/* ------------------------------------------------------------------ */
/* header, menu, language, cursor, nav                                 */
/* ------------------------------------------------------------------ */
let menuOpen = false;
function setMenu(open) {
  const toggle = $("#menuToggle"), menu = $("#menu");
  menuOpen = open;
  toggle.setAttribute("aria-expanded", String(open));
  toggle.setAttribute("aria-label", open ? t("menu.close") : t("menu.open"));
  document.body.classList.toggle("is-locked", open);
  if (open) {
    menu.hidden = false; void menu.offsetWidth; menu.classList.add("is-open");
    lenis?.stop(); $("#main").inert = true;       // keep keyboard focus out of the page behind the overlay
    menu.querySelector("a:not([hidden])").focus();
  } else {
    menu.classList.remove("is-open"); lenis?.start(); $("#main").inert = false;
    setTimeout(() => { if (!menuOpen) menu.hidden = true; }, 700);
  }
}

function syncLangButton() {
  $("#langBtn").lang = getLang() === "ar" ? "en" : "ar";      // the button shows the OTHER language's name
}

// Everything that depends on the language, re-applied after a switch.
function onLangChange() {
  syncLangButton();
  renderSettings(site);
  refreshGalleryLang();
  buildTypeOptions(); updateRefChip();
  Object.entries(fieldErr).forEach(([n, [k, vars]]) => { $(`#${n}-err`).textContent = t(k, vars); });
  $("#menuToggle").setAttribute("aria-label", menuOpen ? t("menu.close") : t("menu.open"));
  if (!$("#lightbox").hidden) lbShow(lb.i);
  setTimeout(() => window.ScrollTrigger?.refresh(), 200);
}

function initChrome() {
  const header = $("#siteHeader"), toggle = $("#menuToggle");
  let lastY = window.scrollY;
  window.addEventListener("scroll", () => {
    const y = window.scrollY;
    header.classList.toggle("is-scrolled", y > 40);
    header.classList.toggle("is-hidden", !menuOpen && y > lastY && y > 480);
    lastY = y;
  }, { passive: true });

  toggle.addEventListener("click", () => setMenu(!menuOpen));
  document.addEventListener("keydown", (e) => { if (e.key === "Escape" && menuOpen) { setMenu(false); toggle.focus(); } });
  $("#langBtn").addEventListener("click", () => { setLang(getLang() === "ar" ? "en" : "ar"); onLangChange(); });
  $("#viewBook").addEventListener("click", () => setView("book"));
  $("#viewGrid").addEventListener("click", () => setView("grid"));

  // anchor links (works with and without smooth-scroll library)
  document.addEventListener("click", (e) => {
    const a = e.target.closest('a[href^="#"]');
    if (!a || a.id === "waFab") return;
    const id = a.getAttribute("href");
    const target = id === "#top" ? document.body : document.querySelector(id);
    if (!target) return;
    e.preventDefault();
    if (menuOpen) setMenu(false);
    if (lenis) lenis.scrollTo(id === "#top" ? 0 : target, { offset: id === "#top" ? 0 : -60, duration: 1.4 });
    else window.scrollTo({ top: id === "#top" ? 0 : target.getBoundingClientRect().top + window.scrollY - 60, behavior: prefersReducedMotion ? "auto" : "smooth" });
    history.replaceState(null, "", id);
  });

  // active link while scrolling
  const links = $$(".nav a");
  const io = new IntersectionObserver((entries) => entries.forEach((en) => {
    if (en.isIntersecting) links.forEach((l) => l.classList.toggle("is-active", l.getAttribute("href") === `#${en.target.id}`));
  }), { rootMargin: "-45% 0px -50% 0px" });
  $$("main section[id]").forEach((s) => io.observe(s));

  window.addEventListener("pointermove", (e) => {
    if (e.pointerType === "mouse") flow?.mouse(e.clientX / innerWidth, e.clientY / innerHeight);
  }, { passive: true });
}

function initCursorAndMagnets() {
  if (!gsapOk || !matchMedia("(hover: hover) and (pointer: fine)").matches) return;
  root.classList.add("has-cursor");
  const cur = $("#cursor");
  const qx = gsap.quickTo(cur, "x", { duration: .35, ease: "power3" }), qy = gsap.quickTo(cur, "y", { duration: .35, ease: "power3" });
  window.addEventListener("pointermove", (e) => { qx(e.clientX); qy(e.clientY); }, { passive: true });
  document.addEventListener("pointerover", (e) => cur.classList.toggle("is-hover", !!e.target.closest("a, button, input, select, textarea, .card__btn")));

  document.addEventListener("pointermove", (e) => {
    const m = e.target.closest?.(".magnetic");
    if (!m) return;
    const r = m.getBoundingClientRect();
    gsap.to(m, { x: (e.clientX - (r.left + r.width / 2)) * .25, y: (e.clientY - (r.top + r.height / 2)) * .35, duration: .4, ease: "power3.out" });
  });
  document.addEventListener("pointerout", (e) => {
    const m = e.target.closest?.(".magnetic");
    if (m && !m.contains(e.relatedTarget)) gsap.to(m, { x: 0, y: 0, duration: .8, ease: "elastic.out(1, .4)" });
  });
}

/* ------------------------------------------------------------------ */
/* motion                                                              */
/* ------------------------------------------------------------------ */
function initSmooth() {
  if (!window.Lenis) return;
  lenis = new Lenis({ duration: 1.15, smoothWheel: true });
  lenis.on("scroll", ScrollTrigger.update);
  gsap.ticker.add((t) => lenis.raf(t * 1000));
  gsap.ticker.lagSmoothing(0);
}

function initScroll() {
  // The colour field stays vivid on the hero, then recedes so content stays readable.
  gsap.fromTo("#flowDim", { opacity: .12 }, {
    opacity: .82, ease: "none",
    scrollTrigger: { trigger: ".hero", start: "top top", end: "bottom 25%", scrub: true }
  });
  // Hero drifts and softens as you leave it.
  gsap.to("#heroLogo", { yPercent: -16, scale: .88, ease: "none", scrollTrigger: { trigger: ".hero", start: "top top", end: "bottom top", scrub: true } });
  gsap.to("#heroTitle", { yPercent: -10, opacity: .15, ease: "none", scrollTrigger: { trigger: ".hero", start: "20% top", end: "bottom top", scrub: true } });
  // Section titles rise out of a mask.
  $$(".section__title").forEach((el) => {
    gsap.fromTo($$(".ln > span", el), { yPercent: 110 }, {
      yPercent: 0, duration: 1.2, ease: "expo.out", scrollTrigger: { trigger: el, start: "top 88%", once: true }
    });
  });
  // Portrait: frame wipes open while the photo settles from a slight zoom.
  gsap.fromTo("#portrait", { clipPath: "inset(0 0 100% 0)" }, {
    clipPath: "inset(0 0 0% 0)", duration: 1.5, ease: "expo.out", clearProps: "clipPath",
    scrollTrigger: { trigger: "#portrait", start: "top 88%", once: true }
  });
  gsap.fromTo("#portrait img", { scale: 1.12 }, {
    scale: 1, ease: "none", scrollTrigger: { trigger: "#portrait", start: "top bottom", end: "bottom 30%", scrub: true }
  });
  // About blocks wipe in.
  $$(".about__body > *").forEach((el) => {
    gsap.fromTo(el, { clipPath: "inset(0 0 100% 0)", y: 40 }, {
      clipPath: "inset(0 0 0% 0)", y: 0, duration: 1.3, ease: "expo.out", clearProps: "clipPath",
      scrollTrigger: { trigger: el, start: "top 90%", once: true }
    });
  });
  // Gallery: curtain reveal + slow parallax inside each frame.
  $$("#grid .card").forEach((card) => {
    const tw = gsap.fromTo(card, { opacity: 0, clipPath: "inset(14% 0 0 0)", y: 60 }, {
      opacity: 1, clipPath: "inset(0% 0 0 0)", y: 0, duration: 1.2, ease: "expo.out", clearProps: "clipPath",
      scrollTrigger: { trigger: card, start: "top 92%", once: true }
    });
    card._st = tw.scrollTrigger;
    const img = card.querySelector("img");
    if (img) card._pt = gsap.fromTo(img, { yPercent: -5 }, {
      yPercent: 5, ease: "none", scrollTrigger: { trigger: card, start: "top bottom", end: "bottom top", scrub: true }
    }).scrollTrigger;
  });
  // Services, steps, before/after and reviews rise in one by one.
  $$(".svc__row, .steps .step, .ba > li, .quotes .quote").forEach((el) => {
    gsap.fromTo(el, { opacity: 0, y: 44 }, {
      opacity: 1, y: 0, duration: 1, ease: "power3.out", clearProps: "transform",
      scrollTrigger: { trigger: el, start: "top 92%", once: true }
    });
  });
  gsap.fromTo("#requestForm .field, #requestForm .form__actions", { opacity: 0, y: 30 }, {
    opacity: 1, y: 0, duration: .9, stagger: .08, ease: "power3.out",
    scrollTrigger: { trigger: "#requestForm", start: "top 80%", once: true }
  });
  gsap.fromTo("#contactList li", { opacity: 0, y: 30 }, {
    opacity: 1, y: 0, duration: .9, stagger: .1, ease: "power3.out",
    scrollTrigger: { trigger: "#contactList", start: "top 88%", once: true }
  });
  gsap.fromTo("#waFab:not([hidden])", { scale: 0 }, { scale: 1, duration: .8, delay: 2.2, ease: "elastic.out(1, .5)", clearProps: "transform" });
  ScrollTrigger.refresh();
}

function playIntro() {
  const tl = gsap.timeline({ defaults: { ease: "power4.out" } });
  tl.to(".site-header", { opacity: 1, duration: .9 }, 0)
    .fromTo("#heroLogo", { opacity: 0, scale: .82, yPercent: 8, clipPath: "inset(100% 0 0 0 round 26px)" },
      { opacity: 1, scale: 1, yPercent: 0, clipPath: "inset(0% 0 0 0 round 26px)", duration: 1.6, ease: "expo.out", clearProps: "clipPath" }, 0)
    .fromTo("#heroTitle .ch > span", { yPercent: 110 }, { yPercent: 0, duration: 1.3, stagger: .06 }, .3)
    .fromTo(".hero__name", { opacity: 0, y: 24 }, { opacity: 1, y: 0, duration: 1 }, .9)
    .fromTo(".hero__intro", { opacity: 0, y: 24 }, { opacity: 1, y: 0, duration: 1 }, 1.05)
    .fromTo(".hero__cta .btn", { opacity: 0, y: 24 }, { opacity: 1, y: 0, duration: .9, stagger: .1 }, 1.2);
}

function liftCurtain() {
  return new Promise((resolve) => {
    gsap.to("#preloader", {
      yPercent: -100, duration: 1, ease: "expo.inOut",
      onStart: () => setTimeout(resolve, 450),                // start the hero intro while the curtain is still moving
      onComplete: () => root.classList.add("ready")
    });
  });
}

/* ------------------------------------------------------------------ */
/* boot                                                                */
/* ------------------------------------------------------------------ */
async function main() {
  window.__rkBooted = true;
  setLang(detectLang(), { persist: false });          // translate static text first
  syncLangButton();
  gsapOk = !prefersReducedMotion && !!window.gsap && !!window.ScrollTrigger;
  if (gsapOk) { root.classList.add("anim"); gsap.registerPlugin(ScrollTrigger); }
  else { root.classList.remove("anim"); root.classList.add("ready"); }

  initChrome(); initForm(); initLightbox(); initEffects();
  flow = startFlow($("#flow"), { reducedMotion: prefersReducedMotion });

  const dataReady = Promise.all([
    withTimeout(loadSettings(), 4000, structuredClone(DEFAULT_SETTINGS)),
    withTimeout(fetchPublishedGallery().catch((e) => { console.warn(e); return null; }), 4000, null)
  ]);

  if (!gsapOk) {
    const [settings, list] = await dataReady;
    renderSettings(settings); renderGallery(list);
    return;
  }

  splitChars($("#heroTitle"));
  $$(".section__title").forEach(wrapLine);
  const drawn = new Promise((r) => gsap.fromTo("#preloader .preloader__logo", { opacity: 0, scale: .9, y: 16 }, { opacity: 1, scale: 1, y: 0, duration: 1.3, ease: "power3.out", onComplete: () => setTimeout(r, 350) }));
  const [[settings, list]] = await Promise.all([dataReady, drawn]).then(([d]) => [d]);
  renderSettings(settings); renderGallery(list);
  initSmooth(); initScroll(); initCursorAndMagnets();
  await liftCurtain();
  playIntro();
}

main().catch((err) => {
  console.error(err);
  root.classList.remove("anim");           // never leave the page hidden if something fails
  root.classList.add("ready");
});
