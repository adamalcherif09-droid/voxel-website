/* ---------------------------------------------------------
   Voxel — defaults. Everything here can be changed from the
   Owner dashboard once the site is running; these are just
   the starting values on first load.
--------------------------------------------------------- */
var DEFAULT_CONTENT = {
  businessName: "Voxel",
  currencySymbol: "$",
  logoImage: "/logo.png",
  contactPhone: "",
  contactEmail: "",
  whatsappNumber: "",
  instagramHandle: "",
  tiktokHandle: "",
  facebookHandle: "",
  heroEyebrow: "Custom 3D Printing",
  heroHeadlineLine1: "Precision prints,",
  heroHeadlineLine2: "made to order.",
  heroSubtext: "Browse ready-to-print designs or send us your own file. Message us on WhatsApp or Instagram to order.",
  featuredEyebrow: "Featured",
  categoriesEyebrow: "Categories",
  customCtaHeading: "Have your own design?",
  customCtaBody: "Upload your file and message us — we will take it from there.",
  customCtaButton: "Start a custom order",
  footerTagline: "printed to order.",
  customPageHeading: "Print something of your own",
  customPageSubtext: "Upload an STL, 3MF, STEP, or OBJ file — anything you can open in Bambu Studio.",
  emptyCategoryTitle: "New designs are on the way",
  emptyCategoryBody: "This category does not have any prints listed yet. Check back soon.",
  showLbpConversion: true,
  lbpExchangeRate: "89500",
  showHowItWorks: true,
  howItWorksEyebrow: "How ordering works",
  howItWorksStep1Title: "Pick a design",
  howItWorksStep1Body: "Browse the catalog or send us your own file.",
  howItWorksStep2Title: "Message us",
  howItWorksStep2Body: "Tap Order now — we take it from there on WhatsApp or Instagram.",
  howItWorksStep3Title: "Printed & ready",
  howItWorksStep3Body: "Most orders are finished and handed over within a few days.",
  showNewBadge: true,
  newBadgeDays: "14",
  showRecentPrints: true,
  recentPrintsEyebrow: "Recent prints",
  recentPrintsSpeed: "2.6",
  recentPrints: [],
};

var DEFAULT_CATEGORIES = [
  { id: "cat-fidgets", name: "Fidgets & Toys" },
  { id: "cat-decor", name: "Home & Decor" },
  { id: "cat-desk", name: "Desk & Office" },
  { id: "cat-keychains", name: "Keychains & Accessories" },
  { id: "cat-organizers", name: "Organizers & Storage" },
  { id: "cat-cosplay", name: "Cosplay & Props" },
  { id: "cat-miniatures", name: "Miniatures & Figures" },
  { id: "cat-tech", name: "Tech & Gadgets" },
  { id: "cat-statement", name: "Statement & Large-Format Prints" },
  { id: "cat-gifts", name: "Gifts & Novelty" },
];

// A virtual category that always exists and always contains every
// model, regardless of which real category they're actually filed
// under. It's not stored anywhere — just computed on the fly — so
// there's nothing for the admin dashboard to manage for it.
var ALL_DESIGNS_CATEGORY_ID = "__all__";
var ALL_DESIGNS_CATEGORY = { id: ALL_DESIGNS_CATEGORY_ID, name: "All Designs" };

// The prints wall stores compressed photos as text inside the content
// document — same trade-off as catalog photos. Capped so a save can't
// quietly outgrow what the server accepts in one request.
var RECENT_PRINTS_MAX = 40;

// A model counts as NEW when it was added to the catalog within the
// owner-configurable window (Content tab), 14 days by default.
function isNewModel(model, days) {
  if (!model || !model.createdAt) return false;
  var windowDays = Number(days);
  if (!windowDays || windowDays < 0) windowDays = 14;
  return Date.now() - model.createdAt < windowDays * 24 * 60 * 60 * 1000;
}

var ALLOWED_FILE_EXTENSIONS = [".stl", ".3mf", ".step", ".stp", ".obj"];

