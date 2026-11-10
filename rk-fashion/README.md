# RK FASHION — Raghad Khaled

Luxury portfolio + request management site. Plain HTML/CSS/JavaScript (ES modules), Firebase Auth + Firestore, Cloudinary images.
Firebase project: `rk-portfolio-eb485` · Cloudinary cloud: `fkmbapdm` · preset: `rk-fashion`.

```
index.html / admin.html          public site / private dashboard
css/  style.css responsive.css admin.css
js/   firebase-config.js auth.js gallery.js requests.js settings.js cloudinary.js
      main.js admin.js ui.js hero-shader.js
functions/                       Cloudinary delete (server-side, holds the API secret)
firestore.rules  firestore.indexes.json  firebase.json  .firebaserc
design-system/                   design tokens generated with UI UX Pro Max
assets/logo  assets/fonts
```

## One-time setup (about 10 minutes)

### 1. Firebase console (project `rk-portfolio-eb485`)
1. **Authentication → Sign-in method** → enable **Email/Password**.
2. **Authentication → Users → Add user**: `raghadkhaled700612@gmail.com` with a strong password you choose. Copy the user's **UID**.
3. **Firestore Database** → create the database if it does not exist (production mode).
4. **Make her an administrator** (this is the only way — rules forbid clients from writing `admins`):
   Firestore → Start collection `admins` → Document ID = the **UID** from step 2 → add any field, e.g. `role: "admin"`.
   The email alone grants nothing; only this UID document does.
5. Publish the rules and index: `firebase deploy --only firestore` (or paste `firestore.rules` into Firestore → Rules → Publish).
6. **Authentication → Settings → Authorized domains**: add your final website domain.

