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
  // Which seasonal look the site wears. One of SITE_THEMES ids below —
  // "default" is the everyday appearance; anything else is a purely
  // cosmetic re-skin (colors only) the owner can switch from the
  // dashboard's Content tab.
  theme: "default",
  showRecentPrints: true,
  recentPrintsEyebrow: "Recent prints",
  recentPrintsSpeed: "2.6",
  recentPrints: []
};
var DEFAULT_CATEGORIES = [{
  id: "cat-fidgets",
  name: "Fidgets & Toys"
}, {
  id: "cat-decor",
  name: "Home & Decor"
}, {
  id: "cat-desk",
  name: "Desk & Office"
}, {
  id: "cat-keychains",
  name: "Keychains & Accessories"
}, {
  id: "cat-organizers",
  name: "Organizers & Storage"
}, {
  id: "cat-cosplay",
  name: "Cosplay & Props"
}, {
  id: "cat-miniatures",
  name: "Miniatures & Figures"
}, {
  id: "cat-tech",
  name: "Tech & Gadgets"
}, {
  id: "cat-statement",
  name: "Statement & Large-Format Prints"
}, {
  id: "cat-gifts",
  name: "Gifts & Novelty"
}];

// A virtual category that always exists and always contains every
// model, regardless of which real category they're actually filed
// under. It's not stored anywhere — just computed on the fly — so
// there's nothing for the admin dashboard to manage for it.
var ALL_DESIGNS_CATEGORY_ID = "__all__";
var ALL_DESIGNS_CATEGORY = {
  id: ALL_DESIGNS_CATEGORY_ID,
  name: "All Designs"
};

// The prints wall stores compressed photos as text inside the content
// document — same trade-off as catalog photos. Capped so a save can't
// quietly outgrow what the server accepts in one request.
var RECENT_PRINTS_MAX = 40;

/* ---------------------------------------------------------
    Seasonal theme variants — chosen by the owner from
    Content > "Seasonal look". Each entry only re-skins COLORS
    via the [data-theme] CSS overrides in styles.css; layout,
    features, and behavior are untouched. "default" removes
    the attribute entirely and restores the everyday palette.
    Every theme keeps a light canvas with dark ink, so text
    contrast and the hardcoded button inks stay safe.
    swatch: [canvas, accent, secondary] used by the picker UI.
--------------------------------------------------------- */
var SITE_THEMES = [{
  id: "default",
  label: "Default",
  desc: "The everyday Voxel look",
  canvas: "#d5c4ba",
  accent: "#b58763",
  second: "#0f212b"
}, {
  id: "christmas",
  label: "Christmas",
  desc: "Pine green & festive red",
  canvas: "#e8efe6",
  accent: "#a93226",
  second: "#1e4633"
}, {
  id: "newyear",
  label: "New Year",
  desc: "Ivory, gold & midnight",
  canvas: "#e9edf2",
  accent: "#a8842c",
  second: "#1b2a3d"
}, {
  id: "valentine",
  label: "Valentine's",
  desc: "Blush & rose",
  canvas: "#f7e8ea",
  accent: "#b04a5a",
  second: "#4a2432"
}, {
  id: "easter",
  label: "Easter",
  desc: "Spring lilac & meadow",
  canvas: "#eef0e4",
  accent: "#8a7fb5",
  second: "#3f6f5f"
}, {
  id: "ramadan",
  label: "Ramadan",
  desc: "Warm ivory & lantern gold",
  canvas: "#ece5d3",
  accent: "#a07d2e",
  second: "#1f2d4d"
}, {
  id: "eid",
  label: "Eid",
  desc: "Festive green & cream",
  canvas: "#e9f0e4",
  accent: "#2e7d4f",
  second: "#143d28"
}, {
  id: "halloween",
  label: "Halloween",
  desc: "Pumpkin & dusk purple",
  canvas: "#eee9e1",
  accent: "#c2610f",
  second: "#3f2a55"
}, {
  id: "mothersday",
  label: "Mother's Day",
  desc: "Soft rose & mauve",
  canvas: "#f7e9ee",
  accent: "#b05a7f",
  second: "#5a2a3f"
}, {
  id: "fathersday",
  label: "Father's Day",
  desc: "Navy & steel blue",
  canvas: "#e9edf1",
  accent: "#35548a",
  second: "#5a6d84"
}, {
  id: "independenceday",
  label: "Independence Day",
  desc: "Flag red & cedar green",
  canvas: "#f4ecec",
  accent: "#b02020",
  second: "#2a5540"
}, {
  id: "graduation",
  label: "Graduation",
  desc: "Maroon & academic gold",
  canvas: "#eceade",
  accent: "#7a2f3f",
  second: "#8a6d1f"
}, {
  id: "backtoschool",
  label: "Back to School",
  desc: "School blue & pencil gold",
  canvas: "#eef0f4",
  accent: "#3f62a8",
  second: "#b58a1f"
}, {
  id: "spring",
  label: "Spring",
  desc: "Fresh meadow green",
  canvas: "#edf3e6",
  accent: "#5a8f3c",
  second: "#2a6b52"
}, {
  id: "summer",
  label: "Summer",
  desc: "Sea blue & sunset coral",
  canvas: "#e6f0f4",
  accent: "#1a7fa8",
  second: "#c96f2d"
}, {
  id: "autumn",
  label: "Autumn",
  desc: "Harvest orange & walnut",
  canvas: "#f2e8dc",
  accent: "#b56a1f",
  second: "#5d4426"
}, {
  id: "winter",
  label: "Winter",
  desc: "Frost blue & slate",
  canvas: "#e8edf2",
  accent: "#4a7ba6",
  second: "#2d4a63"
}];
function isKnownTheme(id) {
  return SITE_THEMES.some(function (t) {
    return t.id === id;
  });
}

