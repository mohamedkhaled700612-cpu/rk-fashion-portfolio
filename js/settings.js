// Editable site content (About/CV, hero, contact + social) stored in Firestore: settings/site
import { db, doc, getDoc, setDoc, serverTimestamp } from "./firebase-config.js";

export const DEFAULT_SETTINGS = {
  hero: { intro: "", introAr: "", imageUrl: "", imagePublicId: "" },
  about: { bio: "", bioAr: "", education: [], experience: [], skills: [], skillsAr: [], achievements: [], personal: [], cvUrl: "" },
  contact: { email: "", phone: "", whatsapp: "", instagram: "", links: [] },
  services: { items: [], steps: [], note: "", noteAr: "" },
  testimonials: { items: [] },
  beforeAfter: { items: [] }
};

function merge(base, extra) {
  const out = structuredClone(base);
  for (const k of Object.keys(out)) {
    if (extra?.[k] && typeof extra[k] === "object") Object.assign(out[k], extra[k]);
  }
  return out;
}

export async function loadSettings() {
  try {
    const snap = await getDoc(doc(db, "settings", "site"));
    return snap.exists() ? merge(DEFAULT_SETTINGS, snap.data()) : structuredClone(DEFAULT_SETTINGS);
  } catch (e) {
    console.warn("Could not load site settings", e);
    return structuredClone(DEFAULT_SETTINGS);
  }
}

export async function saveSettings(data) {
  await setDoc(doc(db, "settings", "site"), {
    hero: data.hero, about: data.about, contact: data.contact,
    services: data.services, testimonials: data.testimonials, beforeAfter: data.beforeAfter,
    updatedAt: serverTimestamp()
  });
}
