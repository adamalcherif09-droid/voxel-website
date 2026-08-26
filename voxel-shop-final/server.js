const express = require("express");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");
const compression = require("compression");

const app = express();
app.disable("x-powered-by");
// Render terminates TLS and forwards requests, so trust exactly one proxy
// hop — this makes req.ip / X-Forwarded-For accurate for rate limiting.
app.set("trust proxy", 1);
// gzip shrinks API responses a lot — the catalog carries embedded
// photos as base64 text, which compresses roughly 25-35% on the wire.
app.use(compression());
// Catalog entries include compressed photos as text, so allow a generous body size.
app.use(express.json({ limit: "15mb" }));

/* ---------------------------------------------------------
   Security headers — applied to every response. The CSP allows
   exactly what this site uses and nothing more: React/Babel from
   unpkg, Google Fonts, Microlink (owner's link-fetch tool), inline
   scripts + Babel's eval (the no-build JSX pipeline needs both),
   data: images (compressed product photos) and https: images
   (photos pulled in from MakerWorld/Printables/Thingiverse).
   frame-ancestors 'none' also blocks clickjacking.
--------------------------------------------------------- */
app.use((req, res, next) => {
  res.setHeader(
    "Content-Security-Policy",
    [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://unpkg.com",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src https://fonts.gstatic.com",
      "img-src 'self' data: blob: https:",
      "media-src 'self'",
      "connect-src 'self' https://api.microlink.io",
      "object-src 'none'",
      "base-uri 'self'",
      "frame-ancestors 'none'",
    ].join("; ")
  );
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("X-Frame-Options", "DENY");
  next();
});

/* ---------------------------------------------------------
   Who may read/write what:
   - Reading the catalog and site content is PUBLIC — customers
     need them to shop.
   - Reading "voxel-inquiries" and the sensitive parts of
     "voxel-settings" (Discord webhook URL, passcode hash) requires
     an admin session token. Customer notes often contain names and
     phone numbers, and a leaked webhook URL could be spammed or
     deleted by anyone; a leaked passcode hash could be brute-forced
     offline. The GET endpoint strips/hides all of these.
   - Writing "voxel-catalog" / "voxel-settings" / "voxel-content"
     requires an admin session token, issued only by /api/auth
     after a correct passcode. There is NO unauthenticated
     "create if missing" path anymore — the server itself seeds
     defaults at startup, so a fresh deploy initializes itself
     without ever leaving a write-open window.
   - Inquiries get their own PUBLIC append-only endpoint — customers
     must be able to log an order attempt without any password.
--------------------------------------------------------- */
const STORAGE_KEYS = ["voxel-catalog", "voxel-inquiries", "voxel-settings", "voxel-content"];
const ADMIN_SESSION_TTL = 24 * 60 * 60 * 1000; // 24 hours
const adminSessions = new Map(); // token -> expiresAt

function isAuthedAdmin(req) {
  const token = req.headers["x-voxel-token"];
  if (!token || typeof token !== "string") return false;
  const expiresAt = adminSessions.get(token);
  if (!expiresAt || expiresAt < Date.now()) {
    adminSessions.delete(token);
    return false;
  }
  return true;
}

/* ---------------------------------------------------------
   Rate limiting — tiny in-memory buckets, per endpoint per IP.
   No dependencies, no cost. Protects the passcode from brute
   force, the Discord webhook from ping spam, the Thingiverse
   token from quota burn, and the database from inquiry floods.
   (Render free tier runs one instance, so in-memory is reliable.)
--------------------------------------------------------- */
const rateBuckets = new Map(); // "name:ip" -> { count, resetAt }
setInterval(function sweepBuckets() {
  const now = Date.now();
  for (const [k, b] of rateBuckets) if (b.resetAt < now) rateBuckets.delete(k);
}, 10 * 60 * 1000).unref();

function rateLimit(name, max, windowMs) {
  return function (req, res, next) {
    const fwd = (req.headers["x-forwarded-for"] || "").split(",")[0].trim();
    const ip = fwd || req.ip || "unknown";
    const k = name + ":" + ip;
    const now = Date.now();
    let b = rateBuckets.get(k);
    if (!b || b.resetAt < now) {
      b = { count: 0, resetAt: now + windowMs };
      rateBuckets.set(k, b);
    }
    b.count++;
    if (b.count > max) {
      res.status(429).json({ error: "too_many_requests" });
      return;
    }
    next();
  };
}

const DATA_DIR = path.join(__dirname, "data");
const DATA_FILE = path.join(DATA_DIR, "store.json");

