// Cloudinary: direct unsigned browser uploads + URL optimisation.
// No API secret lives here. Deleting assets needs a trusted backend (see functions/index.js).
export const CLOUDINARY_CLOUD_NAME = "fkmbapdm";
export const CLOUDINARY_UPLOAD_PRESET = "rk-fashion";
export const CLOUDINARY_UPLOAD_URL = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`;
// Cloud Function that deletes assets (verifies the admin first). Deploy it, or leave as is:
// if it is unreachable the admin still removes the record and sees a clear warning.
export const CLOUDINARY_DELETE_ENDPOINT = "https://us-central1-rk-portfolio-eb485.cloudfunctions.net/deleteCloudinaryImage";

export const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/avif", "image/gif"];

// "none" | "type" | "size" | null (ok) — lets each page show the message in its own language.
export function fileErrorCode(file, { allowPdf = false, maxMB = 10 } = {}) {
  if (!file) return "none";
  const ok = IMAGE_TYPES.includes(file.type) || (allowPdf && file.type === "application/pdf");
  if (!ok) return "type";
  if (file.size > maxMB * 1024 * 1024) return "size";
  return null;
}

export function validateFile(file, opts = {}) {
  const code = fileErrorCode(file, opts), maxMB = opts.maxMB ?? 10;
  if (!code) return null;
  if (code === "none") return "Choose a file first.";
  if (code === "type") return opts.allowPdf ? "Use a JPG, PNG, WebP, AVIF, GIF or PDF file." : "Use a JPG, PNG, WebP, AVIF or GIF image.";
  return `File is too large. Maximum size is ${maxMB} MB.`;
}

export function uploadToCloudinary(file, { onProgress } = {}) {
  return new Promise((resolve, reject) => {
    const fd = new FormData();
    fd.append("file", file);
    fd.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);
    const xhr = new XMLHttpRequest();
    xhr.open("POST", CLOUDINARY_UPLOAD_URL);
    xhr.upload.onprogress = (e) => { if (e.lengthComputable) onProgress?.(e.loaded / e.total); };
    xhr.onerror = () => reject(new Error("Network error while uploading. Check your connection and try again."));
    xhr.onload = () => {
      let body = {};
      try { body = JSON.parse(xhr.responseText); } catch { /* ignore */ }
      if (xhr.status >= 200 && xhr.status < 300 && body.secure_url) {
        resolve({ url: body.secure_url, publicId: body.public_id, width: body.width || null, height: body.height || null });
      } else {
        reject(new Error(body?.error?.message ? `Upload failed: ${body.error.message}` : "Upload failed. Check that the 'rk-fashion' preset is set to unsigned."));
      }
    };
    xhr.send(fd);
  });
}

// Insert responsive/optimised transformations (auto format + quality + width) into a Cloudinary URL.
export function optimizedUrl(url, { w, h, crop = "limit" } = {}) {
  if (!url || !url.includes("/image/upload/") || /\.pdf($|\?)/i.test(url)) return url;
  const t = ["f_auto", "q_auto", w && `w_${w}`, h && `h_${h}`, (w || h) && `c_${crop}`].filter(Boolean).join(",");
  return url.replace("/image/upload/", `/image/upload/${t}/`);
}

export async function deleteCloudinaryAsset(publicId, idToken) {
  const res = await fetch(CLOUDINARY_DELETE_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${idToken}` },
    body: JSON.stringify({ publicId })
  });
  if (!res.ok) throw new Error(`Delete endpoint answered ${res.status}`);
}
