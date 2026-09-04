const express = require("express");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");
const zlib = require("zlib");
const compression = require("compression");

const app = express();
app.disable("x-powered-by");
// Render terminates TLS and forwards requests, so trust exactly one proxy
// hop — this makes req.ip / X-Forwarded-For accurate for rate limiting.
app.set("trust proxy", 1);
// gzip shrinks API responses a lot — the catalog carries embedded
// photos as base64 text. Level 6 (the classic default) produces
// noticeably smaller payloads than level 1 — a real win for mobile
// data users since the catalog travels as one JSON document. The
// original build chose level 1 to save CPU; at this site's actual
// traffic the compression only runs a few dozen times per minute and
// costs milliseconds, so bytes-for-visitors wins. Revisit only if the
// free-tier instance ever CPU-throttles under real load.
app.use(compression({ level: 6 }));
// Catalog entries include compressed photos as text, so allow a
// generous body size for the admin's storage writes. SIZED FOR THE
// CATALOG PLAN: ~500 models x ~120KB of base64 photo each is roughly
// 60MB, so 80mb leaves headroom — with the old 15mb limit the owner
// would have been locked out of saving at around 150 models. Every
// other API route takes only tiny JSON (auth, inquiries, pings,
// handover) — a tight limit there keeps a multi-megabyte flood from
// landing on the public endpoints.
app.use("/api/storage", express.json({ limit: "80mb" }));
app.use("/api", express.json({ limit: "32kb" }));

/* ---------------------------------------------------------
   Security headers — applied to every response. The CSP allows
   exactly what this site uses and nothing more: self-hosted
   React, Google Fonts, Microlink (owner's link-fetch tool),
   inline scripts (the bootstrap + JSON-LD need it — the app
   itself is pre-compiled, so no eval/unsafe-eval is needed),
   data: images (compressed product photos) and https: images
   (photos pulled in from MakerWorld/Printables/Thingiverse).
   frame-ancestors 'none' also blocks clickjacking.
--------------------------------------------------------- */
app.use((req, res, next) => {
  res.setHeader(
    "Content-Security-Policy",
    [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline'",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src https://fonts.gstatic.com",
      "img-src 'self' data: blob: https:",
      "media-src 'self'",
      "connect-src 'self' https://api.microlink.io",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'none'",
    ].join("; ")
  );
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("X-Frame-Options", "DENY");
  // Isolates this page's window from cross-origin openers/popups, and
  // kills legacy Adobe Flash/PDF cross-domain policy file probing.
  res.setHeader("Cross-Origin-Opener-Policy", "same-origin");
  res.setHeader("X-Permitted-Cross-Domain-Policies", "none");
  // HSTS only when the request actually arrived over TLS (Render
  // terminates TLS and forwards https requests with the proto header;
  // plain local http stays unstoppable). Browsers ignore HSTS over
  // insecure transports anyway, but sending it only on https keeps the
  // intent unambiguous.
  if (req.secure || req.get("x-forwarded-proto") === "https") {
    res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  }
  // The site never asks for device/permission capabilities — forbid
  // them outright so a compromised script has nothing to bargain with.
  res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=(), usb=(), browsing-topics=()");
  // API responses carry private data (inquiry notes, settings-derived
  // state) — never let a cache store them, and keep other origins from
  // embedding them.
  if (req.path.indexOf("/api") === 0) {
    res.setHeader("Cache-Control", "no-store");
    res.setHeader("Cross-Origin-Resource-Policy", "same-origin");
  }
  next();
});