/* ---------------------------------------------------------
   Storage backend — checked in this order:
   1. MONGODB_URI set -> MongoDB Atlas (their free-forever tier).
      This is the one to use when hosting somewhere that ISN'T
      Replit (e.g. Render's free plan), since the hosting itself
      doesn't keep a persistent disk around — but this database
      does, independently, so the catalog/settings/inquiries
      survive restarts and are shared by every visitor.
   2. REPLIT_DB_URL set (Replit sets this automatically) ->
      Replit's own built-in database. Same idea, built in.
   3. Neither -> a plain local file, purely so the site still
      works for local testing on your own computer.
--------------------------------------------------------- */
let db = null; // Replit database client
let mongoCollection = null; // MongoDB Atlas collection

function ensureDataFile() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(DATA_FILE)) fs.writeFileSync(DATA_FILE, "{}", "utf8");
}
function readLocalStore() {
  ensureDataFile();
  try {
    return JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
  } catch (e) {
    return {};
  }
}
function writeLocalStore(store) {
  ensureDataFile();
  fs.writeFileSync(DATA_FILE, JSON.stringify(store), "utf8");
}

async function storageGet(key) {
  if (mongoCollection) {
    // Each key ("voxel-catalog", "voxel-settings", etc.) is stored
    // as its own document: { _id: key, value: "<json string>" }.
    const doc = await mongoCollection.findOne({ _id: key });
    return doc && typeof doc.value === "string" ? doc.value : null;
  }
  if (db) {
    // @replit/database's client.get() resolves to a result object —
    // { ok: true, value: "..." } on success, or { ok: false, error }
    // if the key doesn't exist or the request failed — never the
    // stored value directly. Unwrap it here.
    const result = await db.get(key);
    if (!result || !result.ok || result.value === undefined) return null;
    return result.value;
  }
  const store = readLocalStore();
  return Object.prototype.hasOwnProperty.call(store, key) ? store[key] : null;
}
async function storageSet(key, value) {
  if (mongoCollection) {
    await mongoCollection.updateOne({ _id: key }, { $set: { value } }, { upsert: true });
    return;
  }
  if (db) {
    await db.set(key, value);
    return;
  }
  const store = readLocalStore();
  store[key] = value;
  writeLocalStore(store);
}

/* ---------------------------------------------------------
   First-run defaults — seeded by the SERVER at startup if a key
   is missing. Seeding used to be the browser's job via an
   unauthenticated "create if missing" API window, which an
   attacker could have used to inject their own settings (and
   their own passcode) on a fresh or wiped database. Server-side
   seeding closes that window completely.
--------------------------------------------------------- */
const SEED_PASSCODE_HASH = "dd079e3843773940e2221bed4328afe8ed5f3057b13e9e9388d07c9f8145a6fc"; // SHA-256 of "voxel-owner"
const SEEDS = {
  "voxel-catalog": {
    categories: [
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
    ],
    models: [],
  },
  "voxel-settings": {
    webhookUrl: "",
    security: {
      triggerClicks: 5,
      combo: ["circle", "triangle", "square", "diamond"],
      passcodeHash: SEED_PASSCODE_HASH,
    },
    pricing: {
      electricityRate: 0.35,
      plaPricePerGram: 0.03,
      machineWearRate: 2.5,
      laborRate: 1.0,
    },
  },
  "voxel-content": {
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
  },
};
async function seedMissingKeys() {
  for (const key of Object.keys(SEEDS)) {
    try {
      const existing = await storageGet(key);
      if (existing === null) {
        await storageSet(key, JSON.stringify(SEEDS[key]));
        console.log("Seeded missing key: " + key);
      }
    } catch (e) {
      console.error("Seeding failed for " + key + ":", e);
    }
  }
  try {
    const inq = await storageGet("voxel-inquiries");
    if (inq === null) await storageSet("voxel-inquiries", JSON.stringify([]));
  } catch (e) {
    console.error("Seeding failed for voxel-inquiries:", e);
  }
}

