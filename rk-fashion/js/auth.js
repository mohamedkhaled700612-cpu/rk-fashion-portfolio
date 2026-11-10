// Firebase Authentication + UID-based admin check (admins/{uid}). Real enforcement is in firestore.rules.
import {
  auth, db, doc, getDoc, onAuthStateChanged, signInWithEmailAndPassword, signOut, sendPasswordResetEmail
} from "./firebase-config.js";

export async function isAdmin(uid) {
  try { return (await getDoc(doc(db, "admins", uid))).exists(); }
  catch { return false; }
}

export const login = (email, password) => signInWithEmailAndPassword(auth, email, password);
export const logout = () => signOut(auth);
export const resetPassword = (email) => sendPasswordResetEmail(auth, email);

// cb({state: "signed-out" | "denied" | "admin", user})
export function watchAdmin(cb) {
  return onAuthStateChanged(auth, async (user) => {
    if (!user) return cb({ state: "signed-out", user: null });
    cb({ state: (await isAdmin(user.uid)) ? "admin" : "denied", user });
  });
}

export function friendlyAuthError(e) {
  switch (e?.code) {
    case "auth/invalid-credential":
    case "auth/wrong-password":
    case "auth/user-not-found": return "That email or password is not correct.";
    case "auth/invalid-email": return "Enter a valid email address.";
    case "auth/too-many-requests": return "Too many attempts. Wait a few minutes and try again.";
    case "auth/network-request-failed": return "No connection. Check your internet and try again.";
    case "auth/operation-not-allowed": return "Email/password sign-in is not enabled in the Firebase console yet.";
    default: return "Sign-in failed. Try again.";
  }
}
