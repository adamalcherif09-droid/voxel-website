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