/* ---------------------------------------------------------
   API — the website's frontend calls these endpoints instead
   of saving things to the visitor's own browser, so every
   visitor sees the exact same catalog and settings.
--------------------------------------------------------- */
app.get("/api/storage/:key", async (req, res) => {
  try {
    const key = req.params.key;
    if (!STORAGE_KEYS.includes(key)) {
      res.status(404).json({ error: "unknown_key" });
      return;
    }
    // Customer inquiries are private (names, phone numbers, order
    // notes) — only the signed-in owner may read them.
    if (key === "voxel-inquiries" && !isAuthedAdmin(req)) {
      res.status(401).json({ error: "unauthorized_read" });
      return;
    }
    let value = await storageGet(key);
    // Strip secrets from the public settings payload. The Discord
    // webhook URL and the passcode hash must never reach a browser:
    // anyone could spam/delete the webhook or brute-force the hash
    // offline. The owner's own dashboard learns about them through
    // the _webhookSet / server-verified auth instead.
    if (key === "voxel-settings" && value) {
      try {
        const obj = JSON.parse(value);
        const hadWebhook = typeof obj.webhookUrl === "string" && obj.webhookUrl.length > 0;
        delete obj.webhookUrl;
        if (obj.security) {
          delete obj.security.passcodeHash;
          delete obj.security.passcode;
        }
        obj._webhookSet = hadWebhook;
        value = JSON.stringify(obj);
      } catch (e) { /* corrupt doc — return as-is, frontend treats it as unreadable */ }
    }
    res.json({ value });
  } catch (e) {
    console.error("storage read failed:", e);
    res.status(500).json({ error: "storage_read_failed" });
  }
});

app.post("/api/storage/:key", async (req, res) => {
  try {
    const key = req.params.key;
    if (!STORAGE_KEYS.includes(key)) {
      res.status(404).json({ error: "unknown_key" });
      return;
    }
    const value = req.body && typeof req.body.value === "string" ? req.body.value : null;
    if (value === null) {
      res.status(400).json({ error: "missing_value" });
      return;
    }
    if (!isAuthedAdmin(req)) {
      if (key === "voxel-inquiries") {
        // Customers append through /api/inquiries instead.
        res.status(401).json({ error: "use_inquiries_endpoint" });
        return;
      }
      // Every other write needs an admin session, no exceptions —
      // the server itself seeds defaults for fresh installs.
      res.status(401).json({ error: "unauthorized_write" });
      return;
    }
    let finalValue = value;
    if (key === "voxel-settings") {
      // The dashboard saves the WHOLE settings object, but the public
      // GET strips the webhook URL and passcode hash — so a plain
      // round-trip would erase them. The frontend marks intentional
      // changes with _updateWebhook / _updatePasscode; everything else
      // preserves what's already stored.
      let incoming = null;
      try { incoming = JSON.parse(value); } catch (e) { incoming = null; }
      if (!incoming || typeof incoming !== "object") {
        res.status(400).json({ error: "invalid_settings" });
        return;
      }
      const storedRaw = await storageGet(key);
      let stored = null;
      if (storedRaw) { try { stored = JSON.parse(storedRaw); } catch (e) { stored = null; } }
      if (stored) {
        incoming.security = incoming.security && typeof incoming.security === "object" ? incoming.security : {};
        if (incoming.security._updatePasscode === true) {
          delete incoming.security._updatePasscode; // owner set a new passcode — keep the incoming hash
        } else {
          // Preserve the stored credential (hash, or legacy plaintext).
          if (stored.security && typeof stored.security.passcodeHash === "string") {
            incoming.security.passcodeHash = stored.security.passcodeHash;
          } else if (stored.security && typeof stored.security.passcode === "string") {
            delete incoming.security.passcodeHash;
            incoming.security.passcode = stored.security.passcode;
          } else if (typeof incoming.security.passcodeHash !== "string") {
            incoming.security.passcodeHash = SEED_PASSCODE_HASH;
          }
        }
        if (incoming._updateWebhook === true) {
          delete incoming._updateWebhook; // owner set a new webhook — keep the incoming URL
        } else {
          incoming.webhookUrl = typeof stored.webhookUrl === "string" ? stored.webhookUrl : "";
        }
      } else {
        delete incoming.security._updatePasscode;
        delete incoming._updateWebhook;
      }
      finalValue = JSON.stringify(incoming);
    }
    await storageSet(key, finalValue);
    res.json({ ok: true });
  } catch (e) {
    console.error("storage write failed:", e);
    res.status(500).json({ error: "storage_write_failed" });
  }
});

