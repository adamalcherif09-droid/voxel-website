# Voxel

A 3D print shop website with a built-in owner dashboard.

## Where the data is stored — and why it matters where you host this

This site needs somewhere to permanently store the catalog, settings,
and inquiries so every visitor sees the same thing. It checks for a
place to store that data in this order:

1. **`MONGODB_URI` set** → uses MongoDB Atlas's free-forever database
   (see below). Use this when hosting anywhere that ISN'T Replit —
   Render, for example — since those hosts don't keep a persistent
   disk on their free plans, but this database does, independently.
2. **`REPLIT_DB_URL` set** → uses Replit's own built-in database.
   Replit sets this automatically, so nothing to configure.
3. **Neither** → falls back to a local file (`data/store.json`), only
   so the site still works for testing on your own computer. On a
   host with no persistent disk, this option means your data can be
   wiped on every restart — don't rely on it for a real launch.

## Option A: Running this on Replit (data stored on Replit)

1. Import this whole folder into a new Replit project (Node.js template).
2. Click the **Run** button. That's it — Replit will install what it
   needs automatically the first time.
3. Replit will give you a web address for your site. That's the link
   to share with customers.

## Option B: Running this on Render, free, with MongoDB Atlas for storage

1. Push this project to a GitHub repo, then create a free Web Service
   on Render pointing at it (Build Command: `npm install`, Start
   Command: `node server.js`).
2. Separately, make a free account at cloud.mongodb.com, create a
   free "M0" cluster, create a database user, and get its connection
   string (looks like `mongodb+srv://user:password@cluster0...`).
3. In Render, go to your service → **Environment** → add an
   environment variable named `MONGODB_URI` with that connection
   string as the value. Redeploy.
4. Your catalog, settings, and inquiries now live in MongoDB Atlas —
   free, and they survive Render's free tier spinning down.

## Making changes later — two very different kinds

**Changes to your catalog, prices, photos, text on the page, contact
info, colors of nothing — anything you can already do from the owner
dashboard:** just do it there, on the live site. It saves straight to
the database and shows up immediately for everyone. No file, no
GitHub, no redeploying — this covers the vast majority of day-to-day
changes (new models, new prices, editing the hero text, etc).

**Changes to how the site actually works or looks structurally**
(the kind that need editing the code itself — like this update did):
1. Get the updated files (from me, or wherever you're making the edit).
2. Go to your GitHub repo → open the file that changed → click the
   pencil/edit icon (or use "Upload files" to overwrite it) → commit.
3. Render watches that repo and redeploys automatically within a
   minute or two of any commit — you don't need to touch Render at
   all for this part. Just refresh the site once the deploy finishes.

If you're ever unsure which kind of change something is, just ask —
it's usually obvious ("change the price of this model" = dashboard;
"change how the order button works" = code).

## Getting into the owner dashboard

Click your business name in the footer 5 times quickly, enter the
shape combination, then the passcode. All three of those (how many
clicks, the shapes, and the passcode) can be changed from inside the
dashboard once you're in — Dashboard → Settings.

## What's in each file

- **server.js** — the small backend. Serves the website and stores
  everything (catalog, settings, inquiries) in one shared place.
- **package.json** — what this project needs installed (Express,
  Replit's database tool, and the MongoDB driver).
- **public/index.html** — the page that loads everything else.
- **public/styles.css** — colors, fonts, spacing, layout.
- **public/js/icons.js** — the small icons used throughout the site.
- **public/js/helpers.js** — shared settings and small utility
  functions (formatting prices, building WhatsApp links, etc).
- **public/js/components-common.js** — small reusable pieces (buttons,
  the loading screen).
- **public/js/components-customer.js** — everything a customer sees:
  the header, the shop pages, the "order now" popups.
- **public/js/components-admin.js** — everything in your dashboard:
  the login screen, catalog editor, content editor, settings.
- **public/js/app.js** — ties everything together and starts the site.

## Running it on your own computer (optional)

If you ever want to test changes before they're live:

```
npm install
npm start
```

Then open `http://localhost:3000`. With no `MONGODB_URI` or
`REPLIT_DB_URL` set, it saves everything to a local file instead —
that's just for testing.
