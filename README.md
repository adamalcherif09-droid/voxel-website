# VOXEL — Custom 3D Printing

Shop site: catalog of ready-to-print designs + custom print orders, with an owner dashboard (footer entry → shape combination → passcode).

## Stack

- Plain HTML/CSS/JS — React loaded from CDN, JSX transformed in-browser (no build step)
- Express backend (`server.js`), data in MongoDB Atlas (`MONGODB_URI`)
- Tailwind utilities pre-built into `public/tailwind.css` (regenerate via `tailwind.config.js` if classes change)
- Deploys on Render (auto-deploys from this repo)

## Media credits

- `public/media/x1c-print.mp4` — Bambu Lab printer time-lapse by **Borillion**, from the
  [bambu-timelapse-dataset](https://huggingface.co/datasets/v2thegreat/bambu-timelapse-dataset),
  licensed **CC BY 4.0**. Recompressed for web.