/* ---------------------------------------------------------
   Host / Origin allowlist.
   Every request's Host header must be one of the site's real
   hostnames. This kills DNS-rebinding (an attacker's domain
   pointed at this server can no longer stand in for it) and
   Host-header poisoning, and the Origin check on any request
   that can change state kills cross-site request forgery even
   before the admin token check runs. The allowed set:
   - localhost / 127.0.0.1 (local testing)
   - any *.onrender.com host (Render's free platform domain —
     covers the live app and its health checks)
   - anything listed in APP_URL or ALLOWED_HOSTS (a custom
     domain the owner brings, e.g. voxel.example.com)
-------------------------------------------------------- */
function normalizeHostHeader(raw) {
  var host = String(raw || "").toLowerCase().trim();
  // strip scheme if someone sneaks one in, then the port
  host = host.replace(/^https?:\/\//, "").split("/")[0];
  // strip port (handles "[::1]:3000" too)
  host = host.replace(/^\[([^\]]+)\](?::\d+)?$/, "$1").replace(/:\d+$/, "");
  if (host === "::1") return host;
  // Host smuggling / DNS-rebinding defense: a real hostname is only
  // letters, digits, dots, and hyphens. Rejecting anything else (commas
  // that smuggle a second Host, '@' that smuggles userinfo, control
  // characters) keeps the allowlist check from being bypassed by
  // multi-host or mis-shaped headers.
  if (!/^[a-z0-9]([a-z0-9.-]*[a-z0-9])?$/.test(host)) return "";
  if (host.indexOf("..") !== -1) return "";
  return host;
}
function hostAllowed(host) {
  if (!host) return false;
  if (host === "localhost" || host === "127.0.0.1" || host === "::1") return true;
  if (host.indexOf(".onrender.com") === host.length - ".onrender.com".length) return true;
  var extra = (process.env.ALLOWED_HOSTS || "").split(",")
    .map(function (s) { return normalizeHostHeader(s); })
    .filter(Boolean);
  var appUrl = normalizeHostHeader(process.env.APP_URL || "");
  if (appUrl && appUrl === host) return true;
  return extra.indexOf(host) !== -1;
}
app.use(function (req, res, next) {
  const host = normalizeHostHeader(req.get("host"));
  if (!hostAllowed(host)) {
    res.status(403).json({ error: "host_not_allowed" });
    return;
  }
  if (req.method !== "GET" && req.method !== "HEAD") {
    const origin = req.get("origin");
    if (origin) {
      const ohost = normalizeHostHeader(origin);
      if (!hostAllowed(ohost)) {
        res.status(403).json({ error: "origin_not_allowed" });
        return;
      }
    }
  }
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
const SESSION_KEY = "voxel-sessions";
const STORAGE_KEYS = ["voxel-catalog", "voxel-inquiries", "voxel-settings", "voxel-content", SESSION_KEY];
const ADMIN_SESSION_TTL = 24 * 60 * 60 * 1000; // 24 hours
const adminSessions = new Map(); // tokenHash -> expiresAt (cache of the persisted session map)
let sessionChain = Promise.resolve(); // serializes session map writes so two logins can't clobber each other

function hashToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

/* ---------------------------------------------------------
   Stored credentials use PBKDF2-HMAC-SHA256 with a per-install
   random salt and an OWASP-recommended iteration count, so the
   passcode is expensive to crack at rest (a bare SHA-256 — the
   old format — is fast enough to brute-force offline if the
   store ever leaked). hashPasscode writes only the new salted
   form; verifyPasscode accepts both old and new shapes and
   reports when a match was made against the legacy form so the
   caller can lift the stored credential to the salted KDF.
-------------------------------------------------------- */
const PASSCODE_MIN_LENGTH = 12;
const PBKDF2_ITERATIONS = 600000; // OWASP 2023 guidance for PBKDF2-HMAC-SHA256
const PBKDF2_SALT_BYTES = 16;
const PBKDF2_KEY_BYTES = 32;
const PASSCODE_HASH_PREFIX = "pbkdf2$";

function hashPasscode(password) {
  return new Promise(function (resolve, reject) {
    const salt = crypto.randomBytes(PBKDF2_SALT_BYTES);
    crypto.pbkdf2(password, salt, PBKDF2_ITERATIONS, PBKDF2_KEY_BYTES, "sha256", function (err, dk) {
      if (err) { reject(err); return; }
      // pbkdf2$<iterations>$<salt-hex>$<key-hex>
      resolve(PASSCODE_HASH_PREFIX + PBKDF2_ITERATIONS + "$" + salt.toString("hex") + "$" + dk.toString("hex"));
    });
  });
}

function verifyPasscode(stored, password) {
  return new Promise(function (resolve) {
    if (typeof stored !== "string" || !stored) { resolve({ ok: false, legacy: false }); return; }
    if (stored.indexOf(PASSCODE_HASH_PREFIX) === 0) {
      const parts = stored.split("$");
      if (parts.length !== 4) { resolve({ ok: false, legacy: false }); return; }
      const iterations = parseInt(parts[1], 10);
      if (!Number.isFinite(iterations) || iterations < 1 || iterations > 5000000) {
        resolve({ ok: false, legacy: false });
        return;
      }
      const salt = Buffer.from(parts[2], "hex");
      const want = Buffer.from(parts[3], "hex");
      if (salt.length === 0 || want.length === 0) { resolve({ ok: false, legacy: false }); return; }
      crypto.pbkdf2(password, salt, iterations, want.length, "sha256", function (err, got) {
        let same = !err && got.length === want.length;
        if (same) { try { same = crypto.timingSafeEqual(got, want); } catch (e) { same = false; } }
        resolve({ ok: same, legacy: false });
      });
      return;
    }
    if (/^[0-9a-f]{64}$/.test(stored)) {
      // Legacy era: a raw SHA-256 of the passcode, still verified
      // timing-safe. legacy:true tells the caller this credential
      // should be upgraded to the salted KDF on a successful match.
      const candidate = Buffer.from(crypto.createHash("sha256").update(password).digest("hex"));
      let same = false;
      try { same = crypto.timingSafeEqual(candidate, Buffer.from(stored)); } catch (e) { same = false; }
      resolve({ ok: same, legacy: same });
      return;
    }
    resolve({ ok: false, legacy: false });
  });
}

// The stored credential to verify against: the salted/modern hash, or
// (for very old deployments) the readable plaintext hashed the legacy
// way so verifyPasscode can process it uniformly.
function storedCredential(stored, sec) {
  if (sec && typeof sec.passcodeHash === "string") return sec.passcodeHash;
  if (sec && typeof sec.passcode === "string") {
    return crypto.createHash("sha256").update(sec.passcode).digest("hex");
  }
  return null;
}

// Admin sessions are persisted in the same shared store that holds the
// catalog — keyed by a SHA-256 hash of the token, never the raw token.
// Sessions used to live in memory only, which meant that ANY server
// restart (a redeploy, Render recycling the free instance, opening a
// second instance) silently logged the owner out mid-edit: the next save
// returned 401 and the dashboard claimed "Saving failed" even though the
// change (e.g. deleting a category) was perfectly valid. Persisting them
// makes edits survive deploys; the 24-hour TTL keeps the list tiny.
let sessionsLoaded = false;

async function loadSessions() {
  try {
    const raw = await storageGet(SESSION_KEY);
    let map = null;
    if (raw) { try { map = JSON.parse(raw); } catch (e) { map = null; } }
    if (!map || typeof map !== "object" || Array.isArray(map)) map = {};
    const now = Date.now();
    for (const [hash, exp] of Object.entries(map)) {
      if (typeof exp !== "number" || exp <= now) delete map[hash];
    }
    adminSessions.clear();
    for (const [hash, exp] of Object.entries(map)) adminSessions.set(hash, exp);
    sessionsLoaded = true;
    if (Object.keys(map).length === 0) await persistSessions();
  } catch (e) {
    console.error("session load failed:", e);
    adminSessions.clear();
    sessionsLoaded = true;
  }
}

async function persistSessions() {
  const snap = {};
  const now = Date.now();
  for (const [hash, exp] of adminSessions) {
    if (exp > now) snap[hash] = exp;
    else adminSessions.delete(hash);
  }
  const op = sessionChain.then(function () { return storageSet(SESSION_KEY, JSON.stringify(snap)); });
  sessionChain = op.catch(function () { /* keep the chain alive after failures */ });
  return op;
}

function isAuthedAdmin(req) {
  const token = req.headers["x-voxel-token"];
  if (!token || typeof token !== "string") return false;
  const expiresAt = adminSessions.get(hashToken(token));
  if (!expiresAt || expiresAt < Date.now()) {
    adminSessions.delete(hashToken(token));
    return false;
  }
  return true;
}

// Prune expired sessions in the background so the persisted map never
// grows (the 24h TTL + hourly sweep keep it to a handful of entries).
setInterval(function sweepSessions() {
  const now = Date.now();
  let changed = false;
  for (const [hash, exp] of adminSessions) {
    if (exp <= now) { adminSessions.delete(hash); changed = true; }
  }
  if (changed) persistSessions().catch(function () {});
}, 60 * 60 * 1000).unref();

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

// The client's real IP, defensively derived. The old code trusted the
// FRONT of X-Forwarded-For, which any caller can set — one line lets
// an attacker mint a fresh rate-limit bucket per attempt and brute
// force the passcode forever. Express's req.ip already obeys "trust
// proxy 1"; when no proxy is in front it equals the TCP peer, which a
// remote caller cannot forge (an X-Forwarded-For header is ignored).
// Two layers then protect against a lying X-Forwarded-For on hosts
// that forward it before Express sees it (see authLockInfo below).
function clientIp(req) {
  const viaExpress = req.ip || req.socket.remoteAddress || "unknown";
  return String(viaExpress).replace(/^::ffff:/, "");
}

function rateLimit(name, max, windowMs) {
  return function (req, res, next) {
    const ip = clientIp(req);
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

// A per-route GLOBAL burst cap that is keyed on nothing a caller can
// choose — used where an attacker spraying many fake IPs could
// otherwise reset the per-IP buckets and pump a public endpoint.
function globalBurst(name, max, windowMs) {
  const k = "__global__:" + name;
  const now = Date.now();
  let b = rateBuckets.get(k);
  if (!b || b.resetAt < now) {
    b = { count: 0, resetAt: now + windowMs };
    rateBuckets.set(k, b);
  }
  b.count++;
  return b.count <= max;
}

/* ---------------------------------------------------------
   Passcode brute-force lockout. Beyond the per-IP request
   limiter above, failures are counted with NO attacker-choosable
   key: a global window and a per-IP consecutive-failure counter
   (IP still fingerprintable). A spray of thousands of fake IPs
   trips the global window within ~25 tries and locks EVERYONE
   out for a cooldown window; a single IP that keeps guessing
   trips its own escalating lockout. Timing is added to /api/auth
   responses so success and failure take the same amount of time.
-------------------------------------------------------- */
const AUTH_FAIL_WINDOW_MS = 15 * 60 * 1000;
const AUTH_GLOBAL_FAIL_MAX = 25;
const AUTH_GLOBAL_LOCK_MS = 90 * 1000;
const AUTH_IP_FAIL_MAX = 8;
const AUTH_IP_MIN_LOCK_MS = 30 * 1000;
const AUTH_IP_MAX_LOCK_MS = 30 * 60 * 1000;
const authFailureTimes = [];        // global sliding window of failure timestamps
let authGlobalLockUntil = 0;
const authIpFailures = new Map();   // ip -> { count, since, lockUntil }

function authLockInfo(ip) {
  const now = Date.now();
  if (now < authGlobalLockUntil) return { until: authGlobalLockUntil, global: true };
  const f = authIpFailures.get(ip);
  if (f && f.lockUntil > now) return { until: f.lockUntil, global: false };
  return null;
}
function noteAuthFailure(ip) {
  const now = Date.now();
  while (authFailureTimes.length && authFailureTimes[0] <= now - AUTH_FAIL_WINDOW_MS) authFailureTimes.shift();
  authFailureTimes.push(now);
  if (authFailureTimes.length >= AUTH_GLOBAL_FAIL_MAX) {
    authGlobalLockUntil = now + AUTH_GLOBAL_LOCK_MS;
    authFailureTimes.length = 0;
    return; // everyone gets a cooldown — no per-IP bookkeeping needed
  }
  let f = authIpFailures.get(ip);
  if (!f) { f = { count: 0, since: now, lockUntil: 0 }; authIpFailures.set(ip, f); }
  if (now - f.since > AUTH_FAIL_WINDOW_MS) { f.count = 0; f.since = now; }
  f.count++;
  if (f.count >= AUTH_IP_FAIL_MAX) {
    f.lockUntil = now + Math.min(AUTH_IP_MIN_LOCK_MS * Math.pow(2, f.count - AUTH_IP_FAIL_MAX), AUTH_IP_MAX_LOCK_MS);
    f.count = 0;
  } else {
    f.lockUntil = 0;
  }
  // keep the map from growing forever (this IP was cleared on success)
  if (authIpFailures.size > 2000) {
    for (const [k, v] of authIpFailures) if (now - v.since > AUTH_FAIL_WINDOW_MS * 2) authIpFailures.delete(k);
  }
}
function noteAuthSuccess(ip) {
  authIpFailures.delete(ip);
}
function authJitterDelay() {
  // Same-ish response time whether the passcode was right or wrong, so
  // a remote observer can't use response timing to confirm guesses.
  return new Promise(function (resolve) { setTimeout(resolve, 120 + Math.floor(Math.random() * 280)); });
}

// Server-side fetch with a hard deadline, so a slow or hostile upstream
// (Thingiverse, Discord) can't pin a socket open indefinitely.
function fetchWithTimeout(url, opts, ms) {
  const ctrl = new AbortController();
  const timer = setTimeout(function () { ctrl.abort(); }, ms || 15000);
  return fetch(url, Object.assign({}, opts, { signal: ctrl.signal }))
    .finally(function () { clearTimeout(timer); });
}

// A webhook URL that actually is a Discord webhook (snowflake id + token
// under /api/webhooks/) and nothing else. This is the ONLY shape the
// owner's dashboard can produce, and allowing any other URL would turn
// the public ping relay into a blind-request gadget the moment a
// misconfigured or internal address was ever saved.
function isDiscordWebhookUrl(raw) {
  var s = String(raw || "").trim();
  if (s.length < 20 || s.length > 400) return false;
  const base = s.indexOf("/api/webhooks/");
  if (!/^https:\/\/(www\.)?discord(app)?\.com\/api\/webhooks\//.test(s)) return false;
  var rest = s.slice(base + "/api/webhooks/".length);
  var parts = rest.split("/");
  if (parts.length < 2 || parts.length > 2) return false;
  if (!/^\d{10,25}$/.test(parts[0])) return false; // snowflake id
  if (!/^[A-Za-z0-9_-]+$/.test(parts[1])) return false; // opaque token, no slashes/query
  return true;
}

const DATA_DIR = path.join(__dirname, "data");

// Server-side verification of the secret shape sequence. The combo is
// never shipped to browsers, so it must be checked HERE. Comparison is
// timing-safe: both sequences are hashed first so the digest lengths
// always match, then compared with timingSafeEqual. A missing/corrupt
// stored combo falls back to the shipped default rather than locking
// the owner out of a half-written settings document.
const DEFAULT_COMBO = ["circle", "triangle", "square", "diamond"];
function comboMatches(stored, candidate) {
  const expected = Array.isArray(stored) && stored.length >= 3 ? stored : DEFAULT_COMBO;
  if (!Array.isArray(candidate) || candidate.length !== expected.length) return false;
  const clean = [];
  for (const s of candidate) {
    if (typeof s !== "string" || s.length > 20) return false;
    clean.push(s);
  }
  const h1 = crypto.createHash("sha256").update(expected.join("|")).digest();
  const h2 = crypto.createHash("sha256").update(clean.join("|")).digest();
  try { return crypto.timingSafeEqual(h1, h2); } catch (e) { return false; }
}
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

// Raw-document cache. The catalog is ONE big JSON string that every
// visitor requests on every page load; without this cache each request
// re-reads and re-allocates the full multi-megabyte document — a serious
// memory/CPU tax on a 512MB host once the catalog reaches a few hundred
// models. The cache holds each key's latest raw string (one shared
// instance, instead of a fresh copy per request) and is updated by
// every storageSet, so it can never serve stale data. Single-instance
// hosting only (Render free tier), which is already what the in-memory
// rate limiting assumes.
const rawDocCache = new Map(); // key -> raw string
const RAW_CACHE_MAX_BYTES = 100 * 1024 * 1024; // safety valve: never cache something absurd

async function storageGet(key) {
  if (rawDocCache.has(key)) return rawDocCache.get(key);
  let value = null;
  if (mongoCollection) {
    // Each key ("voxel-catalog", "voxel-settings", etc.) is stored
    // as its own document: { _id: key, value: "<json string>" }.
    const doc = await mongoCollection.findOne({ _id: key });
    value = doc && typeof doc.value === "string" ? doc.value : null;
  } else if (db) {
    // @replit/database's client.get() resolves to a result object —
    // { ok: true, value: "..." } on success, or { ok: false, error }
    // if the key doesn't exist or the request failed — never the
    // stored value directly. Unwrap it here.
    const result = await db.get(key);
    if (!result || !result.ok || result.value === undefined) value = null;
    else value = result.value;
  } else {
    const store = readLocalStore();
    value = Object.prototype.hasOwnProperty.call(store, key) ? store[key] : null;
  }
  if (typeof value === "string" && value.length <= RAW_CACHE_MAX_BYTES) {
    rawDocCache.set(key, value);
  }
  return value;
}
async function storageSet(key, value) {
  if (mongoCollection) {
    await mongoCollection.updateOne({ _id: key }, { $set: { value } }, { upsert: true });
  } else if (db) {
    await db.set(key, value);
  } else {
    const store = readLocalStore();
    store[key] = value;
    writeLocalStore(store);
  }
  if (typeof value === "string" && value.length <= RAW_CACHE_MAX_BYTES) {
    rawDocCache.set(key, value);
  } else {
    rawDocCache.delete(key);
  }
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
        if (key === "voxel-settings") {
          // Fresh install: the owner gets a RANDOM one-time setup
          // passcode, printed once to the server log, that only works
          // for the first login (it hands over to whatever hidden
          // passcode the owner chooses). Nothing guessable is ever a live
          // credential — a fixed default sitting in a public repo would
          // just hand the site to the first person who reads it.
          const oneTimeSetup = "voxel-" + crypto.randomBytes(12).toString("base64url");
          const settings = JSON.parse(JSON.stringify(SEEDS[key]));
          settings.security.passcodeHash = crypto.createHash("sha256").update(oneTimeSetup).digest("hex");
          settings.security._setupPending = true;
          await storageSet(key, JSON.stringify(settings));
          console.log("");
          console.log("=====================================================");
          console.log("  FIRST-TIME OWNER LOGIN");
          console.log("  One-time setup passcode (use this once to log in,");
          console.log("  then set a passcode only you know):");
          console.log("");
          console.log("    " + oneTimeSetup);
          console.log("");
          console.log("  This code is shown in the server log ONCE and never");
          console.log("  again - treat it like a master key until you log in.");
          console.log("=====================================================");
          console.log("");
        } else {
          await storageSet(key, JSON.stringify(SEEDS[key]));
          console.log("Seeded missing key: " + key);
        }
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
app.get("/api/storage/:key", rateLimit("read", 240, 60 * 1000), async (req, res) => {
  try {
    const key = req.params.key;
    if (!STORAGE_KEYS.includes(key)) {
      res.status(404).json({ error: "unknown_key" });
      return;
    }
    // Customer inquiries are private (names, phone numbers, order
    // notes) and the admin session map is a bearer-credential list —
    // only the signed-in owner may read either.
    if ((key === "voxel-inquiries" || key === "voxel-sessions") && !isAuthedAdmin(req)) {
      res.status(401).json({ error: "unauthorized_read" });
      return;
    }
    let value = await storageGet(key);
    // The catalog is large, changes rarely, and is re-read by every
    // returning visitor. no-cache + ETag lets the browser revalidate
    // (If-None-Match) instead of re-downloading: when nothing changed
    // Express answers 304 and the visitor transfers zero bytes. The
    // resource is still checked on every load, so admin edits appear
    // immediately — this is revalidation, not stale caching.
    res.setHeader("Cache-Control", "no-cache");
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
        // The security section is reduced to what the PUBLIC page can
        // not live without: how many footer clicks open the door, and
        // how many shapes the gate asks for (a bare count, NOT the
        // sequence itself). The actual combination never leaves the
        // server — the gate verifies it against /api/gate, so reading
        // the site's JS or API responses tells an attacker nothing
        // about which shapes to press.
        const sec = obj.security && typeof obj.security === "object" ? obj.security : {};
        obj.security = {
          triggerClicks: Number.isFinite(sec.triggerClicks) ? sec.triggerClicks : 5,
          comboLength: Array.isArray(sec.combo) && sec.combo.length >= 3 ? sec.combo.length : 4,
        };
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
    if (key === "voxel-sessions") {
      // The server owns the session map (see the note beside
      // adminSessions) — clients must never write it.
      res.status(403).json({ error: "server_managed_key" });
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
    let passcodeChangedHere = false;
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
          // Owner intentionally set a new passcode. The dashboard can't
          // pre-hash it (the salt lives server-side), so the new value
          // arrives as plaintext in passcodeNew and is hashed HERE with
          // the salted KDF ? never the shipped default (that passcode is
          // public knowledge); the handover flags are server-owned, and
          // marking them here means the next auth is a normal one. Every
          // OTHER session is revoked so a long-stolen token dies the
          // moment the owner rotates the passcode (the current tab stays
          // logged in).
          delete incoming.security._updatePasscode;
          const newPasscode = typeof incoming.security.passcodeNew === "string" ? incoming.security.passcodeNew : "";
          delete incoming.security.passcodeNew;
          // The shipped default is public knowledge — refusing it takes
          // precedence over everything else, even its length.
          if (newPasscode === "voxel-owner" ||
              crypto.createHash("sha256").update(newPasscode).digest("hex") === SEED_PASSCODE_HASH) {
            res.status(400).json({ error: "default_passcode_not_allowed" });
            return;
          }
          if (newPasscode.length < PASSCODE_MIN_LENGTH) {
            res.status(400).json({ error: "passcode_too_short" });
            return;
          }
          incoming.security.passcodeHash = await hashPasscode(newPasscode);
          incoming.security._setupPending = false;
          incoming.security._passcodeChanged = true;
          passcodeChangedHere = true;
        } else {
          // Preserve the stored credential (hash, or legacy plaintext)
          // and the server-owned setup flags so a plain round-trip can
          // never reset them back to the public default.
          incoming.security._setupPending = !!(stored.security && stored.security._setupPending);
          incoming.security._passcodeChanged = !!(stored.security && stored.security._passcodeChanged);
          if (stored.security && typeof stored.security.passcodeHash === "string") {
            incoming.security.passcodeHash = stored.security.passcodeHash;
          } else if (stored.security && typeof stored.security.passcode === "string") {
            delete incoming.security.passcodeHash;
            incoming.security.passcode = stored.security.passcode;
          } else {
            // Corrupt document — refuse rather than silently falling back
            // to the public default credential.
            res.status(400).json({ error: "invalid_settings" });
            return;
          }
        }
        if (incoming._updateWebhook === true) {
          delete incoming._updateWebhook; // owner set a new webhook — keep the incoming URL
          var hookVal = typeof incoming.webhookUrl === "string" ? incoming.webhookUrl.trim() : "";
          // Only a Discord webhook link can be stored — an arbitrary URL
          // (an internal address, a file:// path, a stale or rotated hook)
          // would otherwise make the public ping relay usable as a blind
          // request gadget pointed anywhere.
          if (hookVal && !isDiscordWebhookUrl(hookVal)) {
            res.status(400).json({ error: "webhook_url_invalid" });
            return;
          }
          incoming.webhookUrl = hookVal;
        } else {
          incoming.webhookUrl = typeof stored.webhookUrl === "string" ? stored.webhookUrl : "";
        }
        // The shape combination itself is never sent to browsers (the
        // public GET strips it down to a bare comboLength), so a plain
        // settings round-trip would erase it. Same contract as the
        // webhook: preserved from the store unless the dashboard marks
        // an intentional change with _updateCombo — the validation
        // below then clamps the incoming value.
        if (incoming.security._updateCombo === true) {
          delete incoming.security._updateCombo;
        } else {
          incoming.security.combo =
            stored.security && Array.isArray(stored.security.combo) && stored.security.combo.length
              ? stored.security.combo.slice(0, 6)
              : ["circle", "triangle", "square", "diamond"];
        }
      } else {
        // No stored settings (shouldn't happen — the server seeds them)
        // — treat as a fresh setup so a write can't skip the handover.
        incoming.security = incoming.security && typeof incoming.security === "object" ? incoming.security : {};
        delete incoming.security._updatePasscode;
        delete incoming.security._updateCombo;
        incoming.security._setupPending = true;
        incoming.security._passcodeChanged = false;
        delete incoming._updateWebhook;
      }
      // The shape-challenge security settings travel to the browser (they
      // ARE the gate's UI) but a malformed write — a corrupted doc, or a
      // bad call from a credential holder — could lock the owner OUT of
      // the gate or make it unlaunchable. Clamp to exactly what the
      // dashboard's own controls allow, so no valid state is rejected and
      // no invalid one is accepted.
      var clicks = incoming.security.triggerClicks;
      if (typeof clicks !== "number") clicks = parseInt(clicks, 10);
      if (!Number.isFinite(clicks) || clicks < 3 || clicks > 10) {
        res.status(400).json({ error: "invalid_security_settings" });
        return;
      }
      incoming.security.triggerClicks = Math.floor(clicks);
      var combo = incoming.security.combo;
      if (!Array.isArray(combo) || combo.length < 3 || combo.length > 6) {
        res.status(400).json({ error: "invalid_security_settings" });
        return;
      }
      var allowedShapes = ["circle", "triangle", "diamond", "square", "star", "hexagon"];
      var shapesOk = combo.every(function (s) { return allowedShapes.indexOf(s) !== -1; });
      if (!shapesOk) {
        res.status(400).json({ error: "invalid_security_settings" });
        return;
      }
      incoming.security.combo = combo.slice(0, 6);
      finalValue = JSON.stringify(incoming);
    }
    await storageSet(key, finalValue);
    if (key === "voxel-settings" && passcodeChangedHere) {
      // Rotate the passcode -> kill every other live session; the
      // current tab keeps working so the owner finishes their save.
      const currentTokenHash = (function () {
        const t = req.headers["x-voxel-token"];
        return typeof t === "string" ? hashToken(t) : null;
      })();
      for (const [h] of adminSessions) if (h !== currentTokenHash) adminSessions.delete(h);
      await persistSessions();
    }
    res.json({ ok: true });
  } catch (e) {
    console.error("storage write failed:", e);
    res.status(500).json({ error: "storage_write_failed" });
  }
});

/* ---------------------------------------------------------
   Admin auth — trades the raw passcode for a short-lived admin
   session token. The passcode is verified server-side only (the
   hash is never sent to browsers, so it can't be attacked
   offline), with a timing-safe compare and a response-time
   jitter so success and failure are indistinguishable by wire
   timing. Trips come from brute forcing, not correctness, so
   before the passcode is even checked the request is refused
   outright when the global or this-IP failure lockout is active
   (see authLockInfo) — a spoofed X-Forwarded-For can reset the
   per-IP limiter, but the global window is keyed on nothing an
   attacker chooses. On a fresh install the stored hash is a
   RANDOM one-time setup code, so a login attempt is answered
   with 403 setup_required and a token is never issued until the
   owner completes the one-time change (see /api/auth/change-default
   below). Same applies to the ancient fixed default if a
   pre-hardening install still carries it.
-------------------------------------------------------- */
/* ---------------------------------------------------------
   Shape-gate verification — the first door before the
   passcode. The browser collects the shapes the visitor
   presses and asks the server whether the sequence matches;
   the sequence itself never ships in any API response, so
   nothing a visitor can read reveals it. Rate-limited with
   its own bucket (combo guessing is cheap to type, so it
   gets a tight budget) plus the same global-burst cap idea
   as the inquiry/ping relays.
--------------------------------------------------------- */
app.post("/api/gate", rateLimit("gate", 30, 15 * 60 * 1000), async (req, res) => {
  try {
    if (!globalBurst("gate", 600, 15 * 60 * 1000)) {
      res.status(429).json({ error: "too_many_attempts" });
      return;
    }
    const raw = await storageGet("voxel-settings");
    let stored = null;
    if (raw) { try { stored = JSON.parse(raw); } catch (e) { stored = null; } }
    const sec = (stored && stored.security) || {};
    const ok = comboMatches(sec.combo, req.body ? req.body.combo : null);
    res.status(ok ? 200 : 401).json({ ok: ok });
  } catch (e) {
    console.error("gate failed:", e);
    res.status(500).json({ error: "gate_failed" });
  }
});

app.post("/api/auth", rateLimit("auth", 12, 15 * 60 * 1000), async (req, res) => {
  try {
    const ip = clientIp(req);
    const locked = authLockInfo(ip);
    if (locked) {
      res.status(429).json({ error: "too_many_attempts", retryAfterSec: Math.max(1, Math.ceil((locked.until - Date.now()) / 1000)) });
      return;
    }
    const password = req.body && typeof req.body.password === "string" ? req.body.password : "";
    if (!password || password.length > 200) {
      await authJitterDelay();
      noteAuthFailure(ip);
      res.status(401).json({ error: "wrong_passcode" });
      return;
    }
    const raw = await storageGet("voxel-settings");
    let stored = null;
    if (raw) { try { stored = JSON.parse(raw); } catch (e) { stored = null; } }
    const sec = (stored && stored.security) || {};
    // The shape combination is part of the credential now: knowing the
    // passcode alone is not enough, and calling /api/auth directly
    // cannot skip the gate. A wrong combo counts as a failed login
    // attempt (same jitter, same lockout bookkeeping).
    if (!comboMatches(sec.combo, req.body ? req.body.combo : null)) {
      await authJitterDelay();
      noteAuthFailure(ip);
      res.status(401).json({ error: "wrong_combo" });
      return;
    }
    const verdict = await verifyPasscode(storedCredential(stored, sec), password);
    if (!verdict.ok) {
      await authJitterDelay();
      noteAuthFailure(ip);
      res.status(401).json({ error: "wrong_passcode" });
      return;
    }
    // Correct passcode, but the stored one is still the one-time setup
    // code (fresh install, or a legacy default) ? no token until the
    // owner has claimed it with a passcode of their own.
    const setupPending = sec._setupPending === true;
    const legacyDefault = sec.passcodeHash === SEED_PASSCODE_HASH && sec._passcodeChanged !== true;
    if (setupPending || legacyDefault) {
      await authJitterDelay();
      // mode tells the setup screen how to talk to the owner: a fresh
      // install has a random one-time code, a legacy install still holds
      // the public default and the owner's "current" field is simply
      // whatever passcode worked before (usually the original one).
      res.status(403).json({ error: "setup_required", mode: setupPending ? "fresh" : "legacy" });
      return;
    }
    // Established install still holding an old-era unsalted hash ? lift
    // the stored credential to the salted KDF in place. Never done while
    // the setup/legacy default is active (that exact hash drives the
    // forced handover above), so detection stays reliable.
    if (verdict.legacy) {
      const upgraded = Object.assign({}, stored);
      upgraded.security = Object.assign({}, sec, { passcodeHash: await hashPasscode(password) });
      delete upgraded.security.passcode; // migrate any legacy plaintext away
      try { await storageSet("voxel-settings", JSON.stringify(upgraded)); }
      catch (e) { console.error("passcode KDF upgrade failed:", e); }
    }
    noteAuthSuccess(ip);
    await authJitterDelay();
    const token = crypto.randomUUID();
    const expiresAt = Date.now() + ADMIN_SESSION_TTL;
    const tokenHash = hashToken(token);
    adminSessions.set(tokenHash, expiresAt);
    await persistSessions(); // persisted -> the session survives server restarts
    res.json({ token: token });
  } catch (e) {
    console.error("auth failed:", e);
    res.status(500).json({ error: "auth_failed" });
  }
});

/* ---------------------------------------------------------
   First-login handover — available ONLY while the stored
   credential is the one-time setup code (or the legacy default:
   random _setupPending on new installs, the old fixed hash on
   pre-hardening installs). It verifies that setup code, swaps in
   a real passcode, marks the handover complete, kills every
   previously existing session (on a takeover attempt this would
   eject the attacker mid-session), and issues a fresh token for
   the owner. The new passcode is sent once over TLS and hashed
   server-side; the public read path never sees any hash.
   Same rate limit and failure lockout as /api/auth.
-------------------------------------------------------- */
app.post("/api/auth/change-default", rateLimit("auth", 12, 15 * 60 * 1000), async (req, res) => {
  try {
    const ip = clientIp(req);
    const locked = authLockInfo(ip);
    if (locked) {
      res.status(429).json({ error: "too_many_attempts", retryAfterSec: Math.max(1, Math.ceil((locked.until - Date.now()) / 1000)) });
      return;
    }
    const current = req.body && typeof req.body.current === "string" ? req.body.current : "";
    const next = req.body && typeof req.body.newPassword === "string" ? req.body.newPassword : "";
    if (!current || !next || current.length > 200 || next.length > 200) {
      res.status(400).json({ error: "invalid_request" });
      return;
    }
    // The shipped default is public knowledge — refusing it takes
    // precedence over everything else, even its length.
    const nextHash = crypto.createHash("sha256").update(next).digest("hex");
    if (next === "voxel-owner" || nextHash === SEED_PASSCODE_HASH) {
      res.status(400).json({ error: "default_passcode_not_allowed" });
      return;
    }
    if (next.length < PASSCODE_MIN_LENGTH) {
      res.status(400).json({ error: "passcode_too_short" });
      return;
    }
    if (next === current) {
      res.status(400).json({ error: "passcode_must_differ" });
      return;
    }
    const raw = await storageGet("voxel-settings");
    let stored = null;
    if (raw) { try { stored = JSON.parse(raw); } catch (e) { stored = null; } }
    const sec = (stored && stored.security) || {};
    if (!comboMatches(sec.combo, req.body ? req.body.combo : null)) {
      await authJitterDelay();
      noteAuthFailure(ip);
      res.status(401).json({ error: "wrong_combo" });
      return;
    }
    const setupPending = sec._setupPending === true;
    const legacyDefault = sec.passcodeHash === SEED_PASSCODE_HASH && sec._passcodeChanged !== true;
    if (!setupPending && !legacyDefault) {
      // Already claimed — nothing to hand over.
      res.status(403).json({ error: "setup_not_required" });
      return;
    }
    const verdict = await verifyPasscode(storedCredential(stored, sec), current);
    if (!verdict.ok) {
      await authJitterDelay();
      noteAuthFailure(ip);
      res.status(401).json({ error: "wrong_passcode" });
      return;
    }
    // Commit the handover, then reissue the session map from scratch.
    const nextSettings = Object.assign({}, stored);
    nextSettings.security = Object.assign({}, sec, {
      passcodeHash: await hashPasscode(next),
      _setupPending: false,
      _passcodeChanged: true,
    });
    delete nextSettings.security.passcode; // migrate any legacy plaintext away
    delete nextSettings.security._updatePasscode;
    await storageSet("voxel-settings", JSON.stringify(nextSettings));
    adminSessions.clear();
    const token = crypto.randomUUID();
    adminSessions.set(hashToken(token), Date.now() + ADMIN_SESSION_TTL);
    await persistSessions();
    noteAuthSuccess(ip);
    await authJitterDelay();
    res.json({ token: token });
  } catch (e) {
    console.error("change-default failed:", e);
    res.status(500).json({ error: "change_default_failed" });
  }
});

/* ---------------------------------------------------------
   Logout ? revokes the presented admin session token so a
   leaked/stolen token (or a shared device) can be killed at
   once instead of persisting for the full 24h TTL. Idempotent:
   revoking an already-dead token is a no-op success. The tab
   drops its copy regardless; this endpoint makes the server
   side die too, so the token can't be replayed from anywhere.
-------------------------------------------------------- */
// Logout revokes a bearer token — nothing password-ish to protect, so it
// gets its OWN bucket. Sharing the "auth" bucket would let cheap logout
// calls consume the same 15-minute login budget (and the owner's own
// dashboard sign-out would silently eat one of their 12 login attempts).
app.post("/api/auth/logout", rateLimit("logout", 60, 15 * 60 * 1000), async (req, res) => {
  try {
    const token = req.headers["x-voxel-token"];
    if (token && typeof token === "string") {
      adminSessions.delete(hashToken(token));
      await persistSessions();
    }
    res.json({ ok: true });
  } catch (e) {
    console.error("logout failed:", e);
    res.status(500).json({ error: "logout_failed" });
  }
});

/* ---------------------------------------------------------
   Public append-only inquiries — customers log an order attempt
   here. The server owns the list: it sanitizes each entry and
   caps it at the most recent 500 so it can never grow unbounded
   on the free database tier (500 instead of a smaller number so
   a junk flood cannot quickly push real orders out of the window).
   Writes are serialized through a
   promise chain so two customers ordering at the same moment
   can no longer overwrite each other's entry (lost-update race).
   A global burst cap (independent of the per-IP limiter, so fake
   header IPs can't dodge it) keeps a request flood from filling
   the database faster than the 200-entry rollover.
-------------------------------------------------------- */
let inquiryChain = Promise.resolve();
app.post("/api/inquiries", rateLimit("inq", 20, 60 * 60 * 1000), async (req, res) => {
  if (!globalBurst("inq", 250, 60 * 60 * 1000)) {
    res.status(429).json({ error: "too_many_requests" });
    return;
  }
  const entry = req.body && req.body.entry;
  if (!entry || typeof entry !== "object" || !entry.id || typeof entry.label !== "string") {
    res.status(400).json({ error: "invalid_entry" });
    return;
  }
  const clean = {
    id: String(entry.id).slice(0, 60),
    type: entry.type === "custom" || entry.type === "cart" ? entry.type : "catalog",
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
    if (list.length > 500) list = list.slice(0, 500);
    await storageSet("voxel-inquiries", JSON.stringify(list));
    return { duplicate: false };
  });
  inquiryChain = op.catch(function () { /* keep the chain alive after failures */ });
  try {
    const result = await op;
    if (!result.duplicate) {
      // Discord notification, sent by the SERVER from the sanitized
      // entry (never from the client): fire-and-forget, so a slow or
      // missing webhook can't delay the customer's response and a
      // Discord outage can't fail an order.
      const kind = clean.type === "custom" ? "custom order" : clean.type === "cart" ? "cart order" : "order";
      const msg = "New " + kind + " via " + clean.channel + ": " + clean.label
        + (clean.note ? " — " + clean.note : "")
        + (clean.fileName ? " (file: " + clean.fileName + ")" : "");
      sendDiscord(msg).catch(function () { /* notification is best-effort */ });
    }
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
/* ---------------------------------------------------------
    Discord delivery. The webhook URL lives ONLY on the
    server. Two callers, both controlled:
      1. /api/inquiries — the server itself pings Discord
         when a customer logs an order (fire-and-forget;
         the customer's response never depends on Discord).
      2. /api/admin/test-ping — the owner's dashboard test
         button, which requires a valid admin session.
    There is NO public ping endpoint anymore: an anonymous
    visitor can no longer push arbitrary text into the
    owner's Discord channel at all.
--------------------------------------------------------- */
async function sendDiscord(content) {
  const raw = await storageGet("voxel-settings");
  let stored = null;
  if (raw) { try { stored = JSON.parse(raw); } catch (e) { stored = null; } }
  const hook = stored && typeof stored.webhookUrl === "string" ? stored.webhookUrl.trim() : "";
  if (!hook) return { ok: false, error: "no_webhook" };
  // Defense in depth: even if an invalid URL was ever stored, never
  // blind-POST to it (see the save-time allowlist).
  if (!isDiscordWebhookUrl(hook)) return { ok: false, error: "invalid_webhook" };
  const text = String(content || "").trim().slice(0, 500);
  if (!text) return { ok: false, error: "empty_content" };
  const r = await fetchWithTimeout(hook, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ content: text }),
  }, 8000);
  return { ok: r.ok };
}

app.post("/api/admin/test-ping", rateLimit("ping", 15, 60 * 60 * 1000), async (req, res) => {
  // Owner-only. The old public /api/ping-discord let ANY visitor relay
  // arbitrary 500-char messages into the owner's Discord channel
  // (rate limits slowed that down but never stopped it); requiring the
  // admin session closes the spam cannon completely.
  if (!isAuthedAdmin(req)) return res.status(401).json({ ok: false, error: "unauthorized" });
  try {
    const out = await sendDiscord("This is a test ping from your website.");
    res.json({ ok: out.ok, error: out.error });
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
    if (!isAuthedAdmin(req)) {
      // This endpoint burns the owner's Thingiverse app-token quota and
      // is only ever called from the dashboard, so it's owner-gated.
      res.status(401).json({ error: "unauthorized" });
      return;
    }
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
      const sr = await fetchWithTimeout(searchUrl, {}, 20000);
      if (!sr.ok) {
        if (sr.status === 429) {
          throw new Error("Thingiverse's rate limit was hit — wait a few minutes and search again.");
        }
        // Log the upstream body server-side but never echo it: Thingiverse
        // error text could conceivably include the request URL (and with
        // it the access_token), and it would bloat the client response.
        const body = await sr.text().catch(function () { return ""; });
        console.error("Thingiverse upstream error " + sr.status + ": " + body.slice(0, 600));
        throw new Error("Thingiverse search failed (HTTP " + sr.status + ")");
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
        const dr = await fetchWithTimeout(detailUrl, {}, 15000);
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

/* ---------------------------------------------------------
    Health check — a plain, free JSON liveness probe. Point an
    uptime monitor (UptimeRobot etc.) at /api/health: it doubles
    as a keep-warm ping for the free tier (no sleeping between
    visitors) and a fast way to confirm a deploy came up clean.
--------------------------------------------------------- */
app.get("/api/health", function (req, res) {
  res.json({ ok: true, uptimeSec: Math.round(process.uptime()) });
});

// Unknown /api/* paths answer with JSON, not the SPA fallback —
// an API client should never receive HTML from this server.
const ZIP_CRC_TABLE = (function () {
  const t = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c;
  }
  return t;
})();
function zipCrc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = ZIP_CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
// A dependency-free STREAMING ZIP writer (deflate) so the owner can grab
// every film frame in one click for local reference or AI upscaling.
// Frames are read, compressed, and flushed to the socket ONE AT A TIME,
// so peak memory is a single frame (~300KB) instead of the whole
// 20MB archive — on a 512MB host, two simultaneous full-archive builds
// used to be enough to OOM-kill the instance.
function streamZip(res, entries) {
  return new Promise(function (resolve, reject) {
    const central = [];
    let offset = 0;
    let idx = 0;
    let fileCount = 0;
    function fail(e) {
      try { res.end(); } catch (e2) { /* socket already gone */ }
      reject(e);
    }
    res.on("error", fail);
    function next() {
      if (idx >= entries.length) {
        // Central directory + end-of-central-directory, then done.
        // NOTE: the entry count is the number of FILES (central holds
        // two buffers per file — the fixed header and the name) —
        // writing central.length there made every unzipper see twice
        // as many entries as exist and silently extract nothing.
        const cd = Buffer.concat(central);
        const eocd = Buffer.alloc(22);
        eocd.writeUInt32LE(0x06054b50, 0);
        eocd.writeUInt16LE(fileCount, 8); eocd.writeUInt16LE(fileCount, 10);
        eocd.writeUInt32LE(cd.length, 12); eocd.writeUInt32LE(offset, 16); eocd.writeUInt16LE(0, 20);
        res.write(cd);
        res.write(eocd);
        res.end();
        resolve();
        return;
      }
      const e = entries[idx++];
      let data;
      try { data = fs.readFileSync(e.path); } catch (err) {
        next(); // frame vanished between readdir and read — skip it
        return;
      }
      const nameBuf = Buffer.from(e.name, "utf8");
      const crc = zipCrc32(data);
      const comp = zlib.deflateRawSync(data, { level: 1 });
      const csize = comp.length, usize = data.length;
      data = null; // release the raw frame before flushing to the socket
      const lh = Buffer.alloc(30);
      lh.writeUInt32LE(0x04034b50, 0);
      lh.writeUInt16LE(20, 4); lh.writeUInt16LE(0x0800, 6); lh.writeUInt16LE(8, 8); // deflate
      lh.writeUInt32LE(crc, 14);
      lh.writeUInt32LE(csize, 18); lh.writeUInt32LE(usize, 22);
      lh.writeUInt16LE(nameBuf.length, 26); lh.writeUInt16LE(0, 28);
      const ch = Buffer.alloc(46);
      ch.writeUInt32LE(0x02014b50, 0);
      ch.writeUInt16LE(20, 4); ch.writeUInt16LE(20, 6); ch.writeUInt16LE(0x0800, 8); ch.writeUInt16LE(8, 10);
      ch.writeUInt32LE(crc, 16); ch.writeUInt32LE(csize, 20); ch.writeUInt32LE(usize, 24);
      ch.writeUInt16LE(nameBuf.length, 28); ch.writeUInt32LE(0, 30); ch.writeUInt32LE(0, 34); ch.writeUInt32LE(0, 38);
      ch.writeUInt32LE(offset, 42);
      offset += 30 + nameBuf.length + csize;
      central.push(ch, nameBuf);
      fileCount++;
      res.write(lh);
      res.write(nameBuf);
      // The write callback doubles as backpressure handling: the next
      // frame is only read once this one has actually been flushed.
      res.write(comp, function () { next(); });
    }
    next();
  });
}
// One click = every background film frame as a ZIP. Owner-only: it's a
// way to pull the full media set locally (Upscayl, previews, backups),
// and the frames travel as files, so the archive endpoint re-reads them
// from disk on demand instead of trusting any client-supplied paths.
app.get("/api/media/film-archive", rateLimit("filmzip", 30, 60 * 60 * 1000), async (req, res) => {
  if (!isAuthedAdmin(req)) return res.status(401).json({ error: "unauthorized" });
  const dir = (process.env.VOXEL_MEDIA_DIR || path.join(__dirname, "public", "media")) + path.sep + "film";
  let names;
  try { names = fs.readdirSync(dir).filter((n) => /^f\d{2}\.jpg$/.test(n)).sort(); } catch (e) { return res.status(404).json({ error: "no_film_frames" }); }
  if (!names.length) return res.status(404).json({ error: "no_film_frames" });
  res.setHeader("Content-Type", "application/zip");
  res.setHeader("Content-Disposition", 'attachment; filename="voxel-film-frames.zip"');
  res.setHeader("Cache-Control", "no-store");
  try {
    await streamZip(res, names.map(function (n) { return { name: n, path: path.join(dir, n) }; }));
  } catch (e) {
    console.error("film archive failed:", e);
  }
});
app.use("/api", (req, res) => {
  res.status(404).json({ error: "not_found" });
});

app.use(express.static(path.join(__dirname, "public"), {
  // Never serve dotfiles (.env, .git internals, etc.) even if one is
  // ever accidentally dropped into public/.
  dotfiles: "ignore",
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
  res.setHeader("Cache-Control", "no-cache");
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

  // Warm the in-memory raw-doc cache for the keys visitors load first,
  // so the very first request doesn't eat a cold Atlas read on top of
  // the platform waking the instance. Seeds above already touched each
  // key once; this is an explicit belt-and-braces pull to guarantee the
  // cache is full before we start accepting requests.
  for (const k of ["voxel-catalog", "voxel-settings", "voxel-content"]) {
    try { await storageGet(k); } catch (e) { /* best-effort warm */ }
  }

  // Warm the admin session cache from the persisted map so sessions
  // granted before a restart/redeploy keep working (see note above).
  await loadSessions();

  const server = app.listen(PORT, "0.0.0.0", () => {
    console.log(`Voxel is running on port ${PORT}`);
  });

  // Graceful shutdown: Render sends SIGTERM on every deploy/restart.
  // Without this, in-flight requests (an owner mid-save, a customer
  // mid-order) are dropped mid-write. Stop accepting NEW connections,
  // give live ones up to 10s to finish, then exit cleanly.
  let shuttingDown = false;
  function shutdown(signal) {
    if (shuttingDown) return;
    shuttingDown = true;
    console.log(signal + " received — finishing in-flight requests…");
    server.close(function () {
      console.log("Clean shutdown complete.");
      process.exit(0);
    });
    // Hard deadline: a hung socket must not block the redeploy forever.
    setTimeout(function () {
      console.log("Shutdown deadline reached — exiting.");
      process.exit(0);
    }, 10000).unref();
  }
  process.on("SIGTERM", function () { shutdown("SIGTERM"); });
  process.on("SIGINT", function () { shutdown("SIGINT"); });

  // Unexpected promise rejections are logged with full context (they
  // usually mean a database blip) but don't kill the server — the
  // promise chains that matter already handle their own failures.
  process.on("unhandledRejection", function (reason) {
    console.error("Unhandled promise rejection:", reason);
  });
  // An uncaught exception means unknown program state: log it and exit
  // so the platform restarts a clean process instead of limping along.
  process.on("uncaughtException", function (err) {
    console.error("Uncaught exception — exiting:", err);
    process.exit(1);
  });
}

start().catch((err) => {
  console.error("Failed to start:", err);
  process.exit(1);
});