// A short animated "Happy <holiday>" greeting shown once when the site
// loads under a seasonal theme. Each theme has its own words and a set
// of emojis that burst out of the greeting like fireworks. "default"
// (the everyday look) shows nothing — this is a seasonal-only flourish.
var THEME_GREETINGS = {
  christmas: {
    text: "Happy Christmas",
    emojis: ["\u2744", "\u1F384", "\u1F381", "\u2603", "\u2B50"]
  },
  newyear: {
    text: "Happy New Year",
    emojis: ["\u2728", "\u1F386", "\u1F942", "\u2B50", "\u1F38A"]
  },
  valentine: {
    text: "Happy Valentine's Day",
    emojis: ["\u2764", "\u1F496", "\u1F48B", "\u1F498", "\u1F49A"]
  },
  easter: {
    text: "Happy Easter",
    emojis: ["\u1F430", "\u1F95A", "\u1F338", "\u1F407", "\u1F33B"]
  },
  ramadan: {
    text: "Happy Ramadan",
    emojis: ["\u1F319", "\u1F3EE", "\u2B50", "\u1F54C", "\u1F383"]
  },
  eid: {
    text: "Happy Eid",
    emojis: ["\u2728", "\u1F31F", "\u1F319", "\u2B50", "\u1F38F"]
  },
  halloween: {
    text: "Happy Halloween",
    emojis: ["\u1F383", "\u1F47B", "\u1F987", "\u1F479", "\u1F312"]
  },
  mothersday: {
    text: "Happy Mother's Day",
    emojis: ["\u1F338", "\u1F49B", "\u1F339", "\u1F33C", "\u1F497"]
  },
  fathersday: {
    text: "Happy Father's Day",
    emojis: ["\u1F454", "\u2615", "\u1F9E7", "\u1F9D4", "\u1F512"]
  },
  independenceday: {
    text: "Happy Independence Day",
    emojis: ["\u1F386", "\u2B50", "\u1F1F1", "\u1F1E7", "\u2728"]
  },
  graduation: {
    text: "Happy Graduation",
    emojis: ["\u1F393", "\u1F4DC", "\u2728", "\u1F3C5", "\u1F389"]
  },
  backtoschool: {
    text: "Happy Back to School",
    emojis: ["\u270F", "\u1F4DA", "\u1F4D6", "\u1F4C4", "\u1F3A0"]
  },
  spring: {
    text: "Happy Spring",
    emojis: ["\u1F338", "\u1F98B", "\u1F33F", "\u1F331", "\u1F41B"]
  },
  summer: {
    text: "Happy Summer",
    emojis: ["\u2600", "\u1F3D6", "\u1F334", "\u1F30A", "\u1F319"]
  },
  autumn: {
    text: "Happy Autumn",
    emojis: ["\u1F341", "\u1F330", "\u1F342", "\u1F333", "\u1F984"]
  },
  winter: {
    text: "Happy Winter",
    emojis: ["\u2744", "\u26C4", "\u2B1F", "\u1F328", "\u1F3BF"]
  }
};
function getThemeGreeting(themeId) {
  if (!themeId || themeId === "default") return null;
  return THEME_GREETINGS[themeId] || null;
}

