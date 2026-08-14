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

var ALLOWED_FILE_EXTENSIONS = [".stl", ".3mf", ".step", ".stp", ".obj"];
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

// One-way hash so the passcode itself is never stored anywhere.
function sha256(str) {
  return crypto.subtle.digest("SHA-256", new TextEncoder().encode(str)).then(function (buf) {
    return Array.from(new Uint8Array(buf)).map(function (b) { return b.toString(16).padStart(2, "0"); }).join("");
  });
}

var DEFAULT_SECURITY = {
  triggerClicks: 5,
  combo: ["circle", "triangle", "square", "diamond"],
  // SHA-256 of "voxel-owner" — change the passcode from Settings once inside.
  passcodeHash: "dd079e3843773940e2221bed4328afe8ed5f3057b13e9e9388d07c9f8145a6fc",
};

var DEFAULT_SETTINGS = {
  webhookUrl: "",
  security: DEFAULT_SECURITY,
};

/* ---------------------------------------------------------
   Storage — talks to this project's own small backend
   (server.js), which keeps everything in one shared place so
   every visitor sees the same catalog, prices, and settings,
   no matter which device or browser they're using.
--------------------------------------------------------- */
function storageGet(key) {
  return fetch("/api/storage/" + encodeURIComponent(key))
    .then(function (res) { return res.ok ? res.json() : { value: null }; })
    .then(function (data) { return data.value ? JSON.parse(data.value) : null; })
    .catch(function () { return null; });
}
function storageSet(key, value) {
  return fetch("/api/storage/" + encodeURIComponent(key), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ value: JSON.stringify(value) }),
  })
    .then(function (res) { return res.ok; })
    .catch(function () { return false; });
}

function makeId(prefix) {
  return prefix + "-" + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
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
        var maxDim = preserveAlpha ? 500 : 800;
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
        ctx.drawImage(img, 0, 0, width, height);
        // JPEG has no alpha channel — exporting a transparent image to JPEG
        // fills the transparent areas with black. PNG keeps transparency intact.
        resolve(preserveAlpha ? canvas.toDataURL("image/png") : canvas.toDataURL("image/jpeg", 0.72));
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
      var maxDim = preserveAlpha ? 500 : 800;
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
      ctx.drawImage(img, 0, 0, width, height);
      resolve(preserveAlpha ? canvas.toDataURL("image/png") : canvas.toDataURL("image/jpeg", 0.72));
    };
    img.onerror = function () { resolve(""); };
    img.src = dataUrl;
  });
}

function pingDiscord(webhookUrl, content) {
  if (!webhookUrl) return Promise.resolve();
  return fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ content: content }),
  }).catch(function () { /* best effort only, never blocks the flow */ });
}
