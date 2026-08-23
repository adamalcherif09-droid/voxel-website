const express = require("express");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");
const compression = require("compression");

const app = express();
// gzip shrinks API responses a lot — the catalog carries embedded
// photos as base64 text, which compresses roughly 25-35% on the wire.
app.use(compression());
// Catalog entries include compressed photos as text, so allow a generous body size.
app.use(express.json({ limit: "15mb" }));

/* ---------------------------------------------------------
   Who may write what:
   - Reading is PUBLIC — customers need the catalog to shop.
   - Writing "voxel-catalog" / "voxel-settings" / "voxel-content"
     requires an admin session token, issued only by /api/auth
     after a correct passcode (verified against the same hashed
     passcode the dashboard gate checks). This is what stops a
     random visitor from rewriting prices or content through the
     raw API.
   - The one exception is first-run bootstrap: a key that doesn't
     exist yet may be created without a token, so a fresh deploy
     still initializes itself.
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
   API — the website's frontend calls these endpoints instead
   of saving things to the visitor's own browser, so every
   visitor sees the exact same catalog and settings.
--------------------------------------------------------- */
app.get("/api/storage/:key", async (req, res) => {
  try {
    if (!STORAGE_KEYS.includes(req.params.key)) {
      res.status(404).json({ error: "unknown_key" });
      return;
    }
    const value = await storageGet(req.params.key);
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
      const existing = await storageGet(key);
      if (existing !== null) {
        // Overwriting existing shop data without an admin session is
        // exactly what this check exists to prevent. Creating a key
        // that doesn't exist yet is allowed, so a fresh install can
        // still bootstrap itself.
        res.status(401).json({ error: "unauthorized_write" });
        return;
      }
    }
    await storageSet(key, value);
    res.json({ ok: true });
  } catch (e) {
    console.error("storage write failed:", e);
    res.status(500).json({ error: "storage_write_failed" });
  }
});

/* ---------------------------------------------------------
   Admin auth — trades the raw passcode for a short-lived
   session token. The passcode itself is verified against the
   same SHA-256 hash the dashboard stores, using a timing-safe
   comparison; tokens live in memory only (a server restart
   just means the owner re-enters through the footer gate,
   which they already do per visit anyway).
--------------------------------------------------------- */
app.post("/api/auth", async (req, res) => {
  try {
    const password = req.body && typeof req.body.password === "string" ? req.body.password : "";
    const raw = await storageGet("voxel-settings");
    let stored = null;
    if (raw) { try { stored = JSON.parse(raw); } catch (e) { stored = null; } }
    let expectedHash = stored && stored.security ? stored.security.passcodeHash : null;
    // Very old deployments stored the passcode as readable text; accept
    // that shape too by hashing it here (the dashboard migrates it to a
    // hash on its next authenticated save).
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
   on the free database tier.
--------------------------------------------------------- */
app.post("/api/inquiries", async (req, res) => {
  try {
    const entry = req.body && req.body.entry;
    if (!entry || typeof entry !== "object" || !entry.id || typeof entry.label !== "string") {
      res.status(400).json({ error: "invalid_entry" });
      return;
    }
    const raw = await storageGet("voxel-inquiries");
    let list = [];
    if (raw) { try { list = JSON.parse(raw); } catch (e) { list = []; } }
    if (!Array.isArray(list)) list = [];
    list.unshift({
      id: String(entry.id).slice(0, 60),
      type: entry.type === "custom" ? "custom" : "catalog",
      label: String(entry.label).slice(0, 200),
      note: String(entry.note || "").slice(0, 1000),
      fileName: String(entry.fileName || "").slice(0, 200),
      channel: entry.channel === "instagram" ? "instagram" : "whatsapp",
      createdAt: Number(entry.createdAt) || Date.now(),
    });
    if (list.length > 200) list = list.slice(0, 200);
    await storageSet("voxel-inquiries", JSON.stringify(list));
    res.json({ ok: true });
  } catch (e) {
    console.error("inquiry save failed:", e);
    res.status(500).json({ error: "inquiry_save_failed" });
  }
});

/* ---------------------------------------------------------
   Thingiverse bulk-search — lets the dashboard pull in many
   models at once for a category by keyword, instead of adding
   them one by one. Requires a free Thingiverse "App Token" set
   as THINGIVERSE_TOKEN (see README). The token is kept on the
   server so it's never exposed to visitors.

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

app.get("/api/thingiverse-search", async (req, res) => {
  try {
    const token = process.env.THINGIVERSE_TOKEN;
    if (!token) {
      res.status(400).json({ error: "Thingiverse isn't connected yet. Add a THINGIVERSE_TOKEN environment variable with your free Thingiverse App Token, then try again." });
      return;
    }
    const q = (req.query.q || "").toString().trim();
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

app.use(express.static(path.join(__dirname, "public"), {
  setHeaders: function (res, filePath) {
    // HTML must always be fresh so deploys show up immediately;
    // static assets are content-fingerprint-free here, so an hour of
    // caching is a safe bandwidth saver on the free tier.
    if (filePath.endsWith(".html")) res.setHeader("Cache-Control", "no-cache");
    else res.setHeader("Cache-Control", "public, max-age=3600");
  },
}));

// Any route that isn't an API call or a real file falls back to
// index.html, since this is a single page that handles its own
// navigation — this stops a page refresh from showing a 404.
app.use((req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
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

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Voxel is running on port ${PORT}`);
  });
}

start().catch((err) => {
  console.error("Failed to start:", err);
  process.exit(1);
});
