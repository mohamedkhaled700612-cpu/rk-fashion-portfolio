// RK FASHION — admin dashboard. Access is checked against admins/{uid}; Firestore rules enforce it again.
import { $, $$, h, toast, formatDate, debounce, safeUrl } from "./ui.js";
import { auth } from "./firebase-config.js";
import { watchAdmin, login, logout, resetPassword, friendlyAuthError } from "./auth.js";
import { subscribeRequests, setRequestStatus, saveRequestNotes, removeRequest, STATUSES } from "./requests.js";
import { subscribeGallery, createGalleryItem, updateGalleryItem, removeGalleryItem } from "./gallery.js";
import { loadSettings, saveSettings, DEFAULT_SETTINGS } from "./settings.js";
import { uploadToCloudinary, validateFile, optimizedUrl, deleteCloudinaryAsset } from "./cloudinary.js";

const state = { requests: [], gallery: [], settings: structuredClone(DEFAULT_SETTINGS), currentReq: null, currentImg: null, hero: null };
let unsubs = [];
let reps = {};
let wired = false;

/* ------------------------------------------------------------------ */
/* access gate                                                         */
/* ------------------------------------------------------------------ */
const gate = $("#gate"), gateMsg = $("#gateMsg");
function showGate(node) { gateMsg.replaceChildren(node); gate.hidden = false; $("#login").hidden = true; $("#app").hidden = true; }

let deniedShown = false;
watchAdmin(({ state: s, user }) => {
  unsubs.forEach((u) => u()); unsubs = [];
  if (s === "signed-out") {
    if (deniedShown) return;            // we signed an unauthorised user out; keep the explanation on screen
    gate.hidden = true; $("#app").hidden = true; $("#login").hidden = false;
    document.body.classList.remove("is-checking");
    return;
  }
  if (s === "denied") {
    deniedShown = true;
    showGate(h("span", {},
      "This account is not authorised to use the dashboard.",
      h("br"), h("br"), h("small", {}, "Account ID: ", h("code", { text: user.uid })),
      h("br"), h("br"), h("small", {}, "Redirecting to the website… ", h("a", { href: "index.html", text: "Go now" }))));
    document.body.classList.remove("is-checking");
    logout().catch(() => {});
    setTimeout(() => location.replace("index.html"), 9000);
    return;
  }
  // authorised administrator
  gate.hidden = true; $("#login").hidden = true; $("#app").hidden = false;
  document.body.classList.remove("is-checking");
  $("#who").textContent = user.email || "";
  if (!wired) { wireDashboard(); wired = true; }
  startData();
});

/* login */
$("#loginForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const err = $("#loginError"), btn = $("#loginBtn");
  err.textContent = "";
  const email = $("#email").value.trim(), pw = $("#password").value;
  if (!email || !pw) { err.textContent = "Enter your email and password."; return; }
  btn.disabled = true; btn.textContent = "Signing in…";
  try { await login(email, pw); $("#password").value = ""; }
  catch (ex) { err.textContent = friendlyAuthError(ex); }
  finally { btn.disabled = false; btn.textContent = "Sign in"; }
});
$("#forgot").addEventListener("click", async () => {
  const email = $("#email").value.trim();
  if (!email) { $("#loginError").textContent = "Type your email above first."; return; }
  try { await resetPassword(email); } catch { /* do not reveal whether the account exists */ }
  $("#loginError").textContent = "";
  toast("If that email has an account, a password reset link is on its way.", "success", 7000);
});
$("#logout").addEventListener("click", () => logout());

/* ------------------------------------------------------------------ */
/* data subscriptions                                                  */
/* ------------------------------------------------------------------ */
function startData() {
  const fail = (what) => (e) => { console.error(e); toast(`Could not load ${what}. Check the Firestore rules and your admin record.`, "error", 8000); };
  unsubs.push(subscribeRequests((list) => { state.requests = list; renderRequests(); renderStats(); }, fail("requests")));
  unsubs.push(subscribeGallery((list) => { state.gallery = list; renderGallery(); renderStats(); }, fail("the gallery")));
  loadSettings().then((s) => { state.settings = s; fillForms(); });
}