// Product photos: 720px / q0.68 keeps cards and the detail popup sharp
// while staying far smaller than the previous 800px / q0.72 — the whole
// catalog lives inside one database document, so every kilobyte counts
// on the free tier. Logos keep a larger PNG path (transparency + crisp
// small-size detail matter more there than bytes).
var PRODUCT_IMAGE_MAX_DIM = 720;
var PRODUCT_IMAGE_JPEG_QUALITY = 0.68;
var LOGO_IMAGE_MAX_DIM = 500;

function isAllowedFile(name) {
  var lower = name.toLowerCase();
  return ALLOWED_FILE_EXTENSIONS.some(function (ext) { return lower.endsWith(ext); });
}

// Formats a USD amount with the site's currency symbol, plus an
// approximate Lebanese Lira conversion when that is turned on.
function formatPriceDisplay(usdAmount, content) {
  var usd = content.currencySymbol + Number(usdAmount || 0).toFixed(2);
  var rate = Number(content.lbpExchangeRate) || 0;
  if (!content.showLbpConversion || !rate) return usd;
  var lbp = Math.round(Number(usdAmount || 0) * rate).toLocaleString();
  return usd + " (\u2248 " + lbp + " LBP)";
}

// WhatsApp click-to-chat: digits only (country code + number, no plus,
// spaces or dashes), plus a pre-filled message.
function buildWhatsAppUrl(number, message) {
  var digits = (number || "").replace(/[^0-9]/g, "");
  if (!digits) return null;
  return "https://wa.me/" + digits + "?text=" + encodeURIComponent(message);
}
// Instagram's "message me" link opens a DM thread directly, but unlike
// WhatsApp it cannot pre-fill any text.
function buildInstagramDmUrl(handle) {
  var clean = (handle || "").trim().replace(/^@/, "");
  if (!clean) return null;
  return "https://ig.me/m/" + clean;
}
// Same formula as the standalone pricing calculator — always priced as
// PLA, since that's what everything gets printed in here. Returns a
// price in USD, or null if there isn't enough info (no grams and no
// time) to calculate anything yet.
function calculatePrintPriceUSD(grams, hours, minutes, pricing) {
  var g = Math.max(0, Number(grams) || 0);
  var h = Math.max(0, Number(hours) || 0);
  var m = Math.max(0, Number(minutes) || 0);
  if (g === 0 && h === 0 && m === 0) return null;
  var p = pricing || DEFAULT_SETTINGS.pricing;
  var totalHours = h + (m / 60);
  var materialCost = g * (p.plaPricePerGram || 0);
  var printElectricityCost = 0.14 * totalHours * (p.electricityRate || 0);
  var startupHeatingCost = 0.4 * (5 / 60) * (p.electricityRate || 0);
  var machineWearCost = totalHours * (p.machineWearRate || 0);
  var laborCost = totalHours * (p.laborRate || 0);
  return materialCost + printElectricityCost + startupHeatingCost + machineWearCost + laborCost;
}
// TikTok/Facebook don't have a "start a chat" link the way WhatsApp and
// Instagram do — these open the profile/page itself. On a phone with the
// app installed, tapping these opens the app directly to that page;
// otherwise they open the web version in a browser.
function buildTiktokUrl(handle) {
  var clean = (handle || "").trim().replace(/^@/, "");
  if (!clean) return null;
  return "https://www.tiktok.com/@" + clean;
}
function buildFacebookUrl(handle) {
  var clean = (handle || "").trim().replace(/^@/, "").replace(/^https?:\/\/(www\.)?facebook\.com\//i, "");
  if (!clean) return null;
  return "https://www.facebook.com/" + clean;
}
// Tapping a contact email opens the visitor's own mail app with a new
// message already addressed to it.
function buildMailtoUrl(email) {
  var clean = (email || "").trim();
  if (!clean) return null;
  return "mailto:" + clean;
}
// Tapping a contact phone number opens the visitor's own phone app
// with the number already filled in, ready to call.
function buildTelUrl(phone) {
  var digits = (phone || "").replace(/[^0-9+]/g, "");
  if (!digits) return null;
  return "tel:" + digits;
}

/* ---------------------------------------------------------
   Owner-entry security — defaults. Change all of this from
   Owner dashboard > Settings > "Owner entry security" once
   you are in for the first time.
--------------------------------------------------------- */
var COMBO_SHAPES = ["circle", "square", "triangle", "diamond", "star", "hexagon"];

var DEFAULT_SECURITY = {
  triggerClicks: 5,
  combo: ["circle", "triangle", "square", "diamond"],
  // SHA-256 of "voxel-owner" — change the passcode from Settings once inside.
  passcodeHash: "dd079e3843773940e2221bed4328afe8ed5f3057b13e9e9388d07c9f8145a6fc",
};

var DEFAULT_SETTINGS = {
  webhookUrl: "",
  security: DEFAULT_SECURITY,
  pricing: {
    electricityRate: 0.35,
    plaPricePerGram: 0.03,
    machineWearRate: 2.5,
    laborRate: 1.0,
  },
};

/* ---------------------------------------------------------
   Storage — talks to this project's own small backend
   (server.js), which keeps everything in one shared place so
   every visitor sees the same catalog, prices, and settings,
   no matter which device or browser they're using.

   Security model: reading is public (customers need the
   catalog), but WRITES to the shop's data require an admin
   session token — issued by the server only after a correct
   passcode. The owner's dashboard gets one automatically when
   they pass the footer gate; everyone else stays read-only.
--------------------------------------------------------- */

// Admin session token for this browser tab. sessionStorage (not
// localStorage) on purpose: it dies with the tab, matching how
// dashboard access already requires re-entering the gate each visit.
var adminApiToken = "";
try { adminApiToken = window.sessionStorage.getItem("voxel-admin-token") || ""; } catch (e) { adminApiToken = ""; }

function setAdminApiToken(token) {
  adminApiToken = token || "";
  try {
    if (adminApiToken) window.sessionStorage.setItem("voxel-admin-token", adminApiToken);
    else window.sessionStorage.removeItem("voxel-admin-token");
  } catch (e) { /* storage unavailable — token just lives in memory */ }
}
function getAdminApiToken() { return adminApiToken; }

// Revokes this tab's admin session on the server, so a token someone
// walked off with dies immediately instead of living out its 24h TTL.
// Fire-and-forget from the caller's point of view: even if the request
// fails the local copy is still dropped on the next line.
function apiLogout() {
  return fetch("/api/auth/logout", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-voxel-token": adminApiToken || "" },
  }).then(function (r) { return r.status >= 200 && r.status < 300; })
    .catch(function () { return false; });
}