// A model counts as NEW when it was added to the catalog within the
// owner-configurable window (Content tab), one week by default — past
// that, the tag stops showing so "New" always means genuinely fresh.
function isNewModel(model, days) {
  if (!model || !model.createdAt) return false;
  var windowDays = Number(days);
  if (!windowDays || windowDays < 0) windowDays = 7;
  return Date.now() - model.createdAt < windowDays * 24 * 60 * 60 * 1000;
}
var ALLOWED_FILE_EXTENSIONS = [".stl", ".3mf", ".step", ".stp", ".obj"];

// Product photos: 640px / q0.62 is the sweet spot for this host — cards
// and the detail popup stay sharp while the whole catalog (planned: up
// to ~500 models) lives inside ONE database document on a 512MB Render
// instance. Every kilobyte per photo is multiplied by every model, so
// this is the single biggest lever on memory and load time. Photos are
// encoded WebP-first (~25-35% smaller than JPEG at the same quality —
// see canvasToCompressedDataUrl); browsers that cannot encode WebP fall
// back to the classic JPEG path at the same quality. Logos keep a
// larger PNG path (transparency + crisp small-size detail matter more
// there than bytes).
var PRODUCT_IMAGE_MAX_DIM = 640;
var PRODUCT_IMAGE_JPEG_QUALITY = 0.62;
var LOGO_IMAGE_MAX_DIM = 500;

// Encodes a canvas to the smallest widely-supported format: WebP when
// the browser can encode it (all modern browsers), JPEG otherwise.
// canvas.toDataURL silently falls back to a PNG data URL when asked for
// an unsupported type — a PNG here would be several times LARGER than
// JPEG and would silently bloat the whole catalog, so the output
// prefix is verified before trusting it.
function canvasToCompressedDataUrl(canvas, quality) {
  try {
    var webp = canvas.toDataURL("image/webp", quality);
    if (typeof webp === "string" && webp.indexOf("data:image/webp") === 0) return webp;
  } catch (e) {/* fall through to the JPEG path */}
  return canvas.toDataURL("image/jpeg", quality);
}