/* ---------------------------------------------------------
   Admin auth — trades the raw passcode for a short-lived
   session token. The passcode itself is verified server-side
   (the hash is never sent to browsers, so it can't be attacked
   offline), using a timing-safe comparison; tokens live in
   memory only (a server restart just means the owner re-enters
   through the footer gate, which they already do per visit
   anyway). Rate-limited to blunt brute-force attempts.
--------------------------------------------------------- */
app.post("/api/auth", rateLimit("auth", 8, 15 * 60 * 1000), async (req, res) => {
  try {
    const password = req.body && typeof req.body.password === "string" ? req.body.password : "";
    if (!password || password.length > 200) {
      res.status(401).json({ error: "wrong_passcode" });
      return;
    }
    const raw = await storageGet("voxel-settings");
    let stored = null;
    if (raw) { try { stored = JSON.parse(raw); } catch (e) { stored = null; } }
    let expectedHash = stored && stored.security ? stored.security.passcodeHash : null;
    // Very old deployments stored the passcode as readable text; accept
    // that shape too by hashing it here (saving settings again migrates
    // it to a hash).
    if (!expectedHash && stored && stored.security && typeof stored.security.passcode === "string") {
      expectedHash = crypto.createHash("sha256").update(stored.security.passcode).digest("hex");
    }
    const candidate = crypto.createHash("sha256").update(password).digest("hex");
    const matches =
      typeof expectedHash === "string" &&
      expectedHash.length === candidate.length &&
      crypto.timingSafeEqual(Buffer.from(candidate), Buffer.from(expectedHash));
    if (!matches) {
      res.status(401).json({ error: "wrong_passcode" });
      return;
    }
    const token = crypto.randomUUID();
    adminSessions.set(token, Date.now() + ADMIN_SESSION_TTL);
    setTimeout(() => adminSessions.delete(token), ADMIN_SESSION_TTL).unref();
    res.json({ token: token });
  } catch (e) {
    console.error("auth failed:", e);
    res.status(500).json({ error: "auth_failed" });
  }
});

/* ---------------------------------------------------------
   Public append-only inquiries — customers log an order attempt
   here. The server owns the list: it sanitizes each entry and
   caps it at the most recent 200 so it can never grow unbounded
   on the free database tier. Writes are serialized through a
   promise chain so two customers ordering at the same moment
   can no longer overwrite each other's entry (lost-update race).
--------------------------------------------------------- */
let inquiryChain = Promise.resolve();
app.post("/api/inquiries", rateLimit("inq", 20, 60 * 60 * 1000), async (req, res) => {
  const entry = req.body && req.body.entry;
  if (!entry || typeof entry !== "object" || !entry.id || typeof entry.label !== "string") {
    res.status(400).json({ error: "invalid_entry" });
    return;
  }
  const clean = {
    id: String(entry.id).slice(0, 60),
    type: entry.type === "custom" ? "custom" : "catalog",
    label: String(entry.label).slice(0, 200),
    note: String(entry.note || "").slice(0, 1000),
    fileName: String(entry.fileName || "").slice(0, 200),
    channel: entry.channel === "instagram" ? "instagram" : "whatsapp",
    createdAt: Number(entry.createdAt) || Date.now(),
  };
  const op = inquiryChain.then(async function () {
    const raw = await storageGet("voxel-inquiries");
    let list = [];
    if (raw) { try { list = JSON.parse(raw); } catch (e) { list = []; } }
    if (!Array.isArray(list)) list = [];
    if (list.some(function (i) { return i && i.id === clean.id; })) {
      return { duplicate: true }; // already recorded — don't double-log
    }
    list.unshift(clean);
    if (list.length > 200) list = list.slice(0, 200);
    await storageSet("voxel-inquiries", JSON.stringify(list));
    return { duplicate: false };
  });
  inquiryChain = op.catch(function () { /* keep the chain alive after failures */ });
  try {
    const result = await op;
    res.json({ ok: true, duplicate: result.duplicate });
  } catch (e) {
    console.error("inquiry save failed:", e);
    res.status(500).json({ error: "inquiry_save_failed" });
  }
});

/* ---------------------------------------------------------
   Discord ping relay — the webhook URL lives ONLY on the server.
   The browser never sees it (it couldn't be trusted with it: a
   leaked webhook URL lets anyone spam or delete the hook), it
   just tells the server what to say. Rate-limited and length-
   capped so it can't be abused as a spam cannon either.
--------------------------------------------------------- */
app.post("/api/ping-discord", rateLimit("ping", 15, 60 * 60 * 1000), async (req, res) => {
  try {
    const raw = await storageGet("voxel-settings");
    let stored = null;
    if (raw) { try { stored = JSON.parse(raw); } catch (e) { stored = null; } }
    const hook = stored && typeof stored.webhookUrl === "string" ? stored.webhookUrl.trim() : "";
    if (!hook) {
      res.json({ ok: false, error: "no_webhook" });
      return;
    }
    const content = String((req.body && req.body.content) || "").trim().slice(0, 500);
    if (!content) {
      res.status(400).json({ ok: false, error: "empty_content" });
      return;
    }
    const r = await fetch(hook, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: content }),
    });
    res.json({ ok: r.ok });
  } catch (e) {
    console.error("discord ping failed:", e);
    res.json({ ok: false, error: "ping_failed" });
  }
});

