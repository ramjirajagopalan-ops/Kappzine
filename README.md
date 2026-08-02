# Kappzine

A self-hosted, Heyzine-style flipbook studio: upload a PDF, pick your
options, and get a realistic page-flip digital magazine you can share,
embed, or download — for internal/startup use, not resale. Storage lives on
local disk or your own Google Drive; no third-party SaaS lock-in.

## What's implemented

- **Realistic page-turn physics** — [StPageFlip](https://github.com/Nodlik/StPageFlip) (`page-flip` npm package), self-hosted, drag any corner / click / swipe / arrow keys.
- **PDF → flipbook pipeline** — pdfjs-dist + `@napi-rs/canvas` render every page to three raster tiers (thumbnail / low / high res WebP) and extract the text layer, all in a background worker so uploads don't block the web process.
- **Every creation option that matters**: render quality (draft/standard/high DPI), privacy (public / unlisted / password / private), single/double/auto page layout, RTL navigation, flip sound, hard covers, auto-flip slideshow with configurable delay, corner drag zones, background theme + accent color, and per-toolbar-button visibility toggles (TOC, thumbnails, download, share, print).
- **Reader features**: zoom overlay, thumbnail/table-of-contents rail, full-text search inside the book, fullscreen, autoplay, page-flip sound (synthesized, no external asset), share popover (copy link / WhatsApp / X / Facebook / email), print, PDF download.
- **Clickable page links (hotspots)** — a basic version: pick a page, a URL, and a fractional position/size; rendered as a clickable overlay in the viewer. (A drag-to-place visual editor is a natural next step, not built yet.)
- **Sharing**: public link, iframe embed snippet, downloadable QR code.
- **Analytics**: view count, download count, per-session max-page-reached and duration.
- **Storage abstraction**: `LocalDiskProvider` (default, zero setup) and `GoogleDriveProvider` (uploads into a dedicated "Kappzine Flipbooks" Drive folder using the narrow, non-sensitive `drive.file` OAuth scope — it only ever sees files this app creates, not your whole Drive). Swapping in S3-compatible/cheap object storage later just means adding another class that implements `StorageProvider` (`src/server/storage/types.ts`).
- **Auth**: Google OAuth (also grants Drive access) via Auth.js v5, plus an optional local dev-login (email/password from `.env`) so the whole app works before you've created Google OAuth credentials.

### Known limitations (by design, for now)

- Signing in with the local dev-login and later "connecting" Google Drive from Settings authenticates as a *separate* Google-identified account rather than linking to the same user — full multi-provider account linking wasn't built. If you want Google Drive storage, sign in with Google from the start.
- RTL support swaps navigation direction (arrow keys / prev-next buttons) but doesn't mirror the page-flip physics — good enough for controlling reading direction, not a full RTL page-turn simulation.
- Hotspots are numeric (x/y/width/height as fractions of the page), not a drag-and-drop placement UI.
- Print produces a simple print-friendly window of all page images, not a paginated layout with margins.

## Stack

Next.js 16 (App Router) + TypeScript + Tailwind v4, Prisma + PostgreSQL,
Auth.js v5, pdfjs-dist + `@napi-rs/canvas` + `sharp`, `page-flip`, `googleapis`.

## Running locally (without Docker)

1. **Postgres**: have a Postgres instance reachable; set `DATABASE_URL` in `.env` (copy `.env.example` first).
2. **Install & migrate**:
   ```bash
   npm install
   npx prisma migrate deploy
   ```
3. **Dev login** (so you can use the app before setting up Google OAuth): in `.env`, keep `ENABLE_DEV_LOGIN="true"` and set `DEV_LOGIN_EMAIL` / `DEV_LOGIN_PASSWORD` to whatever you want.
4. **Run the app and the worker** (two terminals):
   ```bash
   npm run dev       # Next.js app on :3000
   npm run worker    # background PDF-processing worker
   ```
5. Visit `http://localhost:3000`, sign in with the dev-login form, and create a flipbook.

## Running with Docker Compose (recommended for a VPS)

```bash
cp .env.example .env   # fill in AUTH_SECRET, Google creds, etc.
docker compose up -d --build
```

This starts Postgres, the Next.js app (`web`), and the background processing
worker (`worker`), all sharing a persistent `kappzine_storage` volume for
local-disk uploads. The `web` container runs `prisma migrate deploy`
automatically on startup.

## Google Cloud setup (for Google Sign-In + Drive storage)

Both "Sign in with Google" and Google Drive storage use the **same** OAuth
client — you only need to do this once.

1. Go to the [Google Cloud Console](https://console.cloud.google.com/) and create a new project (or reuse one).
2. **APIs & Services → Library**: enable the **Google Drive API**.
3. **APIs & Services → OAuth consent screen**:
   - User type: External (fine for personal/small-team use; you don't need to submit for verification since we only request the non-sensitive `drive.file` scope).
   - Add your own email as a test user if the app stays in "Testing" mode.
4. **APIs & Services → Credentials → Create Credentials → OAuth client ID**:
   - Application type: Web application.
   - Authorized redirect URI: `https://your-domain.example.com/api/auth/callback/google` (or `http://localhost:3000/api/auth/callback/google` for local dev).
5. Copy the generated **Client ID** and **Client secret** into `.env`:
   ```
   GOOGLE_CLIENT_ID="..."
   GOOGLE_CLIENT_SECRET="..."
   ```
6. Restart the app, sign in with Google, then go to **Settings** in the dashboard and switch the storage provider to "Google Drive".

## Environment variables

See `.env.example` for the full list with inline explanations:
`DATABASE_URL`, `AUTH_SECRET`, `NEXTAUTH_URL`/`APP_URL`, `GOOGLE_CLIENT_ID` /
`GOOGLE_CLIENT_SECRET`, `ENABLE_DEV_LOGIN` + `DEV_LOGIN_EMAIL` /
`DEV_LOGIN_PASSWORD`, `STORAGE_PROVIDER`, `STORAGE_LOCAL_ROOT`.

## Project structure

```
prisma/schema.prisma        Data model (Flipbook, Page, Hotspot, ViewEvent, ProcessingJob, ...)
src/server/auth.ts          Auth.js v5 config (Google + dev-login)
src/server/storage/         Storage abstraction (local disk / Google Drive)
src/server/pdf/processPdf.ts  PDF → raster tiers + text extraction (pdfjs-dist)
src/server/jobs/queue.ts    DB-backed processing queue (no Redis needed)
src/worker/index.ts         Standalone worker process that drains the queue
src/app/api/...             REST-ish route handlers (flipbooks, view, files, auth)
src/app/dashboard/...       Authenticated dashboard: list, create, settings, hotspots
src/app/f/[slug]/           Public flipbook viewer route
src/components/viewer/      FlipbookViewer (StPageFlip wrapper) + zoom + password gate
```