// localStorage snapshot of the last fully-loaded shop, used to paint
// repeat visits instantly while fresh data downloads in the background
// (see the load effect in app.js). One entry holds catalog + settings +
// content together so the whole page renders from a single read.
var PAGE_CACHE_KEY = "voxel-page-cache-v1";
function readPageCache() {
  try {
    var raw = window.localStorage.getItem(PAGE_CACHE_KEY);
    if (!raw) return null;
    var parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || !parsed.catalog || !Array.isArray(parsed.catalog.models)) return null;
    return parsed;
  } catch (e) {
    return null;
  }
}
function savePageCache(data) {
  try {
    window.localStorage.setItem(PAGE_CACHE_KEY, JSON.stringify({
      t: Date.now(),
      catalog: data.catalog,
      settings: data.settings,
      content: data.content
    }));
  } catch (e) {/* storage full or blocked — instant paint just won't happen */}
}
function isAllowedFile(name) {
  var lower = name.toLowerCase();
  return ALLOWED_FILE_EXTENSIONS.some(function (ext) {
    return lower.endsWith(ext);
  });
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
  var totalHours = h + m / 60;
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
  passcodeHash: "dd079e3843773940e2221bed4328afe8ed5f3057b13e9e9388d07c9f8145a6fc"
};
var DEFAULT_SETTINGS = {
  webhookUrl: "",
  security: DEFAULT_SECURITY,
  pricing: {
    electricityRate: 0.35,
    plaPricePerGram: 0.03,
    machineWearRate: 2.5,
    laborRate: 1.0
  }
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
try {
  adminApiToken = window.sessionStorage.getItem("voxel-admin-token") || "";
} catch (e) {
  adminApiToken = "";
}
function setAdminApiToken(token) {
  adminApiToken = token || "";
  try {
    if (adminApiToken) window.sessionStorage.setItem("voxel-admin-token", adminApiToken);else window.sessionStorage.removeItem("voxel-admin-token");
  } catch (e) {/* storage unavailable — token just lives in memory */}
}
function getAdminApiToken() {
  return adminApiToken;
}

// Revokes this tab's admin session on the server, so a token someone
// walked off with dies immediately instead of living out its 24h TTL.
// Fire-and-forget from the caller's point of view: even if the request
// fails the local copy is still dropped on the next line.
function apiLogout() {
  return fetch("/api/auth/logout", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-voxel-token": adminApiToken || ""
    }
  }).then(function (r) {
    return r.status >= 200 && r.status < 300;
  }).catch(function () {
    return false;
  });
}

// Exchanges the raw passcode for a short-lived server-side admin
// session. The verified shape combination travels along — the server
// treats combo + passcode together as the credential, so knowing the
// passcode alone is not enough. Returns the token, or null if the
// server couldn't be reached / rejected it — callers proceed
// gracefully either way.
function apiAuth(password, combo) {
  return fetch("/api/auth", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      password: password,
      combo: combo || []
    })
  }).then(function (res) {
    return res.ok ? res.json() : null;
  }).then(function (json) {
    if (json && json.token) {
      setAdminApiToken(json.token);
      return json.token;
    }
    return null;
  }).catch(function () {
    return null;
  });
}

// Like apiAuth, but keeps the HTTP status and the server's error code
// so a caller can tell "wrong passcode" from "this is a fresh install
// that still needs its one-time setup" (403 setup_required). Also arms
// a hard deadline so a stalled server (Render's free tier cold-starts a
// sleeping instance — that first request can sit for a while) can never
// freeze a UI button on "Checking…".
function apiAuthDetailed(password, combo) {
  var ctrl = typeof AbortController !== "undefined" ? new AbortController() : null;
  var timer = ctrl ? setTimeout(function () {
    ctrl.abort();
  }, 15000) : null;
  var clearTimer = function () {
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
  };
  return fetch("/api/auth", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      password: password,
      combo: combo || []
    }),
    signal: ctrl ? ctrl.signal : undefined
  }).then(function (res) {
    return res.json().catch(function () {
      return {};
    }).then(function (json) {
      clearTimer();
      return {
        status: res.status,
        ok: res.ok,
        token: json.token || null,
        error: json.error || null,
        mode: json.mode || null,
        retryAfterSec: json.retryAfterSec || null
      };
    });
  }).catch(function () {
    clearTimer();
    return {
      status: 0,
      ok: false,
      token: null,
      error: "network",
      retryAfterSec: null
    };
  });
}

// Asks the server whether the pressed shape sequence is the right one.
// The sequence is checked ONLY here (server-side) — no API response
// ever contains the combination, so nothing a visitor can read
// reveals it. Resolves to true when the server accepts the sequence.
function apiGateCombo(combo) {
  return fetch("/api/gate", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      combo: combo || []
    })
  }).then(function (res) {
    return res.ok;
  }).catch(function () {
    return false;
  });
}