/* ------------------------------------------------------------------ */
/* navigation                                                          */
/* ------------------------------------------------------------------ */
function showView(name) {
  $$(".view").forEach((v) => (v.hidden = v.id !== `view-${name}`));
  $$("#tabs button").forEach((b) => (b.dataset.view === name ? b.setAttribute("aria-current", "page") : b.removeAttribute("aria-current")));
  history.replaceState(null, "", `#${name}`);
  window.scrollTo(0, 0);
}

function wireDashboard() {
  $$("#tabs button").forEach((b) => b.addEventListener("click", () => showView(b.dataset.view)));
  const initial = location.hash.slice(1);
  showView($(`#view-${initial}`) ? initial : "overview");

  $("#reqSearch").addEventListener("input", debounce(renderRequests, 150));
  $("#reqStatus").addEventListener("change", renderRequests);
  wireRequestModal(); wireGallery(); wireContent();
  $$("dialog.modal").forEach((d) => d.addEventListener("click", (e) => { if (e.target === d) d.close(); }));
}

/* ------------------------------------------------------------------ */
/* overview + requests                                                 */
/* ------------------------------------------------------------------ */
function renderStats() {
  const c = (s) => state.requests.filter((r) => r.status === s).length;
  $("#sTotal").textContent = state.requests.length;
  $("#sPending").textContent = c("Pending");
  $("#sApproved").textContent = c("Approved");
  $("#sRejected").textContent = c("Rejected");
  $("#sGallery").textContent = state.gallery.length;
  const pub = state.gallery.filter((g) => g.isPublished).length;
  $("#sPublished").textContent = state.gallery.length ? `(${pub} published)` : "";
  const pill = $("#pendingPill"), p = c("Pending");
  pill.textContent = p; pill.hidden = p === 0;

  const latest = $("#latest");
  latest.replaceChildren(...(state.requests.length ? state.requests.slice(0, 5).map((r) =>
    h("li", {}, h("button", { type: "button", onclick: () => openRequest(r.id) },
      h("span", {}, h("strong", { text: r.fullName }), " — ", r.requestType),
      h("span", {}, h("span", { class: `badge badge--${r.status}`, text: r.status }), " ", h("span", { class: "muted", text: formatDate(r.createdAt) }))))) :
    [h("li", { class: "empty", text: "No requests yet." })]));
}

function renderRequests() {
  const q = $("#reqSearch").value.trim().toLowerCase(), st = $("#reqStatus").value;
  const rows = state.requests.filter((r) =>
    (!st || r.status === st) &&
    (!q || [r.fullName, r.contactInfo, r.requestType, r.description, r.adminNotes].join(" ").toLowerCase().includes(q)));
  $("#reqRows").replaceChildren(...rows.map((r) => h("tr", {},
    h("td", { text: formatDate(r.createdAt) }),
    h("td", { text: r.fullName }),
    h("td", { text: r.requestType }),
    h("td", { class: "clip", text: r.contactInfo }),
    h("td", {}, h("span", { class: `badge badge--${r.status}`, text: r.status })),
    h("td", {}, h("button", { class: "btn btn--ghost", type: "button", onclick: () => openRequest(r.id) }, "Open")))));
  $("#reqEmpty").hidden = rows.length > 0;
  $("#reqEmpty").textContent = state.requests.length ? "No requests match your search." : "No requests yet. New requests appear here instantly.";
  if (state.currentReq && $("#reqModal").open) refreshRequestModal();
}