### 2. Cloudinary console
**Settings → Upload → Upload presets → `rk-fashion`**: set **Signing mode = Unsigned**. Recommended: restrict formats to jpg/png/webp/avif/gif/pdf, set a max file size (10 MB), and a folder such as `rk-fashion`.
(Visitors' request attachments and admin uploads both use this preset. Firestore rules only accept URLs from `res.cloudinary.com/fkmbapdm/`.)

### 3. Deploy the site
```
npm i -g firebase-tools
firebase login
firebase deploy --only hosting,firestore
```
Any static host also works (Netlify, Vercel, GitHub Pages) — it is plain static files. Test locally with `python3 -m http.server` (ES modules do not work from `file://`).

### 4. Cloudinary image deletion (optional but recommended)
Deleting from Cloudinary needs the API secret, so it runs server-side. Needs the Firebase **Blaze** plan.
```
cd functions && npm install && cd ..
firebase functions:secrets:set CLOUDINARY_API_KEY
firebase functions:secrets:set CLOUDINARY_API_SECRET
firebase deploy --only functions
```
The function checks the caller's Firebase login **and** the `admins/{uid}` record before deleting. If you skip this step, deleting an image still removes it from the website; the file just stays in Cloudinary and the dashboard tells you so.
If your Firebase region/URL differs, update `CLOUDINARY_DELETE_ENDPOINT` in `js/cloudinary.js`.

### 5. Fill in the content
Sign in at `/admin.html` → **About & CV** and **Contact & social** (all text, CV, hero image, email, phone, WhatsApp, Instagram, other links) → **Gallery** (upload images). Nothing is hardcoded; nothing personal was invented — empty sections show a neutral placeholder.

## Font: Milky Walky
Put `MilkyWalky.woff2` (and/or `.ttf`) in `assets/fonts/` (see the note there). Until then headings use Cormorant Garamond automatically. Confirm the font licence allows web use.

## Security model
- Firebase web config is public by design; protection comes from Auth + the rules in `firestore.rules`.
- Visitors can only **create** a validated request (status forced to `Pending`, notes empty). They cannot read, edit or delete any request.
- Admins (UID listed in `admins`) can read/update status + internal notes only, delete requests, manage gallery and site content.
- Public gallery reads are limited to `isPublished == true`.
- `admins` is read-only for the signed-in user's own record, and can't be written from any client.
- No API secret is in the front-end. Duplicate submissions are blocked by a content-hash document ID, a button lock, and a short cooldown.
- All user content is inserted as text (never HTML); links are checked for safe protocols.

## Verification status (be aware)
Verified in a headless browser against a **stubbed** Firebase (no network access in the build environment): page rendering desktop + mobile, filters, lightbox, form validation and write payload, honeypot, admin access gate (non-admin blocked), stats, request search/status/notes writes, gallery listing, About/Contact editors, no console errors.
**Not verifiable at build time — please run once after setup:** real sign-in, the Firestore rules (try them in the Firebase Rules Playground / emulator), real Cloudinary uploads with your unsigned preset, and the delete function. Checklist: submit a request as a visitor → see it in the dashboard → approve → add a note → upload an image (published) → see it on the site → unpublish → it disappears from the site → delete.

## Lookbook (3D book) and languages
- Published designs appear in a hardcover flip-book: cover → one spread per design (photo left, details + "Request this design" right) → closing page. Tap, drag, arrow keys or the buttons turn pages. Phones show one page at a time. The Book/Grid switch above the gallery shows the plain grid instead; category chips re-bind the book to that category.
- Arabic/English with RTL (`?lang=ar`); the Services, Reviews and Before/After sections stay hidden until filled in from the dashboard, and the WhatsApp button appears once a number is saved.
- Also verified headlessly: the book opening, mid-turn rendering, page counter, EN/AR/mobile layouts. **Not verified here:** the GSAP/Lenis scroll animations (CDNs are blocked in the build sandbox), so check those once in a real browser.

## Extra motion & interactivity
- **Design studio:** a "Studio" button on every book page opens a viewer where visitors try the design in 7 colours; the fabric tilts and catches light with the pointer. The colour is an approximate tint preview.
- **Measuring tape:** a fixed tape on the page edge fills as you scroll and counts 0–180 cm (hidden under 1100px).
- **Stitched dividers:** a dashed gold seam with a needle sews itself across each section.
- **Cinematic intro:** the cream curtain closes like a camera iris on the logo (needs GSAP); the hero zooms gently on scroll.
- **From sketch to runway:** four craft steps (sketch, pattern, sewing, fitting) shown by default. Replace them under Dashboard → Services & reviews → "How it works", each step can have a photo.

## SEO, sharing, catalogue PDF, music
- **SEO:** title/description (EN/AR, updates with the language), canonical + hreflang, Open Graph/Twitter card with `assets/images/og.jpg`, JSON-LD (Person + brand), `robots.txt`, `sitemap.xml`. They assume the Firebase address `https://rk-portfolio-eb485.web.app/` — if you use your own domain, replace that address in `index.html`, `robots.txt` and `sitemap.xml`. After deploying, submit the sitemap in Google Search Console.
- **Share:** a share button on each book page uses the phone's native share sheet (copies the link on desktop). The link `?d=<design id>` opens the book on that design. (The link preview image is always the site card, not the individual design.)
- **PDF catalogue:** "Download PDF" opens `catalogue.html` (cover, one A4 page per published design, contact page) and the visitor taps "Save as PDF". Uses the language of the site.
- **Music:** off by default (browsers block autoplay); a button bottom-left starts it. Without any file it plays a synthesised soft lounge/runway loop. To use a real track, drop an MP3 at `assets/audio/theme.mp3` (use music you have the licence for) and it is used automatically.

## The atelier (end of the page)
A painter's corner before the footer: brush strokes that paint themselves across the heading, floating pencil/brush/scissors/needle, paint splatters, a fan of Pantone-style colour chips, and a paper canvas the visitor can paint on (bristle brush that thins when you move fast, size slider, clear, save as PNG). It paints a demo ribbon the first time it comes into view.