// Resolves to { ok: true, value: parsedValueOrNullOrCorruptFlaggedFalse }
// — `ok:false` means we could NOT reliably read the key (network error,
// server error, or corrupt payload). Callers must treat ok:false as
// "unknown state", never as "empty" — that distinction is what stops a
// transient outage from being able to wipe real data.
function storageGet(key) {
  return fetch("/api/storage/" + encodeURIComponent(key)).then(function (res) {
    if (!res.ok) return {
      ok: false,
      value: null
    };
    return res.json().then(function (data) {
      try {
        return {
          ok: true,
          value: data && data.value ? JSON.parse(data.value) : null
        };
      } catch (e) {
        return {
          ok: false,
          value: null
        }; // corrupt payload — unknown state
      }
    });
  }).catch(function () {
    return {
      ok: false,
      value: null
    };
  });
}

// Returns { ok: true } when the server confirmed the write, otherwise
// { ok: false, status } — `status` lets the dashboard tell a dead admin
// session (401) apart from a transient server/network problem and react
// accordingly (re-gate and auto-retry the change vs. retry once and warn).
// `opts.admin` marks owner-dashboard writes, which carry the session token
// and are rejected by the server without one.
function storageSet(key, value, opts) {
  var headers = {
    "Content-Type": "application/json"
  };
  var token = getAdminApiToken();
  if (opts && opts.admin && token) headers["x-voxel-token"] = token;
  return fetch("/api/storage/" + encodeURIComponent(key), {
    method: "POST",
    headers: headers,
    body: JSON.stringify({
      value: JSON.stringify(value)
    })
  }).then(function (res) {
    return {
      ok: res.ok,
      status: res.status
    };
  }).catch(function () {
    return {
      ok: false,
      status: 0
    };
  });
}

// Appends one inquiry through the public append-only endpoint. The
// server caps, sanitizes, de-duplicates and serializes the list, so
// customers never need (and never receive) admin powers.
function saveInquiryRemote(entry) {
  return fetch("/api/inquiries", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      entry: entry
    })
  }).then(function (res) {
    return res.ok;
  }).catch(function () {
    return false;
  });
}

// Owner-only: reads the inquiry list with the admin session token.
// The server refuses inquiry reads without one — customer notes are
// private (they often contain names and phone numbers).
function apiGetInquiries() {
  var headers = {};
  var token = getAdminApiToken();
  if (token) headers["x-voxel-token"] = token;
  return fetch("/api/storage/voxel-inquiries", {
    headers: headers
  }).then(function (res) {
    if (!res.ok) return {
      ok: false,
      value: null
    };
    return res.json().then(function (data) {
      try {
        return {
          ok: true,
          value: data && data.value ? JSON.parse(data.value) : []
        };
      } catch (e) {
        return {
          ok: false,
          value: null
        };
      }
    });
  }).catch(function () {
    return {
      ok: false,
      value: null
    };
  });
}

// Owner-only Discord test ping through /api/admin/test-ping, which
// requires the admin session. There is no public ping endpoint: the
// server itself notifies Discord when a customer logs an inquiry, so
// arbitrary visitor text can never reach the webhook.
// Resolves to true when the ping was delivered.
function apiTestPingDiscord() {
  return fetch("/api/admin/test-ping", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-voxel-token": adminApiToken || ""
    },
    body: JSON.stringify({})
  }).then(function (res) {
    return res.ok ? res.json() : {
      ok: false
    };
  }).then(function (json) {
    return !!(json && json.ok);
  }).catch(function () {
    return false;
  });
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