/* request detail modal */
function openRequest(id) {
  const r = state.requests.find((x) => x.id === id);
  if (!r) return;
  state.currentReq = id;
  $("#rmNotes").value = r.adminNotes || "";
  refreshRequestModal();
  $("#reqModal").showModal();
}
function refreshRequestModal() {
  const r = state.requests.find((x) => x.id === state.currentReq);
  if (!r) { $("#reqModal").close(); return; }
  const att = safeUrl(r.attachmentUrl, ["https:"]);
  $("#rmTitle").textContent = r.requestType;
  $("#rmFacts").replaceChildren(
    h("dt", { text: "Name" }), h("dd", { text: r.fullName }),
    h("dt", { text: "Contact" }), h("dd", { text: r.contactInfo }),
    h("dt", { text: "Received" }), h("dd", { text: formatDate(r.createdAt) }),
    h("dt", { text: "Updated" }), h("dd", { text: formatDate(r.updatedAt) }),
    h("dt", { text: "Details" }), h("dd", { text: r.description }),
    h("dt", { text: "Attachment" }), h("dd", {}, att ? h("a", { href: att, target: "_blank", rel: "noopener", text: "Open attachment" }) : "None"));
  $("#rmStatus").replaceChildren(...STATUSES.map((s) =>
    h("button", { type: "button", "aria-pressed": String(r.status === s), text: s, onclick: () => changeStatus(r.id, s) })));
}
async function changeStatus(id, status) {
  try { await setRequestStatus(id, status); toast(`Request marked ${status.toLowerCase()}.`, "success"); }
  catch (e) { console.error(e); toast("Could not change the status. Try again.", "error"); }
}
function wireRequestModal() {
  $("#rmSave").addEventListener("click", async () => {
    try { await saveRequestNotes(state.currentReq, $("#rmNotes").value.trim()); toast("Notes saved.", "success"); }
    catch (e) { console.error(e); toast("Could not save the notes. Try again.", "error"); }
  });
  $("#rmDelete").addEventListener("click", async () => {
    const r = state.requests.find((x) => x.id === state.currentReq);
    if (!r || !(await confirmDialog("Delete this request?", `The request from ${r.fullName} will be permanently removed.`, "Delete request"))) return;
    try { await removeRequest(r.id); $("#reqModal").close(); toast("Request deleted.", "success"); }
    catch (e) { console.error(e); toast("Could not delete the request. Try again.", "error"); }
  });
}

function confirmDialog(title, message, yes = "Delete") {
  const dlg = $("#confirm");
  $("#cfTitle").textContent = title; $("#cfMsg").textContent = message; $("#cfYes").textContent = yes;
  return new Promise((resolve) => {
    const done = (v) => { dlg.close(); $("#cfYes").onclick = $("#cfNo").onclick = null; resolve(v); };
    $("#cfYes").onclick = () => done(true); $("#cfNo").onclick = () => done(false);
    dlg.addEventListener("cancel", () => resolve(false), { once: true });
    dlg.showModal();
  });
}

/* ------------------------------------------------------------------ */
/* gallery                                                             */
/* ------------------------------------------------------------------ */
function renderGallery() {
  $("#catList").replaceChildren(...[...new Set(state.gallery.map((g) => g.category).filter(Boolean))].map((c) => h("option", { value: c })));
  $("#galEmpty").hidden = state.gallery.length > 0;
  $("#galGrid").replaceChildren(...state.gallery.map((g) => h("li", {},
    h("a", { href: optimizedUrl(g.imageUrl, { w: 1800 }), target: "_blank", rel: "noopener", "aria-label": `Preview ${g.title}` },
      h("img", { src: optimizedUrl(g.imageUrl, { w: 480 }), alt: g.title, loading: "lazy" })),
    h("div", { class: "gal__meta" },
      h("strong", { text: g.title }),
      h("span", { class: "muted", text: g.category }),
      h("span", { class: `tag ${g.isPublished ? "tag--on" : "tag--off"}`, text: g.isPublished ? "Published" : "Hidden" })),
    h("div", { class: "gal__actions" },
      h("button", { type: "button", onclick: () => openImage(g.id) }, "Edit"),
      h("button", { type: "button", onclick: () => togglePublish(g) }, g.isPublished ? "Unpublish" : "Publish"),
      h("button", { type: "button", class: "del", onclick: () => deleteImage(g) }, "Delete")))));
  if (state.currentImg && $("#galModal").open && !state.gallery.some((g) => g.id === state.currentImg)) $("#galModal").close();
}

