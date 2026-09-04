# VOXEL — Custom 3D Printing

Shop site: catalog of ready-to-print designs + custom print orders, with an owner dashboard (footer entry → shape combination → passcode).

## Stack

- Plain HTML/CSS/JS — React **self-hosted from `public/vendor/`** (pinned versions;
  the site loads zero third-party scripts). The JSX sources in `public/js/` are
  **pre-compiled** by `compile-jsx.js` into `*.compiled.js` (no Babel in the
  browser anymore — this removed a 2.9 MB download and a per-visitor compile step)
- Express backend (`server.js`), data in MongoDB Atlas (`MONGODB_URI`)
- Tailwind utilities pre-built into `public/tailwind.css` (regenerate via `tailwind.config.js` if classes change)
- Deploys on Render (auto-deploys from this repo)

## Required environment variable

- `MONGODB_URI` — the MongoDB Atlas connection string. **Must be set in the
  Render dashboard before real products are added**: without it the server
  falls back to a local file on Render's ephemeral disk, and every deploy or
  restart wipes the catalog, inquiries, and settings. (Free M0 tier is plenty.)

## Editing the app code

The files in `public/js/*.js` are the JSX sources; the browser only executes
their compiled versions (`*.compiled.js`). After editing any of them:

1. Run `node compile-jsx.js` (or `npm run compile`) in this folder — it
   re-transforms all six files with the same options the old in-browser
   Babel used (`react` preset, `runtime: "classic"`).
2. Bump the `?v=1` cache-busters on the `<script>` tags in `public/index.html`
   (e.g. `?v=2`) so repeat visitors get the new files immediately.
3. Commit and push — Render redeploys automatically.

## Deploying on Render

- Build command: none needed (`npm install` runs automatically); Start command: `npm start`
- Add `MONGODB_URI` under Environment (see above)
- Health check path: `/api/health`
- Optional: an UptimeRobot (free) HTTP monitor pinging the site every 10 min
  keeps the free instance from sleeping, so the first visitor after 15 idle
  minutes doesn't wait ~30–60 s for a cold start.

## Security model (short version)

- The hidden dashboard door = footer clicks → **shape combination** → passcode.
  The combination is stored server-side only and verified by `/api/gate`; it is
  never present in any API response. The passcode is verified server-side
  (PBKDF2, never shipped to browsers) and both are required together by `/api/auth`.
- Discord webhook URL lives server-side only; customers trigger notifications
  indirectly through `/api/inquiries`, and the dashboard test button uses the
  admin-only `/api/admin/test-ping`. There is no public relay endpoint.
- Writes to shop data require an admin session token; customer inquiries are
  append-only through a sanitized public endpoint.


## Media credits

- `public/media/film/f00–f63.jpg` — frames extracted from a Bambu Lab printer time-lapse by
  **Borillion**, from the
  [bambu-timelapse-dataset](https://huggingface.co/datasets/v2thegreat/bambu-timelapse-dataset),
  licensed **CC BY 4.0**. Recompressed for web (the original mp4 was replaced by these
  frames so scrolling can scrub the print without video-seek lag).