// Customers can order any quantity they want. A high safety ceiling (not
// a category-style max) still keeps a runaway stepper or a pasted number
// from overflowing the checkout math.
var MAX_CART_QTY = 99999;
function clampQty(q) {
  var n = Math.round(Number(q));
  if (!isFinite(n) || isNaN(n)) n = 1;
  return Math.max(1, Math.min(MAX_CART_QTY, n));
}
function loadCart() {
  try {
    var raw = window.localStorage.getItem(CART_STORAGE_KEY);
    if (!raw) return [];
    var parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(function (it) {
      return it && it.modelId;
    }).map(function (it) {
      return {
        modelId: it.modelId,
        name: String(it.name || ""),
        price: String(it.price),
        image: String(it.image || ""),
        qty: clampQty(it.qty)
      };
    });
  } catch (e) {
    return [];
  }
}
function saveCart(items) {
  try {
    window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
  } catch (e) {/* private mode / storage blocked — cart just lives in memory */}
}
function clearCartStorage() {
  try {
    window.localStorage.removeItem(CART_STORAGE_KEY);
  } catch (e) {/* storage blocked — nothing to clear */}
}
var CART_ARCHIVE_KEY = "voxel-cart-archive-v1";

// Ordering a design directly ("Order now") clears the saved cart the
// moment the WhatsApp / Instagram redirect happens. Before clearing, the
// cart is stashed on this device so the next visit can offer it back —
// otherwise a customer's saved picks would vanish silently with no way to
// regain them.
function archiveCart(items) {
  try {
    window.localStorage.setItem(CART_ARCHIVE_KEY, JSON.stringify({
      items: items,
      archivedAt: Date.now()
    }));
  } catch (e) {/* storage blocked — nothing to restore on the next visit */}
}
function readCartArchive() {
  try {
    var raw = window.localStorage.getItem(CART_ARCHIVE_KEY);
    if (!raw) return null;
    var parsed = JSON.parse(raw);
    if (!parsed || !Array.isArray(parsed.items) || !parsed.items.length) return null;
    return parsed.items;
  } catch (e) {
    return null;
  }
}
function clearCartArchive() {
  try {
    window.localStorage.removeItem(CART_ARCHIVE_KEY);
  } catch (e) {/* nothing to clear */}
}
function cartItemCount(items) {
  return items.reduce(function (n, it) {
    return n + it.qty;
  }, 0);
}
function cartSubtotalUsd(items) {
  return items.reduce(function (s, it) {
    return s + (Number(it.price) || 0) * it.qty;
  }, 0);
}
// Builds the WhatsApp message a customer sends when checking out the
// whole cart: one line per item with its quantity and line total, then
// the grand total. No HTML; just clean plain text.
function buildCartMessage(items, currencySymbol) {
  var sym = String(currencySymbol || "$");
  var priced = items.filter(function (it) {
    return Number(it.price) > 0;
  });
  var pending = items.length - priced.length;
  var lines = items.map(function (it) {
    var price = Number(it.price) || 0;
    if (!(price > 0)) return (it.name || "Item") + " \u00d7 " + it.qty + " \u2014 price to confirm";
    return (it.name || "Item") + " \u00d7 " + it.qty + " \u2014 " + sym + (price * it.qty).toFixed(2);
  });
  var msg = "Hi! I'd like to order:" + "\n" + lines.join("\n");
  if (pending > 0) msg += "\n(" + pending + " item" + (pending > 1 ? "s" : "") + " \u2014 price to be confirmed)";
  msg += priced.length > 0 ? "\nTotal: " + sym + cartSubtotalUsd(items).toFixed(2) : "\nTotal: price to be confirmed";
  return msg;
}
function formatDate(ts) {
  if (!ts) return "";
  var d = new Date(ts);
  return d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric"
  }) + " " + d.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit"
  });
}

// Remembers each model photo's aspect ratio (width/height) once it has
// loaded, so the virtual-masonry placeholder can reserve the SAME
// height as the real image. Without this, a placeholder and its image
// could differ in height and shift the masonry when one swaps for the
// other. Keyed by model id; survives across views in this session. The
// default (3/4) is a sensible stand-in only for a photo never seen yet.
var imageRatioCache = {};
function rememberImageRatio(modelId, img) {
  if (!modelId || !img || !img.naturalWidth || !img.naturalHeight) return;
  imageRatioCache[modelId] = img.naturalWidth / img.naturalHeight;
}
function imageRatioFor(modelId) {
  var r = imageRatioCache[modelId];
  return isFinite(r) && r > 0 ? r : 3 / 4;
}