async function togglePublish(g) {
  try { await updateGalleryItem(g.id, { isPublished: !g.isPublished }); toast(g.isPublished ? "Image hidden from the website." : "Image published.", "success"); }
  catch (e) { console.error(e); toast("Could not update the image.", "error"); }
}

async function deleteImage(g) {
  if (!(await confirmDialog("Delete this image?", `“${g.title}” will be removed from the gallery and the website.`, "Delete image"))) return;
  try { await removeGalleryItem(g.id); }
  catch (e) { console.error(e); toast("Could not delete the image.", "error"); return; }
  try {
    await deleteCloudinaryAsset(g.cloudinaryPublicId, await auth.currentUser.getIdToken());
    toast("Image deleted everywhere.", "success");
  } catch (e) {
    console.warn(e);
    toast("Image removed from the site, but the file is still stored in Cloudinary. Deploy the delete function (see README) to clean it up automatically.", "info", 9000);
  }
}

function openImage(id) {
  const g = state.gallery.find((x) => x.id === id);
  if (!g) return;
  state.currentImg = id;
  $("#gmPreview").src = optimizedUrl(g.imageUrl, { w: 900 }); $("#gmPreview").alt = g.title;
  $("#gmTitleIn").value = g.title; $("#gmCat").value = g.category; $("#gmDesc").value = g.description || "";
  $("#gmTitleAr").value = g.titleAr || ""; $("#gmCatAr").value = g.categoryAr || ""; $("#gmDescAr").value = g.descriptionAr || "";
  $("#gmPub").checked = !!g.isPublished; $("#gmError").textContent = "";
  $("#galModal").showModal();
}

function wireGallery() {
  $("#gmSave").addEventListener("click", async () => {
    const title = $("#gmTitleIn").value.trim();
    if (!title) { $("#gmError").textContent = "A title is required."; return; }
    try {
      await updateGalleryItem(state.currentImg, {
        title, category: $("#gmCat").value.trim() || "Uncategorized",
        description: $("#gmDesc").value.trim(), isPublished: $("#gmPub").checked,
        titleAr: $("#gmTitleAr").value.trim(), categoryAr: $("#gmCatAr").value.trim(), descriptionAr: $("#gmDescAr").value.trim()
      });
      $("#galModal").close(); toast("Image updated.", "success");
    } catch (e) { console.error(e); $("#gmError").textContent = "Could not save. Try again."; }
  });

  $("#uploadForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const err = $("#uploadError"), btn = $("#uploadBtn"), bar = $("#gProgress");
    err.textContent = "";
    const file = $("#gFile").files[0], title = $("#gTitle").value.trim();
    const bad = validateFile(file, { maxMB: 10 }) || (!title ? "Add a title for the image." : "");
    if (bad) { err.textContent = bad; return; }
    btn.disabled = true; btn.textContent = "Uploading…"; bar.hidden = false; bar.firstElementChild.style.width = "0%";
    try {
      const up = await uploadToCloudinary(file, { onProgress: (p) => { bar.firstElementChild.style.width = `${Math.round(p * 100)}%`; } });
      await createGalleryItem({
        title, description: $("#gDesc").value.trim(), category: $("#gCategory").value.trim(),
        titleAr: $("#gTitleAr").value.trim(), descriptionAr: $("#gDescAr").value.trim(), categoryAr: $("#gCategoryAr").value.trim(),
        imageUrl: up.url, cloudinaryPublicId: up.publicId, width: up.width, height: up.height,
        isPublished: $("#gPublish").checked
      });
      $("#uploadForm").reset(); $("#gPublish").checked = true;
      toast("Image added to the gallery.", "success");
    } catch (ex) {
      console.error(ex);
      err.textContent = ex.message?.startsWith("Upload") || ex.message?.startsWith("Network") ? ex.message : "The image uploaded but could not be saved. Check the Firestore rules and try again.";
    } finally { btn.disabled = false; btn.textContent = "Upload to gallery"; bar.hidden = true; }
  });
}

