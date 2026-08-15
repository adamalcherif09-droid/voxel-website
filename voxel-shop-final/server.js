const express = require("express");
const path = require("path");
const fs = require("fs");

const app = express();
// Catalog entries include compressed photos as text, so allow a generous body size.
app.use(express.json({ limit: "15mb" }));

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
   API — the website's frontend calls these two endpoints
   instead of saving things to the visitor's own browser, so
   every visitor sees the exact same catalog and settings.
--------------------------------------------------------- */
app.get("/api/storage/:key", async (req, res) => {
  try {
    const value = await storageGet(req.params.key);
    res.json({ value });
  } catch (e) {
    console.error("storage read failed:", e);
    res.status(500).json({ error: "storage_read_failed" });
  }
});

app.post("/api/storage/:key", async (req, res) => {
  try {
    const value = req.body && typeof req.body.value === "string" ? req.body.value : null;
    if (value === null) {
      res.status(400).json({ error: "missing_value" });
      return;
    }
    await storageSet(req.params.key, value);
    res.json({ ok: true });
  } catch (e) {
    console.error("storage write failed:", e);
    res.status(500).json({ error: "storage_write_failed" });
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

    const results = [];
    let skippedLicense = 0;
    for (const hit of hits) {
      const id = hit.id;
      if (!id) continue;
      let detail = hit;
      try {
        const detailUrl = "https://api.thingiverse.com/things/" + id + "?access_token=" + encodeURIComponent(token);
        const dr = await fetch(detailUrl);
        if (dr.ok) detail = await dr.json();
      } catch (e) { /* fall back to the search result's own fields */ }

      const license = detail.license || hit.license || "";
      if (!licenseAllowsCommercialUse(license)) { skippedLicense++; continue; }

      const name = detail.name || detail.title || hit.name || hit.title || "";
      if (!name) continue;

      const image = pickThingImage(detail) || pickThingImage(hit);
      const creatorName = pickThingCreatorName(detail) || pickThingCreatorName(hit);
      const thingUrl = pickThingUrl(detail, id) || pickThingUrl(hit, id);
      const rawDescription = (detail.description || hit.description || "").toString();
      const description = rawDescription.replace(/<[^>]+>/g, "").trim();
      const attribution = "Design by " + (creatorName || "the original creator") + " on Thingiverse"
        + (thingUrl ? " (" + thingUrl + ")" : "") + ". Licensed: " + (license || "unspecified") + ".";

      results.push({
        name: name,
        description: (description ? description + "\n\n" : "") + attribution,
        image: image,
        price: "",
        featured: false,
      });
    }

    res.json({ results: results, skippedLicense: skippedLicense, totalChecked: hits.length });
  } catch (err) {
    console.error("Thingiverse search failed:", err);
    res.status(500).json({ error: String((err && err.message) || err) });
  }
});

app.use(express.static(path.join(__dirname, "public")));

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
