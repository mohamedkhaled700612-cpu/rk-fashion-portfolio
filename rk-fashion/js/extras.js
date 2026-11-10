// Renderers for the optional sections the dashboard fills in: services, how-it-works, reviews, before/after.
// Each returns how many items it drew so the caller can hide the whole section while it is empty.
import { $, h, safeUrl } from "./ui.js";
import { t, tr } from "./i18n.js";
import { optimizedUrl } from "./cloudinary.js";

export function renderServices(sv = {}) {
  const items = (sv.items || []).filter((i) => i?.title);
  $("#svcList").replaceChildren(...items.map((i) =>
    h("li", { class: "svc__row" },
      h("h3", { class: "svc__title", text: tr(i, "title") }),
      h("p", { class: "svc__desc", text: tr(i, "desc") }),
      tr(i, "price") ? h("span", { class: "svc__price", text: tr(i, "price") }) : null)));

  const note = tr(sv, "note").trim();
  $("#svcNote").textContent = note; $("#svcNote").hidden = !note;

  return items.length + (note ? 1 : 0);
}

const IC = {
  1: '<path d="M4 20l1-4L17 4l3 3L8 19z"/><path d="M14 7l3 3"/>',
  2: '<circle cx="6" cy="7" r="2.6"/><circle cx="6" cy="17" r="2.6"/><path d="M8 8.5 20 17M8 15.5 20 7"/>',
  3: '<path d="M12 3v12"/><path d="M12 3c-2 0-3 1-3 2.4S10 8 12 8"/><path d="M4 20c3-3 5 2 8 0s5-3 8 0"/>',
  4: '<path d="M12 6a2 2 0 1 1 2 2c-1 .4-2 1-2 2v1"/><path d="M12 11 3 18h18z"/>'
};
function svgIcon(n) {
  const s = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  s.setAttribute("viewBox", "0 0 24 24"); s.setAttribute("width", 34); s.setAttribute("height", 34);
  s.setAttribute("fill", "none"); s.setAttribute("stroke", "currentColor"); s.setAttribute("stroke-width", "1.3");
  s.setAttribute("stroke-linecap", "round"); s.setAttribute("stroke-linejoin", "round"); s.setAttribute("aria-hidden", "true");
  s.innerHTML = IC[n]; return s;
}

// "From sketch to runway": the steps the dashboard saved, or four sensible defaults while it is empty.
export function renderJourney(sv = {}) {
  let steps = (sv.steps || []).filter((s) => s?.title);
  const custom = steps.length > 0;
  if (!custom) steps = [1, 2, 3, 4].map((n) => ({ _n: n }));
  $("#steps").replaceChildren(...steps.map((s, i) => {
    const title = custom ? tr(s, "title") : t(`journey.s${s._n}.t`);
    const desc = custom ? tr(s, "desc") : t(`journey.s${s._n}.d`);
    const img = custom ? safeUrl(s.image, ["https:"]) : "";
    return h("li", { class: "step" },
      h("span", { class: "step__no", "aria-hidden": "true", text: String(i + 1).padStart(2, "0") }),
      img ? h("img", { class: "step__img", src: optimizedUrl(img, { w: 600 }), alt: "", loading: "lazy", decoding: "async" })
          : h("span", { class: "step__ic" }, svgIcon(((i % 4) + 1))),
      h("h4", { text: title }),
      desc ? h("p", { text: desc }) : null);
  }));
}

export function renderQuotes(tm = {}) {
  const items = (tm.items || []).filter((q) => tr(q, "quote").trim());
  $("#quoteList").replaceChildren(...items.map((q) =>
    h("li", { class: "quote" },
      h("blockquote", {}, h("p", { text: tr(q, "quote") })),
      h("footer", {},
        tr(q, "name") ? h("strong", { text: tr(q, "name") }) : null,
        tr(q, "role") ? h("span", { text: tr(q, "role") }) : null))));
  return items.length;
}

function compare(it) {
  const before = safeUrl(it.before, ["https:"]), after = safeUrl(it.after, ["https:"]);
  if (!before || !after) return null;
  const cap = tr(it, "caption");
  const fig = h("figure", { class: "compare" });
  fig.style.setProperty("--p", "50%");
  const range = h("input", {
    type: "range", min: "2", max: "98", value: "50", class: "compare__range", "aria-label": t("compare.label"),
    oninput: (e) => fig.style.setProperty("--p", `${e.target.value}%`)
  });
  fig.append(
    h("img", { class: "compare__after", src: optimizedUrl(after, { w: 900 }), alt: t("compare.after"), loading: "lazy", decoding: "async" }),
    h("img", { class: "compare__before", src: optimizedUrl(before, { w: 900 }), alt: t("compare.before"), loading: "lazy", decoding: "async" }),
    h("span", { class: "compare__tag compare__tag--before", "data-tag": "before", text: t("compare.before"), "aria-hidden": "true" }),
    h("span", { class: "compare__tag compare__tag--after", "data-tag": "after", text: t("compare.after"), "aria-hidden": "true" }),
    h("span", { class: "compare__handle", "aria-hidden": "true" }),
    range,
    cap ? h("figcaption", { text: cap }) : null);
  return h("li", {}, fig);
}

export function renderBeforeAfter(ba = {}) {
  const rows = (ba.items || []).map(compare).filter(Boolean);
  $("#baGrid").replaceChildren(...rows);
  return rows.length;
}