/* ------------------------------------------------------------------ */
/* About / CV + contact (settings/site)                                */
/* ------------------------------------------------------------------ */
function repeater(mount, { title, addLabel, fields, max = 20 }) {
  const rows = h("div", { class: "rep__rows" });
  const uid = () => `f${Math.random().toString(36).slice(2)}`;

  // image field: file picker + thumbnail; stores the Cloudinary url (and public id) in hidden inputs
  const imageField = (f, vals) => {
    const urlIn = h("input", { type: "hidden", value: vals[f.key] || "", dataset: { key: f.key } });
    const idIn = h("input", { type: "hidden", value: vals[f.idKey] || "", dataset: { key: f.idKey } });
    const thumb = h("img", { class: "rep__thumb", alt: "", hidden: !vals[f.key], src: vals[f.key] ? optimizedUrl(vals[f.key], { w: 200 }) : "" });
    const status = h("span", { class: "muted" });
    const id = uid();
    const file = h("input", { id, type: "file", accept: "image/jpeg,image/png,image/webp,image/avif", onchange: async (e) => {
      const fl = e.target.files[0]; if (!fl) return;
      const bad = validateFile(fl, { maxMB: 10 }); if (bad) { toast(bad, "error"); e.target.value = ""; return; }
      status.textContent = "Uploading…";
      try {
        const up = await uploadToCloudinary(fl);
        urlIn.value = up.url; idIn.value = up.publicId;
        thumb.src = optimizedUrl(up.url, { w: 200 }); thumb.hidden = false; status.textContent = "Ready";
      } catch (ex) { status.textContent = ""; toast(ex.message, "error"); e.target.value = ""; }
    } });
    return h("div", { class: "rep__img" }, h("label", { for: id, text: f.label }), thumb, file, status, urlIn, idIn);
  };

  const add = (vals = {}) => {
    if (rows.children.length >= max) { toast(`You can add up to ${max} entries here.`, "info"); return; }
    const row = h("div", { class: "rep__row" },
      ...fields.map((f) => {
        if (f.type === "image") return imageField(f, vals);
        const id = uid();
        return h("div", {}, h("label", { for: id, text: f.label }),
          h("input", { id, type: f.type || "text", maxlength: f.max || 200, value: vals[f.key] || "", dir: f.ar ? "rtl" : null, dataset: { key: f.key } }));
      }),
      h("button", { type: "button", class: "icon-btn", "aria-label": "Remove entry", onclick: () => row.remove() }));
    rows.append(row);
  };
  mount.replaceChildren(h("div", { class: "rep" },
    h("div", { class: "rep__head" }, h("h3", { text: title }), h("button", { class: "btn btn--ghost", type: "button", onclick: () => add() }, addLabel)), rows));
  return {
    set(list) { rows.replaceChildren(); (list || []).forEach(add); },
    values() {
      return [...rows.children].map((row) => Object.fromEntries($$("input[data-key]", row).map((i) => [i.dataset.key, i.value.trim()])))
        .filter((o) => Object.values(o).some(Boolean));
    }
  };
}

