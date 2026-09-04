/**
 * One-time JSX precompiler for the SECURE build.
 *
 * Why: the site used to ship babel.min.js (2.9 MB) to every visitor and
 * compile the six app files in their browser on every page load. This
 * script performs the exact same transform ONCE, at build time, with the
 * same preset options the browser pipeline used:
 *   presets: [["react", { runtime: "classic" }]]
 * runtime "classic" turns <Tags /> into React.createElement(...) calls,
 * which matches how React is loaded in index.html (plain script, not a
 * module). Output files are plain ES5-compatible JS — no Babel needed
 * at runtime anymore.
 *
 * Re-run this after editing any file in public/js (then bump the ?v=
 * cache-buster in index.html):
 *   node compile-jsx.js
 */
const fs = require("fs");
const path = require("path");
const babel = require("@babel/core");

const jsDir = path.join(__dirname, "public", "js");

// Same order index.html loads them — each file may reference the ones before it.
const files = [
  "icons.js",
  "helpers.js",
  "components-common.js",
  "components-customer.js",
  "components-admin.js",
  "app.js",
];

let failed = false;
for (const name of files) {
  const src = path.join(jsDir, name);
  const out = path.join(jsDir, name.replace(/\.js$/, ".compiled.js"));
  try {
    const result = babel.transformFileSync(src, {
      presets: [["@babel/preset-react", { runtime: "classic" }]],
      compact: false,
      comments: true,
      babelrc: false,
      configFile: false,
    });
    fs.writeFileSync(out, result.code, "utf8");
    const kb = (Buffer.byteLength(result.code, "utf8") / 1024).toFixed(1);
    console.log(`OK  ${name} -> ${path.basename(out)}  (${kb} KB)`);
  } catch (err) {
    failed = true;
    console.error(`FAILED ${name}: ${err.message}`);
  }
}
process.exit(failed ? 1 : 0);
