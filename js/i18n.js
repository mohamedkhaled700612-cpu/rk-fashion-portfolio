// Arabic / English UI layer. Content written by the admin can have an optional Arabic twin
// (fields ending in "Ar"); tr(obj, "title") returns the Arabic one in Arabic mode and falls back to English.
const STR = {
  en: {
    "doc.title": "RK FASHION — Raghad Khaled",
    "doc.desc": "RK FASHION — the fashion portfolio of Raghad Khaled. Browse the portfolio and send a request.",
    "skip": "Skip to content",
    "nav.about": "About", "nav.portfolio": "Portfolio", "nav.services": "Services", "nav.request": "Request", "nav.contact": "Contact",
    "nav.main": "Main", "nav.mobile": "Mobile", "brand.home": "RK FASHION — back to top",
    "menu.open": "Open menu", "menu.close": "Close menu", "lang.other": "العربية", "lang.label": "Switch to Arabic",
    "hero.name": "Raghad Khaled", "hero.intro": "The fashion portfolio of Raghad Khaled.",
    "hero.cta1": "View Portfolio", "hero.cta2": "Send a Request", "hero.cta3": "Contact Me", "hero.scroll": "Scroll to About",
    "about.title": "About", "about.empty": "The biography, CV and qualifications will appear here.",
    "about.education": "Education & qualifications", "about.experience": "Experience", "about.skills": "Skills & specialties",
    "about.achievements": "Achievements & certificates", "about.personal": "Personal information", "about.cv": "Download CV",
    "portrait.alt": "Portrait of Raghad Khaled",
    "portfolio.title": "Portfolio", "portfolio.filter": "Filter by category", "filter.all": "All",
    "gallery.loading": "Loading the portfolio…", "gallery.error": "The portfolio could not be loaded. Refresh the page to try again.",
    "gallery.empty": "No pieces are published yet. Please check back soon.", "gallery.view": "View {title}",
    "services.title": "Services", "process.title": "How it works",
    "results.title": "Before & after", "compare.label": "Drag to compare before and after", "compare.before": "Before", "compare.after": "After",
    "book.cover": "Lookbook", "book.zoom": "View full", "book.hint": "Tap or drag to open", "book.introTitle": "The collection",
    "book.introText": "Turn the page to explore the collection. Tap a design to see it in full, and request the one you love.",
    "book.endTitle": "Like what you see?", "book.endText": "Tell Raghad about the design you have in mind.", "book.endCta": "Request a design",
    "book.page": "Page {n} of {total}", "book.pages": "Pages {a}–{b} of {total}", "book.prev": "Previous page", "book.next": "Next page", "book.aria": "Portfolio lookbook",
    "view.label": "Portfolio view", "view.book": "Book", "view.grid": "Grid",
    "reviews.title": "Client reviews",
    "request.title": "Send a Request",
    "request.lead": "Tell Raghad what you need. Every request is reviewed personally and you will be contacted using the details you leave.",
    "form.name": "Full name", "form.contact": "Email or phone", "form.type": "Type of request", "form.attachment": "Attachment",
    "form.attachmentHint": "(optional — image or PDF, up to 5 MB)", "form.details": "Request details", "form.typePlaceholder": "Select a request type",
    "form.send": "Send request", "form.sending": "Sending…", "form.honeypot": "Website",
    "type.Custom design": "Custom design", "type.Styling consultation": "Styling consultation", "type.Collaboration": "Collaboration",
    "type.Alterations": "Alterations", "type.Other": "Other",
    "ref.prefix": "About this design:", "ref.remove": "Remove design reference",
    "err.name": "Enter your full name.", "err.nameLong": "Keep your name under 80 characters.",
    "err.contact": "Enter a valid email address or phone number.", "err.type": "Choose a request type.",
    "err.descShort": "Describe your request in at least 10 characters.", "err.descLong": "Keep the details under 2000 characters.",
    "err.fileType": "Use a JPG, PNG, WebP, AVIF, GIF or PDF file.", "err.fileSize": "File is too large. Maximum size is {mb} MB.",
    "toast.recent": "Your last request was just sent. Please wait a few seconds.",
    "toast.duplicate": "This exact request was already received today. Change the details if it is a new request.",
    "toast.offline": "No connection. Check your internet and send the request again.",
    "toast.upload": "The attachment could not be uploaded. Try again or send the request without it.",
    "toast.generic": "Your request could not be sent. Please try again in a moment.",
    "success.title": "Request received",
    "success.text": "Thank you. Your request is now pending review and you will be contacted using the details you provided.",
    "success.ref": "Reference:", "success.again": "Send another request",
    "contact.title": "Contact", "contact.empty": "Contact details will appear here.",
    "contact.email": "Email", "contact.phone": "Phone", "contact.whatsapp": "WhatsApp", "contact.instagram": "Instagram", "contact.link": "Link",
    "wa.aria": "Chat on WhatsApp", "wa.message": "Hello, I visited the RK FASHION website and I have a question.",
    "footer": "© {year} RK FASHION · Raghad Khaled",
    "lb.label": "Image viewer", "lb.close": "Close", "lb.prev": "Previous image", "lb.next": "Next image", "lb.request": "Request this design"
  },
  ar: {
    "doc.title": "RK FASHION — رغد خالد",
    "doc.desc": "RK FASHION — معرض أعمال المصممة رغد خالد. تصفّح الأعمال وأرسل طلبك.",
    "skip": "تخطَّ إلى المحتوى",
    "nav.about": "نبذة", "nav.portfolio": "الأعمال", "nav.services": "الخدمات", "nav.request": "اطلب", "nav.contact": "تواصل",
    "nav.main": "القائمة الرئيسية", "nav.mobile": "قائمة الموبايل", "brand.home": "RK FASHION — العودة إلى الأعلى",
    "menu.open": "فتح القائمة", "menu.close": "إغلاق القائمة", "lang.other": "English", "lang.label": "التبديل إلى الإنجليزية",
    "hero.name": "رغد خالد", "hero.intro": "معرض أعمال المصممة رغد خالد.",
    "hero.cta1": "تصفّح الأعمال", "hero.cta2": "أرسل طلبًا", "hero.cta3": "تواصل معي", "hero.scroll": "انتقل إلى نبذة عني",
    "about.title": "نبذة عني", "about.empty": "ستظهر هنا السيرة الذاتية والمؤهلات.",
    "about.education": "التعليم والمؤهلات", "about.experience": "الخبرات", "about.skills": "المهارات والتخصصات",
    "about.achievements": "الإنجازات والشهادات", "about.personal": "معلومات شخصية", "about.cv": "تحميل السيرة الذاتية",
    "portrait.alt": "صورة شخصية لرغد خالد",
    "portfolio.title": "الأعمال", "portfolio.filter": "تصفية حسب الفئة", "filter.all": "الكل",
    "gallery.loading": "جارٍ تحميل الأعمال…", "gallery.error": "تعذّر تحميل الأعمال. حدّث الصفحة وحاول مرة أخرى.",
    "gallery.empty": "لم تُنشر أي أعمال بعد. عودوا قريبًا.", "gallery.view": "عرض {title}",
    "services.title": "الخدمات", "process.title": "طريقة العمل",
    "results.title": "قبل وبعد", "compare.label": "اسحب للمقارنة بين قبل وبعد", "compare.before": "قبل", "compare.after": "بعد",
    "book.cover": "كتالوج الأعمال", "book.zoom": "عرض كامل", "book.hint": "اسحب أو اضغط لفتح الكتاب", "book.introTitle": "المجموعة",
    "book.introText": "اقلب الصفحة لتتصفح المجموعة، واضغط على أي تصميم لعرضه كاملًا، ثم اطلب ما أعجبك.",
    "book.endTitle": "هل أعجبك ما رأيت؟", "book.endText": "احكِ لرغد عن التصميم الذي تتخيله.", "book.endCta": "اطلب تصميمًا",
    "book.page": "الصفحة {n} من {total}", "book.pages": "الصفحتان {a}–{b} من {total}", "book.prev": "الصفحة السابقة", "book.next": "الصفحة التالية", "book.aria": "كتالوج الأعمال",
    "view.label": "طريقة عرض الأعمال", "view.book": "كتاب", "view.grid": "شبكة",
    "reviews.title": "آراء العملاء",
    "request.title": "أرسل طلبًا",
    "request.lead": "اكتب ما تحتاجه وسيُراجَع طلبك شخصيًا، ثم يتم التواصل معك عبر البيانات التي تتركها.",
    "form.name": "الاسم الكامل", "form.contact": "البريد الإلكتروني أو رقم الهاتف", "form.type": "نوع الطلب", "form.attachment": "مرفق",
    "form.attachmentHint": "(اختياري — صورة أو PDF حتى 5 ميجابايت)", "form.details": "تفاصيل الطلب", "form.typePlaceholder": "اختر نوع الطلب",
    "form.send": "إرسال الطلب", "form.sending": "جارٍ الإرسال…", "form.honeypot": "الموقع",
    "type.Custom design": "تصميم خاص", "type.Styling consultation": "استشارة ستايل", "type.Collaboration": "تعاون",
    "type.Alterations": "تعديلات", "type.Other": "أخرى",
    "ref.prefix": "بخصوص التصميم:", "ref.remove": "إزالة الإشارة إلى التصميم",
    "err.name": "أدخل اسمك الكامل.", "err.nameLong": "اجعل الاسم أقل من 80 حرفًا.",
    "err.contact": "أدخل بريدًا إلكترونيًا أو رقم هاتف صحيحًا.", "err.type": "اختر نوع الطلب.",
    "err.descShort": "اشرح طلبك في 10 أحرف على الأقل.", "err.descLong": "اجعل التفاصيل أقل من 2000 حرف.",
    "err.fileType": "استخدم ملف JPG أو PNG أو WebP أو AVIF أو GIF أو PDF.", "err.fileSize": "حجم الملف كبير. الحد الأقصى {mb} ميجابايت.",
    "toast.recent": "تم إرسال طلبك للتو. انتظر بضع ثوانٍ.",
    "toast.duplicate": "وصلنا هذا الطلب نفسه اليوم. غيّر التفاصيل إذا كان طلبًا جديدًا.",
    "toast.offline": "لا يوجد اتصال. تحقق من الإنترنت وأعد إرسال الطلب.",
    "toast.upload": "تعذّر رفع المرفق. حاول مرة أخرى أو أرسل الطلب بدونه.",
    "toast.generic": "تعذّر إرسال طلبك. حاول مرة أخرى بعد قليل.",
    "success.title": "تم استلام طلبك",
    "success.text": "شكرًا لك. طلبك الآن قيد المراجعة وسيتم التواصل معك عبر البيانات التي أدخلتها.",
    "success.ref": "الرقم المرجعي:", "success.again": "إرسال طلب آخر",
    "contact.title": "تواصل", "contact.empty": "ستظهر بيانات التواصل هنا.",
    "contact.email": "البريد الإلكتروني", "contact.phone": "الهاتف", "contact.whatsapp": "واتساب", "contact.instagram": "إنستجرام", "contact.link": "رابط",
    "wa.aria": "تواصل عبر واتساب", "wa.message": "مرحبًا، زرت موقع RK FASHION ولدي استفسار.",
    "footer": "© {year} RK FASHION · رغد خالد",
    "lb.label": "عارض الصور", "lb.close": "إغلاق", "lb.prev": "الصورة السابقة", "lb.next": "الصورة التالية", "lb.request": "اطلب هذا التصميم"
  }
};