function wireContent() {
  const AR = (key, label, max) => ({ key: `${key}Ar`, label: `${label} (Arabic)`, max, ar: true });
  reps = {
    education: repeater($("#rep-education"), { title: "Education & qualifications", addLabel: "Add entry", fields: [
      { key: "title", label: "Qualification" }, AR("title", "Qualification"), { key: "place", label: "Institution" }, AR("place", "Institution"), { key: "years", label: "Years", max: 30 }] }),
    experience: repeater($("#rep-experience"), { title: "Experience", addLabel: "Add entry", fields: [
      { key: "title", label: "Role" }, AR("title", "Role"), { key: "place", label: "Organisation" }, AR("place", "Organisation"), { key: "years", label: "Years", max: 30 },
      { key: "details", label: "Details", max: 400 }, AR("details", "Details", 400)] }),
    achievements: repeater($("#rep-achievements"), { title: "Achievements & certificates", addLabel: "Add entry", fields: [
      { key: "title", label: "Achievement or certificate" }, AR("title", "Achievement"), { key: "place", label: "Issuer" }, AR("place", "Issuer"), { key: "years", label: "Year", max: 30 }] }),
    personal: repeater($("#rep-personal"), { title: "Personal information", addLabel: "Add detail", fields: [
      { key: "label", label: "Label", max: 60 }, AR("label", "Label", 60), { key: "value", label: "Value", max: 200 }, AR("value", "Value", 200)] }),
    links: repeater($("#rep-links"), { title: "Other social links", addLabel: "Add link", fields: [
      { key: "label", label: "Label", max: 60 }, { key: "url", label: "Link (https://)", type: "url", max: 300 }] }),
    services: repeater($("#rep-services"), { title: "Services", addLabel: "Add service", fields: [
      { key: "title", label: "Service name", max: 80 }, AR("title", "Name", 80), { key: "desc", label: "Short description", max: 400 }, AR("desc", "Description", 400),
      { key: "price", label: "Price or \"from\" price (optional)", max: 60 }, AR("price", "Price", 60)] }),
    steps: repeater($("#rep-steps"), { title: "How it works (steps, in order)", addLabel: "Add step", max: 8, fields: [
      { key: "title", label: "Step", max: 80 }, AR("title", "Step", 80), { key: "desc", label: "Details (optional)", max: 300 }, AR("desc", "Details", 300)] }),
    quotes: repeater($("#rep-quotes"), { title: "Client reviews (real ones only)", addLabel: "Add review", fields: [
      { key: "quote", label: "What the client said", max: 500 }, AR("quote", "Review", 500), { key: "name", label: "Client name", max: 60 }, AR("name", "Name", 60),
      { key: "role", label: "Occasion / role (optional)", max: 80 }, AR("role", "Occasion", 80)] }),
    ba: repeater($("#rep-ba"), { title: "Before & after", addLabel: "Add pair", fields: [
      { key: "before", idKey: "beforeId", label: "Before photo", type: "image" }, { key: "after", idKey: "afterId", label: "After photo", type: "image" },
      { key: "caption", label: "Caption (optional)", max: 100 }, AR("caption", "Caption", 100)] })
  };

  // hero + CV uploads
  $("#heroFile").addEventListener("change", async (e) => {
    const f = e.target.files[0]; if (!f) return;
    const bad = validateFile(f, { maxMB: 10 }); if (bad) { toast(bad, "error"); e.target.value = ""; return; }
    $("#heroState").textContent = "Uploading…";
    try { const up = await uploadToCloudinary(f); state.hero = { imageUrl: up.url, imagePublicId: up.publicId }; $("#heroState").textContent = "Image ready — press Save changes."; }
    catch (ex) { $("#heroState").textContent = ""; toast(ex.message, "error"); }
  });
  $("#heroClear").addEventListener("click", () => { state.hero = { imageUrl: "", imagePublicId: "" }; $("#heroFile").value = ""; $("#heroState").textContent = "Image will be removed when you save."; });
  $("#cvFile").addEventListener("change", async (e) => {
    const f = e.target.files[0]; if (!f) return;
    const bad = validateFile(f, { allowPdf: true, maxMB: 10 }); if (bad) { toast(bad, "error"); e.target.value = ""; return; }
    $("#cvState").textContent = "Uploading…";
    try { const up = await uploadToCloudinary(f); $("#cvUrl").value = up.url; $("#cvState").textContent = "CV uploaded — press Save changes."; }
    catch (ex) { $("#cvState").textContent = ""; toast(ex.message, "error"); }
  });

  $("#contentForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const err = $("#contentError"), btn = $("#contentBtn"); err.textContent = "";
    const cv = $("#cvUrl").value.trim();
    if (cv && !safeUrl(cv, ["https:"])) { err.textContent = "The CV link must start with https://"; return; }
    const s = state.settings;
    s.hero = { intro: $("#heroIntro").value.trim(), introAr: $("#heroIntroAr").value.trim(), imageUrl: state.hero?.imageUrl ?? s.hero.imageUrl ?? "", imagePublicId: state.hero?.imagePublicId ?? s.hero.imagePublicId ?? "" };
    s.about = {
      bio: $("#bio").value.trim(), bioAr: $("#bioAr").value.trim(), education: reps.education.values(), experience: reps.experience.values(),
      skills: $("#skills").value.split(",").map((x) => x.trim()).filter(Boolean).slice(0, 40),
      skillsAr: $("#skillsAr").value.split(/[,،]/).map((x) => x.trim()).filter(Boolean).slice(0, 40),
      achievements: reps.achievements.values(), personal: reps.personal.values(), cvUrl: cv
    };
    await persist(btn, err);
  });

  $("#contactForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const err = $("#contactError"), btn = $("#contactBtn"); err.textContent = "";
    const links = reps.links.values();
    if (links.some((l) => !safeUrl(l.url, ["https:", "http:"]))) { err.textContent = "Every social link needs a full address starting with https://"; return; }
    const wa = $("#cWhats").value.replace(/\D/g, "");
    if ($("#cWhats").value.trim() && (wa.startsWith("0") || wa.length < 8)) { err.textContent = "WhatsApp needs the country code first and no leading 0 (for Egypt: 20 then the number without its first 0)."; return; }
    state.settings.contact = {
      email: $("#cEmail").value.trim(), phone: $("#cPhone").value.trim(), whatsapp: $("#cWhats").value.trim(),
      instagram: $("#cInsta").value.trim(), links
    };
    await persist(btn, err);
  });

  $("#extrasForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const err = $("#extrasError"), btn = $("#extrasBtn"); err.textContent = "";
    const pairs = reps.ba.values();
    if (pairs.some((p) => !p.before || !p.after)) { err.textContent = "Each before & after pair needs both photos. Wait for \"Ready\" after choosing a file."; return; }
    const quotes = reps.quotes.values();
    if (quotes.some((q) => !q.quote)) { err.textContent = "Each review needs the client's words (the Arabic field alone is not enough)."; return; }
    const services = reps.services.values();
    if (services.some((s) => !s.title)) { err.textContent = "Each service needs a name."; return; }
    const steps = reps.steps.values();
    if (steps.some((s) => !s.title)) { err.textContent = "Each step needs a title."; return; }
    state.settings.services = { items: services, steps, note: $("#svcNoteIn").value.trim(), noteAr: $("#svcNoteAr").value.trim() };
    state.settings.testimonials = { items: quotes };
    state.settings.beforeAfter = { items: pairs };
    await persist(btn, err);
  });
}

