// Visitor request submission + admin request management (Firestore: requests)
import {
  db, collection, doc, setDoc, updateDoc, deleteDoc, query, orderBy, onSnapshot, serverTimestamp
} from "./firebase-config.js";

export const REQUEST_TYPES = ["Custom design", "Styling consultation", "Collaboration", "Alterations", "Other"];
export const STATUSES = ["Pending", "Approved", "Rejected"];

// Same content on the same day => same document id, so a repeat submit cannot create a duplicate.
async function fingerprint(r) {
  const day = new Date().toISOString().slice(0, 10);
  const text = [r.fullName.trim().toLowerCase(), r.contactInfo.trim().toLowerCase(), r.requestType, r.description.trim(), day].join("|");
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function submitRequest(data) {
  const id = await fingerprint(data);
  try {
    await setDoc(doc(db, "requests", id), {
      fullName: data.fullName.trim(),
      contactInfo: data.contactInfo.trim(),
      requestType: data.requestType,
      description: data.description.trim(),
      attachmentUrl: data.attachmentUrl || "",
      status: "Pending",
      adminNotes: "",
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    return { id, duplicate: false };
  } catch (e) {
    // Public users can create but never update, so a rejected write on an existing id = duplicate.
    if (e?.code === "permission-denied") return { id, duplicate: true };
    throw e;
  }
}

// ---- admin side (rules only allow these for authorised admins) ----
export function subscribeRequests(onData, onError) {
  return onSnapshot(
    query(collection(db, "requests"), orderBy("createdAt", "desc")),
    (snap) => onData(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
    onError
  );
}
export const setRequestStatus = (id, status) =>
  updateDoc(doc(db, "requests", id), { status, updatedAt: serverTimestamp() });
export const saveRequestNotes = (id, adminNotes) =>
  updateDoc(doc(db, "requests", id), { adminNotes, updatedAt: serverTimestamp() });
export const removeRequest = (id) => deleteDoc(doc(db, "requests", id));