/* ---------------------------------------------------------
   Thingiverse bulk-search — lets the dashboard pull in many
   models at once for a category by keyword, instead of adding
   them one by one. Requires a free Thingiverse "App Token" set
   as THINGIVERSE_TOKEN (see README). The token is kept on the
   server so it's never exposed to visitors. Rate-limited so a
   visitor can't burn the token's quota.

   This deliberately EXCLUDES anything not licensed for
   commercial use — Thingiverse designs are shared by individual
   designers under their own chosen license, and many explicitly
   forbid selling prints of them. This filter is a best-effort
   safety net, not legal advice — it's still worth spot-checking
   results yourself before selling prints of them.
--------------------------------------------------------- */
function licenseAllowsCommercialUse(license) {
  var s = (license || "").toLowerCase();
  if (!s) return false; // unknown/missing license -> exclude, safest default
  if (s.indexOf("non-commercial") !== -1) return false;
  if (s.indexOf("noncommercial") !== -1) return false;
  if (s.indexOf("all rights reserved") !== -1) return false;
  if (s.indexOf("nokia") !== -1) return false; // legacy Thingiverse license, restrictive
  return true; // e.g. Creative Commons Attribution, CC0/Public Domain, GPL, BSD
}
function pickThingImage(d) {
  if (d.thumbnail) return d.thumbnail;
  if (Array.isArray(d.images) && d.images[0]) {
    var img = d.images[0];
    if (img.url) return img.url;
    if (Array.isArray(img.sizes) && img.sizes.length) {
      var big = img.sizes.find(function (s) { return s.type === "display"; }) || img.sizes[img.sizes.length - 1];
      return (big && big.url) || "";
    }
  }
  return d.preview_image || "";
}
function pickThingCreatorName(d) {
  return (d.creator && (d.creator.name || d.creator.first_name)) || "";
}
function pickThingUrl(d, id) {
  return d.public_url || d.thing_url || (id ? "https://www.thingiverse.com/thing:" + id : "");
}

