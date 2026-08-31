# VOXEL — Custom 3D Printing

Shop site: catalog of ready-to-print designs + custom print orders, with an owner dashboard (footer entry → shape combination → passcode).

## Stack

- Plain HTML/CSS/JS — React + Babel **self-hosted from `public/vendor/`** (pinned
  versions; the site loads zero third-party scripts), JSX transformed in-browser (no build step)
- Express backend (`server.js`), data in MongoDB Atlas (`MONGODB_URI`)
- Tailwind utilities pre-built into `public/tailwind.css` (regenerate via `tailwind.config.js` if classes change)
- Deploys on Render (auto-deploys from this repo)

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