// Exchanges the raw passcode for a short-lived server-side admin
// session. Returns the token, or null if the server couldn't be
// reached / rejected it — callers proceed gracefully either way.
function apiAuth(password) {
  return fetch("/api/auth", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ password: password }),
  })
    .then(function (res) { return res.ok ? res.json() : null; })
    .then(function (json) {
      if (json && json.token) { setAdminApiToken(json.token); return json.token; }
      return null;
    })
    .catch(function () { return null; });
}

// Like apiAuth, but keeps the HTTP status and the server's error code
// so a caller can tell "wrong passcode" from "this is a fresh install
// that still needs its one-time setup" (403 setup_required). Also arms
// a hard deadline so a stalled server (Render's free tier cold-starts a
// sleeping instance — that first request can sit for a while) can never
// freeze a UI button on "Checking…".
function apiAuthDetailed(password) {
  var ctrl = (typeof AbortController !== "undefined") ? new AbortController() : null;
  var timer = ctrl ? setTimeout(function () { ctrl.abort(); }, 15000) : null;
  var clearTimer = function () { if (timer) { clearTimeout(timer); timer = null; } };
  return fetch("/api/auth", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ password: password }),
    signal: ctrl ? ctrl.signal : undefined,
  })
    .then(function (res) {
      return res.json().catch(function () { return {}; }).then(function (json) {
        clearTimer();
        return { status: res.status, ok: res.ok, token: json.token || null, error: json.error || null, mode: json.mode || null, retryAfterSec: json.retryAfterSec || null };
      });
    })
    .catch(function () { clearTimer(); return { status: 0, ok: false, token: null, error: "network", retryAfterSec: null }; });
}

