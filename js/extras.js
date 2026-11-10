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

  const steps = (sv.steps || []).filter((s) => s?.title);
  $("#steps").replaceChildren(...steps.map((s) =>
    h("li", { class: "step" },
      h("h4", { text: tr(s, "title") }),
      tr(s, "desc") ? h("p", { text: tr(s, "desc") }) : null)));
  $("#processWrap").hidden = steps.length === 0;
  return items.length + steps.length;
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
