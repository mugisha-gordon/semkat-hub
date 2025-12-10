# Semkat Hub — Futuristic Real Estate Super-App

Semkat Hub unifies listings, documentation, construction, financing, rentals, and immersive media into a single experience for buyers, agents, and admins. Branded with Semkat’s orange/sky palette and built for both local and international users.

## Stack
- Vite + React + TypeScript
- Tailwind + shadcn/ui
- React Router
- React Query
- Supabase (auth-ready)
- Three.js / @react-three/fiber (3D/360)

## Core Features
- Listings with filters, detail modals, and 3D/360 tour support.
- Explore feed (TikTok-style property videos).
- Auth with email/password (Supabase) and role metadata (user/agent/admin); protected admin route.
- Settings with light/dark/system theme toggle (persisted), notifications placeholders.
- Bottom futuristic status bar for primary nav.

## Branding
- Primary assets: `public/LOGO.svg`, `public/LOGO.ico`
- Favicons and manifest wired in `index.html` and `public/site.webmanifest`.

## Routes
- `/` Home
- `/properties` Listings
- `/services` Services hub
- `/agents` Agents
- `/explore` Video feed
- `/favorites` Saved
- `/notifications` Alerts
- `/settings` Appearance/notifications/locale
- `/auth` Login/Register
- `/admin` Admin dashboard (requires role `admin`)
- `*` Not Found

## Local Development
```bash
npm install
npm run dev
```

Set environment variables (create `.env`):
```
VITE_SUPABASE_URL=your_url
VITE_SUPABASE_PUBLISHABLE_KEY=your_key
```

## Theming
- Uses `next-themes` with light/dark/system.
- CSS variables in `src/index.css` & Tailwind tokens in `tailwind.config.ts`.

## Next Steps
- Wire Supabase tables for listings, favorites, notifications, video uploads, and agent approvals.
- Add map view with clustering and saved-search alerts.
- Add upload & moderation flow for Explore feed.
