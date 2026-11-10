// Shared Firebase setup. The web config below is the project's public client config
// (it identifies the project; security comes from Auth + Firestore rules, not from hiding it).
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";
import { getAnalytics, isSupported } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-analytics.js";

export const firebaseConfig = {
  apiKey: "AIzaSyCdpht_05RX-zMbM65zlIO9g4hy2_gZ08U",
  authDomain: "rk-portfolio-eb485.firebaseapp.com",
  projectId: "rk-portfolio-eb485",
  storageBucket: "rk-portfolio-eb485.firebasestorage.app",
  messagingSenderId: "750562255965",
  appId: "1:750562255965:web:0a1f9f53a562998b30d9b4",
  measurementId: "G-FW3ZQ83NZ5"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

isSupported().then((ok) => { if (ok) getAnalytics(app); }).catch(() => {});

export {
  onAuthStateChanged, signInWithEmailAndPassword, signOut, sendPasswordResetEmail
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";
export {
  collection, doc, getDoc, getDocs, addDoc, setDoc, updateDoc, deleteDoc,
  query, where, orderBy, onSnapshot, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";
