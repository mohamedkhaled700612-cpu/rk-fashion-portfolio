// Gallery data (Firestore: gallery) + public rendering helpers.
import {
  db, collection, doc, addDoc, updateDoc, deleteDoc, getDocs, query, where, orderBy, onSnapshot, serverTimestamp
} from "./firebase-config.js";
import { h } from "./ui.js";
import { optimizedUrl } from "./cloudinary.js";
import { tr, t } from "./i18n.js";

const ms = (t) => t?.toMillis?.() || 0;

// Public: only published items (the query constraint is what the security rule checks).
export async function fetchPublishedGallery() {
  const snap = await getDocs(query(collection(db, "gallery"), where("isPublished", "==", true)));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() })).sort((a, b) => ms(b.createdAt) - ms(a.createdAt));
}

// Admin
export function subscribeGallery(onData, onError) {
  return onSnapshot(
    query(collection(db, "gallery"), orderBy("createdAt", "desc")),
    (snap) => onData(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
    onError
  );
}
export function createGalleryItem(item) {
  const data = {
    title: item.title, description: item.description || "", category: item.category || "Uncategorized",
    titleAr: item.titleAr || "", descriptionAr: item.descriptionAr || "", categoryAr: item.categoryAr || "",
    imageUrl: item.imageUrl, cloudinaryPublicId: item.cloudinaryPublicId, isPublished: !!item.isPublished,
    createdAt: serverTimestamp(), updatedAt: serverTimestamp()
  };
  if (item.width) data.width = item.width;
  if (item.height) data.height = item.height;
  return addDoc(collection(db, "gallery"), data);
}
export const updateGalleryItem = (id, patch) =>
  updateDoc(doc(db, "gallery", id), { ...patch, updatedAt: serverTimestamp() });
export const removeGalleryItem = (id) => deleteDoc(doc(db, "gallery", id));

// Public card: a real <button> so it works with keyboard and screen readers.
export function buildGalleryCard(item, index, onOpen) {
  const img = h("img", {
    src: optimizedUrl(item.imageUrl, { w: 800 }),
    srcset: [480, 800, 1200].map((w) => `${optimizedUrl(item.imageUrl, { w })} ${w}w`).join(", "),
    sizes: "(max-width: 640px) 92vw, (max-width: 1024px) 46vw, 30vw",
    alt: tr(item, "title"), loading: "lazy", decoding: "async",
    width: item.width || null, height: item.height || null
  });
  const li = h("li", { class: "card", dataset: { category: item.category || "" } },
    h("button", { type: "button", class: "card__btn", "aria-label": t("gallery.view", { title: tr(item, "title") }), onclick: () => onOpen(index) },
      h("span", { class: "card__media" }, img),
      h("span", { class: "card__cap" },
        h("span", { class: "card__title", text: tr(item, "title") }),
        h("span", { class: "card__cat", text: tr(item, "category") }))));
  return li;
}

// Re-apply the current language to an existing card without rebuilding it (keeps scroll animations intact).
export function refreshCardText(li, item) {
  li.querySelector("img").alt = tr(item, "title");
  li.querySelector(".card__btn").setAttribute("aria-label", t("gallery.view", { title: tr(item, "title") }));
  li.querySelector(".card__title").textContent = tr(item, "title");
  li.querySelector(".card__cat").textContent = tr(item, "category");
}