async function persist(btn, errEl) {
  const label = btn.textContent;
  btn.disabled = true; btn.textContent = "Saving…";
  try { await saveSettings(state.settings); state.hero = null; $("#heroState").textContent = ""; $("#cvState").textContent = ""; toast("Saved. The website now shows your changes.", "success"); }
  catch (e) { console.error(e); errEl.textContent = "Could not save. Check your connection and that the Firestore rules are published."; }
  finally { btn.disabled = false; btn.textContent = label; }
}

function fillForms() {
  const s = state.settings;
  $("#heroIntro").value = s.hero.intro || ""; $("#heroIntroAr").value = s.hero.introAr || "";
  $("#heroState").textContent = s.hero.imageUrl ? "An image is set." : "";
  $("#bio").value = s.about.bio || ""; $("#bioAr").value = s.about.bioAr || "";
  reps.education?.set(s.about.education); reps.experience?.set(s.about.experience);
  reps.achievements?.set(s.about.achievements); reps.personal?.set(s.about.personal);
  $("#skills").value = (s.about.skills || []).join(", "); $("#skillsAr").value = (s.about.skillsAr || []).join("، ");
  $("#cvUrl").value = s.about.cvUrl || "";
  $("#cEmail").value = s.contact.email || ""; $("#cPhone").value = s.contact.phone || "";
  $("#cWhats").value = s.contact.whatsapp || ""; $("#cInsta").value = s.contact.instagram || "";
  reps.links?.set(s.contact.links);
  reps.services?.set(s.services.items); reps.steps?.set(s.services.steps);
  $("#svcNoteIn").value = s.services.note || ""; $("#svcNoteAr").value = s.services.noteAr || "";
  reps.quotes?.set(s.testimonials.items); reps.ba?.set(s.beforeAfter.items);
}