// Resolves to { ok: true, value: parsedValueOrNullOrCorruptFlaggedFalse }
// — `ok:false` means we could NOT reliably read the key (network error,
// server error, or corrupt payload). Callers must treat ok:false as
// "unknown state", never as "empty" — that distinction is what stops a
// transient outage from being able to wipe real data.
function storageGet(key) {
  return fetch("/api/storage/" + encodeURIComponent(key))
    .then(function (res) {
      if (!res.ok) return { ok: false, value: null };
      return res.json().then(function (data) {
        try {
          return { ok: true, value: data && data.value ? JSON.parse(data.value) : null };
        } catch (e) {
          return { ok: false, value: null }; // corrupt payload — unknown state
        }
      });
    })
    .catch(function () { return { ok: false, value: null }; });
}

// Returns { ok: true } when the server confirmed the write, otherwise
// { ok: false, status } — `status` lets the dashboard tell a dead admin
// session (401) apart from a transient server/network problem and react
// accordingly (re-gate and auto-retry the change vs. retry once and warn).
// `opts.admin` marks owner-dashboard writes, which carry the session token
// and are rejected by the server without one.
function storageSet(key, value, opts) {
  var headers = { "Content-Type": "application/json" };
  var token = getAdminApiToken();
  if (opts && opts.admin && token) headers["x-voxel-token"] = token;
  return fetch("/api/storage/" + encodeURIComponent(key), {
    method: "POST",
    headers: headers,
    body: JSON.stringify({ value: JSON.stringify(value) }),
  })
    .then(function (res) { return { ok: res.ok, status: res.status }; })
    .catch(function () { return { ok: false, status: 0 }; });
}

// Appends one inquiry through the public append-only endpoint. The
// server caps, sanitizes, de-duplicates and serializes the list, so
// customers never need (and never receive) admin powers.
function saveInquiryRemote(entry) {
  return fetch("/api/inquiries", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ entry: entry }),
  })
    .then(function (res) { return res.ok; })
    .catch(function () { return false; });
}

// Owner-only: reads the inquiry list with the admin session token.
// The server refuses inquiry reads without one — customer notes are
// private (they often contain names and phone numbers).
function apiGetInquiries() {
  var headers = {};
  var token = getAdminApiToken();
  if (token) headers["x-voxel-token"] = token;
  return fetch("/api/storage/voxel-inquiries", { headers: headers })
    .then(function (res) {
      if (!res.ok) return { ok: false, value: null };
      return res.json().then(function (data) {
        try {
          return { ok: true, value: data && data.value ? JSON.parse(data.value) : [] };
        } catch (e) {
          return { ok: false, value: null };
        }
      });
    })
    .catch(function () { return { ok: false, value: null }; });
}

// Discord notifications are relayed by the server: the webhook URL
// lives only there, so visitors can never read, spam, or delete it.
// Resolves to true when the ping was delivered.
function apiPingDiscord(content) {
  return fetch("/api/ping-discord", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ content: String(content || "").slice(0, 500) }),
  })
    .then(function (res) { return res.ok ? res.json() : { ok: false }; })
    .then(function (json) { return !!(json && json.ok); })
    .catch(function () { return false; });
}