// Runs fn over items with a small concurrency limit instead of one by
// one — the old sequential loop could take a minute for 60 results and
// increased the odds of tripping Thingiverse's rate limits.
async function mapPool(items, limit, fn) {
  let index = 0;
  const out = new Array(items.length);
  async function worker() {
    while (index < items.length) {
      const i = index++;
      try {
        out[i] = await fn(items[i]);
      } catch (e) {
        out[i] = { _skipReason: "error" };
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return out;
}

app.get("/api/thingiverse-search", rateLimit("tv", 10, 60 * 60 * 1000), async (req, res) => {
  try {
    const token = process.env.THINGIVERSE_TOKEN;
    if (!token) {
      res.status(400).json({ error: "Thingiverse isn't connected yet. Add a THINGIVERSE_TOKEN environment variable with your free Thingiverse App Token, then try again." });
      return;
    }
    const q = (req.query.q || "").toString().trim().slice(0, 120);
    if (!q) {
      res.status(400).json({ error: "Type something to search for first." });
      return;
    }
    let limit = parseInt(req.query.limit, 10);
    if (!limit || limit < 1) limit = 30;
    if (limit > 60) limit = 60; // stay well under Thingiverse's rate limits and keep this fast

    const perPage = 30;
    const pagesNeeded = Math.ceil(limit / perPage);
    let hits = [];
    for (let page = 1; page <= pagesNeeded; page++) {
      const searchUrl = "https://api.thingiverse.com/search/" + encodeURIComponent(q)
        + "?type=things&sort=popular&per_page=" + perPage + "&page=" + page
        + "&access_token=" + encodeURIComponent(token);
      const sr = await fetch(searchUrl);
      if (!sr.ok) {
        if (sr.status === 429) {
          throw new Error("Thingiverse's rate limit was hit — wait a few minutes and search again.");
        }
        const body = await sr.text().catch(function () { return ""; });
        throw new Error("Thingiverse search failed (HTTP " + sr.status + "): " + body.slice(0, 300));
      }
      const sdata = await sr.json();
      const pageHits = Array.isArray(sdata) ? sdata
        : Array.isArray(sdata.hits) ? sdata.hits
        : Array.isArray(sdata.things) ? sdata.things
        : [];
      if (pageHits.length === 0) break;
      hits = hits.concat(pageHits);
      if (hits.length >= limit) break;
    }
    hits = hits.slice(0, limit);

    // Fetch each result's details in parallel (6 at a time), keeping
    // the original popularity order.
    const processed = await mapPool(hits, 6, async (hit) => {
      const id = hit.id;
      if (!id) return { _skipReason: "invalid" };
      let detail = hit;
      try {
        const detailUrl = "https://api.thingiverse.com/things/" + id + "?access_token=" + encodeURIComponent(token);
        const dr = await fetch(detailUrl);
        if (dr.ok) detail = await dr.json();
      } catch (e) { /* fall back to the search result's own fields */ }

      const license = detail.license || hit.license || "";
      if (!licenseAllowsCommercialUse(license)) return { _skipReason: "license" };

      const name = detail.name || detail.title || hit.name || hit.title || "";
      if (!name) return { _skipReason: "invalid" };

      const image = pickThingImage(detail) || pickThingImage(hit);
      const creatorName = pickThingCreatorName(detail) || pickThingCreatorName(hit);
      const thingUrl = pickThingUrl(detail, id) || pickThingUrl(hit, id);
      const rawDescription = (detail.description || hit.description || "").toString();
      const description = rawDescription.replace(/<[^>]+>/g, "").trim();
      const attribution = "Design by " + (creatorName || "the original creator") + " on Thingiverse"
        + (thingUrl ? " (" + thingUrl + ")" : "") + ". Licensed: " + (license || "unspecified") + ".";

      return {
        _model: {
          name: name,
          description: (description ? description + "\n\n" : "") + attribution,
          image: image,
          price: "",
          featured: false,
        },
      };
    });

    const results = [];
    let skippedLicense = 0;
    for (const p of processed) {
      if (p && p._model) results.push(p._model);
      else if (p && p._skipReason === "license") skippedLicense++;
    }

    res.json({ results: results, skippedLicense: skippedLicense, totalChecked: hits.length });
  } catch (err) {
    console.error("Thingiverse search failed:", err);
    res.status(500).json({ error: String((err && err.message) || err) });
  }
});

// Unknown /api/* paths answer with JSON, not the SPA fallback —
// an API client should never receive HTML from this server.
app.use("/api", (req, res) => {
  res.status(404).json({ error: "not_found" });
});

app.use(express.static(path.join(__dirname, "public"), {
  setHeaders: function (res, filePath) {
    // HTML must always be fresh so deploys show up immediately;
    // JS/CSS are fingerprint-free, so a SHORT cache keeps deploys
    // showing up for everyone within minutes instead of serving a
    // broken mix of old and new files for up to an hour.
    if (filePath.endsWith(".html")) res.setHeader("Cache-Control", "no-cache");
    else res.setHeader("Cache-Control", "public, max-age=300");
  },
}));

// Any route that isn't an API call or a real file falls back to
// index.html, since this is a single page that handles its own
// navigation — this stops a page refresh from showing a 404.
app.use((req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// Final error handler — always JSON, never a stack trace. Express's
// default handler prints full error stacks to the client when it
// thinks it's in development; this keeps malformed-JSON 400s and any
// unexpected 500s clean and information-free for attackers.
app.use((err, req, res, next) => {
  if (err) console.error("Request error:", err.message);
  res.status(err && err.status ? err.status : 500).json({ error: "server_error" });
});

const PORT = process.env.PORT || 3000;

async function start() {
  if (process.env.MONGODB_URI) {
    const { MongoClient } = require("mongodb");
    const client = new MongoClient(process.env.MONGODB_URI);
    await client.connect();
    const dbName = process.env.MONGODB_DB_NAME || "voxel";
    mongoCollection = client.db(dbName).collection("voxel_storage");
    console.log("Using MongoDB Atlas (shared, persistent) database.");
  } else if (process.env.REPLIT_DB_URL) {
    const Database = require("@replit/database");
    db = new Database();
    console.log("Using Replit's shared database.");
  } else {
    console.log("No MONGODB_URI or REPLIT_DB_URL found — using a local file instead (data/store.json). Data will NOT persist on hosts without a persistent disk.");
  }

  await seedMissingKeys();

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Voxel is running on port ${PORT}`);
  });
}

start().catch((err) => {
  console.error("Failed to start:", err);
  process.exit(1);
});
