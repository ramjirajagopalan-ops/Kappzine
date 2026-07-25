# Kappzine

A self-hosted flipbook web app for wedding and family albums — a realistic
page-turning viewer (drag any corner, or click the arrows) plus a full admin
dashboard for managing albums, pages, themes, password protection, and
clickable video/audio/link hotspots.

## Stack

- **Next.js 14** (App Router) + TypeScript + Tailwind CSS
- **[page-flip](https://github.com/Nodlik/StPageFlip)** — the realistic page-turn
  engine, bundled locally from npm (no CDN dependency — see "Why the original
  prototype was blank" below)
- **Prisma** + SQLite by default (swap to Postgres for Vercel — see below)
- **sharp** for image processing (auto-resize + convert to WebP on upload)
- Page-turn sound is synthesized on the fly with the Web Audio API — no
  audio asset to ship or license
- Local-disk file storage by default, or **Vercel Blob** automatically when
  `BLOB_READ_WRITE_TOKEN` is set

## Getting started

```bash
npm install
cp .env.example .env   # edit ADMIN_PASSWORD and AUTH_SECRET
npm run db:push        # create the SQLite database from prisma/schema.prisma
npm run db:seed        # optional: adds a sample "Alex & Priya" album
npm run dev
```

Visit `http://localhost:3000` for the public site and `/admin` for the
dashboard (password is whatever you set as `ADMIN_PASSWORD`).

## Features

**Viewer**
- Realistic drag-to-flip page physics, hard covers, single/double-page modes
- 5 built-in themes (Classic Brass, Blush Romance, Midnight Navy, Ivory
  Minimal, Botanical Green)
- Page-turn sound toggle, fullscreen mode, keyboard/click navigation
- Clickable hotspots on any page that open a video, play audio, or open a link
- Optional password gate per album

**Admin dashboard** (`/admin`)
- Create/delete albums, upload photos (drag files in, they're auto-resized
  and converted to WebP)
- Drag-and-drop page reordering, per-page captions and hard/soft cover toggle
- Visual overlay editor — click and drag directly on a page thumbnail to
  place a video/audio/link hotspot, drag to move it, drag its corner to
  resize
- Per-album settings: theme, hard covers, aspect ratio, default page mode,
  default sound setting, published/draft, password protection
- Live preview tab using the same viewer component as the public site

## Project layout

```
prisma/schema.prisma        Album / Page / Overlay data model
src/lib/                    prisma client, auth (admin + per-album passwords),
                             storage abstraction, shared types/validation
src/components/FlipBook.tsx React wrapper around the page-flip engine
src/components/admin/       Page manager, settings form, overlay editor
src/app/album/[slug]/       Public viewer (+ password gate)
src/app/admin/              Admin dashboard + album editor
src/app/api/                Route handlers (admin-only under /api/admin,
                             public under /api/public)
src/middleware.ts           Guards /admin and /api/admin with a signed cookie
```

## Deploying

### Self-hosted (Docker) — recommended default

```bash
cp .env.example .env   # set ADMIN_PASSWORD and AUTH_SECRET
docker compose up -d --build
```

This persists the SQLite database and uploaded photos in named Docker
volumes, so they survive rebuilds/upgrades. Put a reverse proxy (Caddy,
nginx, Tailscale, etc.) in front for HTTPS.

### Vercel

Vercel's serverless functions have a read-only, ephemeral filesystem, so two
defaults need to change:

1. **File storage** — add a [Vercel Blob](https://vercel.com/docs/storage/vercel-blob)
   store and set `BLOB_READ_WRITE_TOKEN`. `src/lib/storage.ts` automatically
   switches to Blob storage the moment that env var is present — no code
   changes needed.
2. **Database** — SQLite's on-disk file won't persist across deploys/regions.
   Provision a hosted Postgres (Vercel Postgres, Neon, Supabase, etc.), then:
   - In `prisma/schema.prisma`, change `provider = "sqlite"` to
     `provider = "postgresql"`.
   - Set `DATABASE_URL` to the Postgres connection string in the Vercel
     project's environment variables.
   - Run `npx prisma db push` once locally against that `DATABASE_URL` (or
     wire up a migration step in your deploy pipeline) to create the schema.

Then set `ADMIN_PASSWORD` (or `ADMIN_PASSWORD_HASH`) and `AUTH_SECRET` in the
Vercel project settings and deploy as a normal Next.js app.

## Why the original prototype was blank

The single-file prototype loaded its page-flip engine and Tailwind from two
CDN `<script>` tags with no local fallback. In any environment where those
specific CDN hosts are unreachable — a corporate firewall, an offline demo,
a locked-down sandbox — `window.St.PageFlip` never exists, the script's own
guard trips, and the page renders with no images and no drag, exactly as
reported. This was confirmed by actually loading the prototype in a headless
Chromium via Playwright: with the CDN calls blocked, it reproduced the blank
page + console errors; vendoring the identical `page-flip@2.0.7` build
locally fixed it immediately, verified visually (cover render, page turns,
double-page spread, and corner-drag fold physics all confirmed in
screenshots). This project bundles `page-flip` as a normal npm dependency and
builds Tailwind via PostCSS, so it has no CDN dependency at all.

## Notes on scope

This is a personal-scale project (single admin, SQLite by default) rather
than a multi-tenant SaaS. Auth is a single shared admin password rather than
per-user accounts; album passwords are a simple shared-secret gate, not a
guest list. Both are intentional simplifications for a self-hosted family
album tool — see `src/lib/auth.ts` if you want to extend either.
