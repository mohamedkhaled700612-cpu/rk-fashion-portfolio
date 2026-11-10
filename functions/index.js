// Trusted backend for deleting Cloudinary images. The API secret lives only here (as a Firebase secret).
// Needs the Firebase Blaze plan. Deploy with:  firebase deploy --only functions
//   firebase functions:secrets:set CLOUDINARY_API_KEY
//   firebase functions:secrets:set CLOUDINARY_API_SECRET
const { onRequest } = require("firebase-functions/v2/https");
const { defineSecret } = require("firebase-functions/params");
const admin = require("firebase-admin");
const crypto = require("crypto");

admin.initializeApp();

const CLOUD_NAME = "fkmbapdm";
const API_KEY = defineSecret("CLOUDINARY_API_KEY");
const API_SECRET = defineSecret("CLOUDINARY_API_SECRET");

exports.deleteCloudinaryImage = onRequest(
  { cors: true, secrets: [API_KEY, API_SECRET], region: "us-central1", maxInstances: 3 },
  async (req, res) => {
    if (req.method !== "POST") return res.status(405).json({ error: "POST only" });

    // 1) Verify the caller is signed in…
    const token = (req.get("Authorization") || "").replace(/^Bearer\s+/i, "");
    let uid;
    try { uid = (await admin.auth().verifyIdToken(token)).uid; }
    catch { return res.status(401).json({ error: "Not signed in" }); }

    // 2) …and is an authorised administrator (admins/{uid} exists).
    const adminDoc = await admin.firestore().doc(`admins/${uid}`).get();
    if (!adminDoc.exists) return res.status(403).json({ error: "Not an administrator" });

    // 3) Validate input.
    const publicId = req.body && req.body.publicId;
    if (typeof publicId !== "string" || !/^[\w\-./]{1,300}$/.test(publicId) || publicId.includes("..")) {
      return res.status(400).json({ error: "Invalid publicId" });
    }

    // 4) Signed destroy call.
    const timestamp = Math.floor(Date.now() / 1000);
    const toSign = `invalidate=true&public_id=${publicId}&timestamp=${timestamp}${API_SECRET.value()}`;
    const signature = crypto.createHash("sha1").update(toSign).digest("hex");
    const body = new URLSearchParams({
      public_id: publicId, timestamp: String(timestamp), invalidate: "true",
      api_key: API_KEY.value(), signature
    });
    const r = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/destroy`, { method: "POST", body });
    const out = await r.json().catch(() => ({}));
    if (!r.ok || !["ok", "not found"].includes(out.result)) {
      return res.status(502).json({ error: "Cloudinary refused the request", detail: out.error?.message || out.result });
    }
    return res.json({ result: out.result });
  }
);
