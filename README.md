# CapCare+ — full-stack build

This is the original CapCare+ frontend (React + Vite + TypeScript, the mushroom-themed
allergy/symptom tracker) wired to a real backend: an Express API backed by SQLite
(via Node's built-in `node:sqlite`, so no native module compilation is ever required),
plus a working camera barcode scanner that looks products up on Open Food Facts.

One important note up front: `barcode_scannner_prompt.txt` in the project asked for the
backend to be built in **Python + Flet**, on the assumption the existing app was a Flet
app. The actual project here is a **React/Vite web app** (Figma Make export) — there is
no Flet UI to hook into. So the barcode scanner's *behavior* was implemented exactly as
specified (rear camera, live barcode detection, Open Food Facts v3 lookup with the exact
fallback rules, SQLite history, no duplicate spam, graceful error handling, "Scan Again")
but in the stack that matches the real frontend: the browser's camera via a JS barcode
reader, and a Node/Express + SQLite backend instead of Flet/Python. The existing scanner
UI itself (the "Barcode" tab already in the Allergy Scanner screen) was left untouched —
only its behavior went from a canned mock to a real scan.

## What's here

```
capcare/
  client/          React + Vite + TypeScript frontend (the original UI, untouched visually)
  server/          Express API + SQLite database
  package.json     Root scripts that build the client and run everything as one app
```

Every screen's data (login, profile, symptom log, personal notes, allergy scan history,
barcode scan history) is stored in a real SQLite-compatible database on the server, not
just the browser's local storage. In production that's [Turso](https://turso.tech) (libSQL);
locally it falls back to a plain SQLite file (`server/data/capcare.db`) with zero setup. `localStorage` is still
used as a fast local cache so the UI feels instant, but the server is the source of truth.

## Prerequisites

- **Node.js 20.6 or newer** (check with `node -v`).
- A camera-equipped phone (or laptop) to test the barcode scanner.

## 1. Install

From the `capcare/` folder:

```bash
npm run install:all
```

This installs both `server/` and `client/` dependencies.

## 2. Run it (frontend + backend together, one command)

```bash
npm start
```

This builds the React frontend and starts the Express server on port 4000, serving
**both** the API and the built app from the same process — open
`http://localhost:4000` in a browser and the whole app works.

(For active development with hot-reload instead, run `npm run dev` — this starts the
API on port 4000 and a separate Vite dev server on port 5173 that proxies `/api` calls
to it. Use `http://localhost:5173` while developing.)

## 3. Run it on your phone

The barcode scanner needs the phone's camera, and browsers only grant camera access on
a "secure context" — `https://` or `localhost`. A plain `http://192.168.x.x:4000` LAN
address will **not** be allowed to use the camera (everything else in the app still works
fine over plain HTTP on your LAN — login, symptom tracker, notes, OCR-mode allergy scan).
So the barcode scanner specifically needs one of the two options below; option A is the
quickest.

### Option A — HTTPS tunnel (works from anywhere, easiest, camera works)

1. On your computer, in the `capcare/` folder, start the app:
   ```bash
   npm start
   ```
2. In a second terminal, run a tunnel (no account needed):
   ```bash
   npx localtunnel --port 4000
   ```
   It prints a URL like `https://short-name-1234.loca.lt`.
3. On your phone, open that `https://` URL in Chrome (Android) or Safari (iPhone).
   The first visit may show a localtunnel interstitial page — tap "Click to Continue".
4. Sign up, open **Allergy Tracker → Barcode**, tap **Tap to Scan**, and allow camera
   access when prompted. Point the rear camera at a real product barcode (EAN-13/UPC-A,
   e.g. any packaged food item) — it will look the product up on Open Food Facts live.

(If you'd rather use ngrok: `npx ngrok http 4000` works the same way.)

### Option B — Same Wi-Fi network (LAN, no camera, everything else works)

1. Find your computer's LAN IP address:
   - **Windows**: `ipconfig` → look for "IPv4 Address" under your active adapter.
   - **Mac**: System Settings → Wi-Fi → Details → IP Address (or `ifconfig | grep inet`).
2. Start the app: `npm start`.
3. Make sure your phone is on the **same Wi-Fi network**.
4. On the phone, open `http://<your-computer-IP>:4000` (e.g. `http://192.168.1.42:4000`).
5. Everything works except the barcode camera (blocked by the browser as an insecure
   origin) — the rest of the app (auth, symptom tracker, notes, OCR-mode scan) is fully
   usable this way.

### Install it like an app (either option)

Once you have the app open on your phone in a `https://` context (Option A):
- **Android/Chrome**: tap the menu (⋮) → "Add to Home screen" / "Install app".
- **iPhone/Safari**: tap the Share icon → "Add to Home Screen".

It will use the CapCare+ mushroom icon and open full-screen like a native app.

## Deploy to Vercel (with Turso)

The repo's `vercel.json` deploys `client/` (Vite) and `server/` (Express) as two services,
with `/api/*` routed to the server.

1. **Create the database** (once):
   ```
   turso db create capcare
   turso db show capcare --url        # -> TURSO_DATABASE_URL  (libsql://...)
   turso db tokens create capcare     # -> TURSO_AUTH_TOKEN    (a *database* token)
   ```
   A Turso account-level *platform API token* will not work as `TURSO_AUTH_TOKEN`.
2. **Set environment variables** in Vercel (Project -> Settings -> Environment Variables):
   `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN`, `JWT_SECRET` (e.g. `openssl rand -hex 32`;
   the server refuses to start in production without it), and optionally `GNEWS_API_KEY`.
3. **Deploy**: import the repo in Vercel, or run `vercel --prod`.

Tables are created automatically on the first request. To copy existing local data into
Turso: `sqlite3 server/data/capcare.db .dump > dump.sql`, remove the `BEGIN TRANSACTION;`
/ `COMMIT;` lines, then `turso db shell capcare < dump.sql`.

## Backend overview

- `POST /api/auth/signup`, `POST /api/auth/login` — accounts, JWT session tokens.
- `GET/PUT /api/profile` — name, age, weight, height, allergen list.
- `GET/POST/DELETE /api/symptoms` — the Symptom Tracker log.
- `GET/POST/DELETE /api/notes` — personal notes (Home screen).
- `GET/POST /api/scans` — the OCR/label allergy-scan history.
- `GET /api/barcode/:code` — looks a barcode up (cached in SQLite, refreshed every 12h),
  applies the exact Open Food Facts fallback rules from the spec (name → name_en →
  "Unknown product"; description → generic_name → generic_name_en →
  abbreviated_product_name → "Description not available"; ingredients → ingredients_text
  → ingredients_text_en → structured `ingredients` array → "Ingredients not available in
  Open Food Facts"; every nutrient falls back to `"N/A"` rather than guessing), cross-checks
  the result against the signed-in user's saved allergens, and records/updates one row per
  user+barcode in `scanned_foods` (rescanning the same product updates it, never duplicates).
- `GET /api/barcode/history/list` — that user's barcode scan history.

`server/test-barcode-offline.js` is a small self-contained check that stubs a realistic
Open Food Facts response and verifies the fallback chains, nutrient parsing, SQLite
caching, dedupe, and allergen cross-check all behave correctly — useful if you ever touch
`server/routes/barcode.js`. Run it with `node test-barcode-offline.js` from `server/`.
Safe to delete if you don't want it.

## Notes on what changed vs. the original design files

- The visual design of every screen is unchanged — same mushroom art, same colors, same
  animations. Only the data layer changed: screens now call the backend (see
  `client/src/api.ts`) instead of only writing to `localStorage`.
- The Allergy Scanner's existing "Barcode" mode now does a real scan (via the browser's
  camera and the `@zxing/browser` barcode reader) instead of a 2.4s canned animation.
  "OCR" mode is unchanged (still a UI mock, since no OCR engine was requested/available).
- A PWA manifest + home-screen icons were added (drawn from the app's own mushroom mark)
  so the app can be "installed" to a phone's home screen.

## Team
- [@sanaa1020](https://github.com/sanaa1020)
