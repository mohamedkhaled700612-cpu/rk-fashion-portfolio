// Printable catalogue: one A4 page per published design. "Save as PDF" uses the browser's print dialog,
// so it works offline from the data already loaded, in English and Arabic, with no extra library.
import { loadSettings } from "./settings.js";
import { fetchPublishedGallery } from "./gallery.js";
import { optimizedUrl } from "./cloudinary.js";
import { h, safeUrl } from "./ui.js";
import { t, tr, setLang, detectLang, applyStatic } from "./i18n.js";

const $ = (s) => document.querySelector(s);
const pad = (n) => String(n).padStart(2, "0");

async function main() {
  setLang(detectLang(), { persist: false });
  applyStatic();
  document.title = `RK FASHION — ${t("cat.title")}`;
  $("#back").href = `index.html${detectLang() === "ar" ? "?lang=ar" : ""}#portfolio`;

  const [site, items] = await Promise.all([
    loadSettings().catch(() => null),
    fetchPublishedGallery().catch(() => [])
  ]);
  const c = site?.contact || {};
  const state = $("#state");
  if (!items.length) { state.textContent = t("cat.empty"); return; }

  const contactLines = [c.email, c.phone, c.whatsapp, c.instagram && (/^https?:/i.test(c.instagram) ? c.instagram : `@${String(c.instagram).replace(/^@/, "")}`)].filter((x) => x && String(x).trim());
  const total = items.length + 2;
  const foot = (n) => h("span", { class: "pg__no", text: t("cat.page", { n: pad(n), total: pad(total) }) });

  const pages = [
    h("section", { class: "pg pg--cover" },
      h("div", { class: "cover" },
        h("span", { class: "cover__k", text: t("cat.cover") }),
        h("div", { class: "cover__plate" }, h("img", { src: "assets/logo/rk-logo-360.png", alt: "" })),
        h("h1", { class: "cover__n", text: "Raghad Khaled" }),
        h("span", { class: "cover__s", text: "RK FASHION" })))
  ];
  items.forEach((it, i) => pages.push(
    h("section", { class: "pg" },
      h("div", { class: "frame" }, h("img", { src: optimizedUrl(it.imageUrl, { w: 1400 }), alt: tr(it, "title") })),
      h("div", { class: "meta" },
        h("span", { class: "meta__no", text: pad(i + 1) }),
        h("div", {},
          tr(it, "category") ? h("span", { class: "meta__cat", text: tr(it, "category") }) : null,
          h("h2", { text: tr(it, "title") }),
          tr(it, "description") ? h("p", { text: tr(it, "description") }) : null)),
      foot(i + 2))));
  pages.push(h("section", { class: "pg pg--end" },
    h("div", { class: "end" },
      h("img", { class: "end__logo", src: "assets/logo/rk-logo-360.png", alt: "" }),
      h("h2", { text: t("cat.contact") }),
      ...contactLines.map((l) => h("p", { class: "end__l", dir: "auto", text: String(l).trim() }))),
    foot(total)));

  $("#book").replaceChildren(...pages);
  state.hidden = true;

  const imgs = [...document.images];
  await Promise.all(imgs.map((im) => im.complete ? 0 : new Promise((r) => { im.onload = im.onerror = r; })));
  const save = $("#save");
  save.disabled = false;
  save.addEventListener("click", () => window.print());
  if (new URLSearchParams(location.search).get("print") === "1") setTimeout(() => window.print(), 300);
}
main();