let current = "en";
export const getLang = () => current;
export const isRtl = () => current === "ar";

export function detectLang() {
  const q = new URLSearchParams(location.search).get("lang");
  if (q === "ar" || q === "en") return q;
  try { const s = localStorage.getItem("rk:lang"); if (s === "ar" || s === "en") return s; } catch { /* storage unavailable */ }
  return (navigator.language || "").toLowerCase().startsWith("ar") ? "ar" : "en";
}

export function t(key, vars = {}) {
  let s = STR[current][key] ?? STR.en[key] ?? key;
  for (const [k, v] of Object.entries(vars)) s = s.replaceAll(`{${k}}`, v);
  return s;
}

// Arabic twin of a content field, falling back to the English value.
export function tr(obj, key) {
  if (current === "ar") {
    const v = obj?.[`${key}Ar`];
    if (typeof v === "string" && v.trim()) return v;
  }
  return obj?.[key] ?? "";
}

export function setLang(lang, { persist = true } = {}) {
  current = lang === "ar" ? "ar" : "en";
  const root = document.documentElement;
  root.lang = current;
  root.dir = current === "ar" ? "rtl" : "ltr";
  if (persist) { try { localStorage.setItem("rk:lang", current); } catch { /* ignore */ } }
  applyStatic();
}

export function applyStatic(scope = document) {
  scope.querySelectorAll("[data-i18n]").forEach((el) => {
    const target = el.querySelector(".ln > span") || el;
    target.textContent = t(el.dataset.i18n, { year: new Date().getFullYear() });
  });
  scope.querySelectorAll("[data-i18n-attr]").forEach((el) => {
    el.dataset.i18nAttr.split(";").forEach((pair) => {
      const [attr, key] = pair.split(":").map((x) => x.trim());
      if (attr && key) el.setAttribute(attr, t(key));
    });
  });
  document.title = t("doc.title");
  document.querySelector('meta[name="description"]')?.setAttribute("content", t("doc.desc"));
  document.querySelector('meta[property="og:title"]')?.setAttribute("content", t("doc.title"));
}