function makeId(prefix) {
  return prefix + "-" + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

/* ---------------------------------------------------------
   Shopping cart — lives in the visitor's own browser
   (localStorage), so it survives page navigations and
   reloads but never touches the backend or the account.
   Items are snapshots taken when added, so the cart still
   shows the name/price the customer actually picked even
   if the owner edits the catalog later.
-------------------------------------------------------- */
var CART_STORAGE_KEY = "voxel-cart-v1";

function loadCart() {
  try {
    var raw = window.localStorage.getItem(CART_STORAGE_KEY);
    if (!raw) return [];
    var parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(function (it) {
      return it && it.modelId && Number(it.price) > 0;
    }).map(function (it) {
      return {
        modelId: it.modelId,
        name: String(it.name || ""),
        price: String(it.price),
        image: String(it.image || ""),
        qty: Math.max(1, Math.min(99, Math.round(Number(it.qty) || 1))),
      };
    });
  } catch (e) {
    return [];
  }
}
function saveCart(items) {
  try { window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items)); }
  catch (e) { /* private mode / storage blocked — cart just lives in memory */ }
}
function cartItemCount(items) {
  return items.reduce(function (n, it) { return n + it.qty; }, 0);
}
function cartSubtotalUsd(items) {
  return items.reduce(function (s, it) { return s + (Number(it.price) || 0) * it.qty; }, 0);
}
// Builds the WhatsApp message a customer sends when checking out the
// whole cart: one line per item with its quantity and line total, then
// the grand total. No HTML; just clean plain text.
function buildCartMessage(items) {
  var lines = items.map(function (it) {
    var lineTotal = (Number(it.price) || 0) * it.qty;
    return (it.name || "Item") + " \u00d7 " + it.qty + " \u2014 $" + lineTotal.toFixed(2);
  });
  return "Hi! I'd like to order:" + "\n" + lines.join("\n") + "\nTotal: $" + cartSubtotalUsd(items).toFixed(2);
}

function formatDate(ts) {
  if (!ts) return "";
  var d = new Date(ts);
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }) + " " + d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

function compressImage(file, options) {
  var preserveAlpha = !!(options && options.preserveAlpha);
  return new Promise(function (resolve, reject) {
    var reader = new FileReader();
    reader.onload = function (e) {
      var img = new window.Image();
      img.onload = function () {
        var maxDim = preserveAlpha ? LOGO_IMAGE_MAX_DIM : PRODUCT_IMAGE_MAX_DIM;
        var width = img.width;
        var height = img.height;
        if (width > height && width > maxDim) {
          height = Math.round((height * maxDim) / width);
          width = maxDim;
        } else if (height >= width && height > maxDim) {
          width = Math.round((width * maxDim) / height);
          height = maxDim;
        }
        var canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        var ctx = canvas.getContext("2d");
        // JPEG has no alpha channel — exporting a transparent image to
        // JPEG would fill the transparent areas with BLACK. Paint white
        // underneath first so product photos on transparent backgrounds
        // keep a clean look.
        if (!preserveAlpha) {
          ctx.fillStyle = "#ffffff";
          ctx.fillRect(0, 0, width, height);
        }
        ctx.drawImage(img, 0, 0, width, height);
        resolve(preserveAlpha ? canvas.toDataURL("image/png") : canvas.toDataURL("image/jpeg", PRODUCT_IMAGE_JPEG_QUALITY));
      };
      img.onerror = reject;
      img.src = e.target.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// Same resize/compress logic as compressImage, but for a data URL string
// that's already in memory (e.g. images pasted in via bulk JSON import)
// instead of a File from an <input type="file">.
function compressDataUrl(dataUrl, options) {
  var preserveAlpha = !!(options && options.preserveAlpha);
  return new Promise(function (resolve) {
    if (!dataUrl || typeof dataUrl !== "string" || dataUrl.indexOf("data:image") !== 0) {
      resolve(dataUrl || "");
      return;
    }
    var img = new window.Image();
    img.onload = function () {
      var maxDim = preserveAlpha ? LOGO_IMAGE_MAX_DIM : PRODUCT_IMAGE_MAX_DIM;
      var width = img.width;
      var height = img.height;
      if (width > height && width > maxDim) {
        height = Math.round((height * maxDim) / width);
        width = maxDim;
      } else if (height >= width && height > maxDim) {
        width = Math.round((width * maxDim) / height);
        height = maxDim;
      }
      var canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      var ctx = canvas.getContext("2d");
      if (!preserveAlpha) {
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, width, height);
      }
      ctx.drawImage(img, 0, 0, width, height);
      resolve(preserveAlpha ? canvas.toDataURL("image/png") : canvas.toDataURL("image/jpeg", PRODUCT_IMAGE_JPEG_QUALITY));
    };
    img.onerror = function () { resolve(""); };
    img.src = dataUrl;
  });
}