// Learns every model photo's aspect ratio up front (off-screen, never
// painted) so the virtual-masonry placeholder always reserves the exact
// height its real image will have — no layout shift even on first paint.
// Runs once after the catalog loads. Decodes each data URL behind the
// scenes; failures are ignored (the ratio stays at the placeholder default).
function preloadImageRatios(models) {
  if (!Array.isArray(models)) return;
  models.forEach(function (m) {
    if (!m || !m.id || !m.image || imageRatioCache[m.id]) return;
    var img = new window.Image();
    img.onload = function () {
      rememberImageRatio(m.id, img);
    };
    img.onerror = function () {};
    img.src = m.image;
  });
}

/* ---------------------------------------------------------
   Virtual masonry — only keeps images decoded for cards
   near the viewport. Cards stay in the DOM (no layout
   jumps) but their <img> is swapped for a lightweight
   placeholder when scrolled far away, freeing decoded
   image memory.
--------------------------------------------------------- */
function useVirtualImages(containerRef) {
  var _active = React.useState(function () {
    return new Set();
  });
  var activeSet = _active[0];
  var setActive = _active[1];
  React.useEffect(function () {
    var container = containerRef.current;
    if (!container) return;
    var active = new Set();
    var seen = new WeakSet();
    function scan() {
      var vh = window.innerHeight || 800;
      var items = container.querySelectorAll(".voxel-masonry-item[data-virtual-id]");
      var changed = false;
      var currentIds = new Set();
      items.forEach(function (el) {
        var id = el.getAttribute("data-virtual-id");
        if (!id) return;
        currentIds.add(id);
        if (seen.has(el)) return;
        seen.add(el);
        var rect = el.getBoundingClientRect();
        if (rect.bottom >= -400 && rect.top <= vh + 400 && !active.has(id)) {
          active.add(id);
          changed = true;
        }
        imgObs.observe(el);
      });
      active.forEach(function (id) {
        if (!currentIds.has(id)) {
          active.delete(id);
          changed = true;
        }
      });
      if (changed) setActive(new Set(active));
    }
    var imgObs = new IntersectionObserver(function (entries) {
      var changed = false;
      var vh = window.innerHeight || 800;
      entries.forEach(function (e) {
        var id = e.target.getAttribute("data-virtual-id");
        if (!id) return;
        if (e.isIntersecting) {
          if (!active.has(id)) {
            active.add(id);
            changed = true;
          }
        } else {
          var r = e.boundingClientRect;
          if ((r.bottom < -800 || r.top > vh + 800) && active.has(id)) {
            active.delete(id);
            changed = true;
          }
        }
      });
      if (changed) setActive(new Set(active));
    }, {
      rootMargin: "400px 0px 400px 0px",
      threshold: 0
    });
    scan();
    var mutObs = new MutationObserver(scan);
    mutObs.observe(container, {
      childList: true,
      subtree: true
    });
    return function () {
      imgObs.disconnect();
      mutObs.disconnect();
    };
  }, [containerRef]);
  return activeSet;
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
          height = Math.round(height * maxDim / width);
          width = maxDim;
        } else if (height >= width && height > maxDim) {
          width = Math.round(width * maxDim / height);
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
        resolve(preserveAlpha ? canvas.toDataURL("image/png") : canvasToCompressedDataUrl(canvas, PRODUCT_IMAGE_JPEG_QUALITY));
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
        height = Math.round(height * maxDim / width);
        width = maxDim;
      } else if (height >= width && height > maxDim) {
        width = Math.round(width * maxDim / height);
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
      resolve(preserveAlpha ? canvas.toDataURL("image/png") : canvasToCompressedDataUrl(canvas, PRODUCT_IMAGE_JPEG_QUALITY));
    };
    img.onerror = function () {
      resolve("");
    };
    img.src = dataUrl;
  });
}