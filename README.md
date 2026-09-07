# Axom Relief

Flood relief helpline for Assam — "Axom stands together". React (Vite) + Supabase.

This repository contains a bilingual (English/Assamese) public site to request rescue or register as a rescuer, an illustrated relief map, and an admin dashboard backed by Supabase.

Key features
- Public request form + rescuer registration
- Admin dashboard (manual admin creation in Supabase)
- Interactive map with markers (react-leaflet + OpenStreetMap tiles)
- Client-side anti-spam: honeypot field + Cloudflare Turnstile widget
- Supabase for database and Auth; RLS controls writes

Quick setup
1. Clone

```
git clone https://github.com/Tinku785/axomRelief.git
cd axomRelief
```

2. Install

```
npm install
```

3. Supabase
- Create a project at https://supabase.com
- Run the schema migration: open the SQL editor in your Supabase dashboard and paste the contents of `supabase/migrations/0001_init.sql`, or via the CLI:

```
supabase link --project-ref <your-project-ref>
supabase db push
```

- Optional demo data (matches the design prototype's sample requests/helpers/helplines/news): run `supabase/seed.sql` (or use `supabase/migrations` seed step as needed).
- Create an admin account manually in Supabase: Dashboard → Authentication → Users → Add user (there is no public admin signup).

4. Environment variables

Copy and edit the example env file:

```
cp .env.example .env.local
```

Fill in the following keys in `.env.local`:
- VITE_SUPABASE_URL — from Supabase Project → Settings → API
- VITE_SUPABASE_ANON_KEY — from Supabase Project → Settings → API
- VITE_FORMSPREE_FORM_ID — Formspree form id (used by footer feedback form)
- VITE_TURNSTILE_SITE_KEY — Cloudflare Turnstile site key (leave blank in development; app falls back to the public test key)

Without the Supabase vars set the app will still render but show "Backend not configured" where it would read/write data.

5. Run locally

```
npm run dev
```

6. Build / Deploy

```
npm run build
npm run preview
```

Deploy to Vercel (recommended): set the same environment variables in the Vercel project settings and run `vercel deploy`.

Important notes
- Map tiles: OpenStreetMap tiles are used (no key required). OSM requires attribution — the app sets this automatically.
- Anti-spam: honeypot + Turnstile exist client-side; there is currently no server-side Edge Function enforcement in this repo (RLS still governs database writes).
- Admin access: admin accounts must be created via Supabase dashboard and are the only way to access /admin.

Where to look in the code
- src/main.jsx — app bootstrap and providers
- src/App.jsx — routes and top-level shell
- src/supabaseClient.js — supabase client wiring and placeholder fallback
- src/components/ReliefMap.jsx — map logic (fit-to-markers, focus, popup UX, copy coords)
- src/pages/RequestForm.jsx — public request form
- src/pages/AdminDashboard.jsx — admin tools
- supabase/ — migration and seed SQL

Contact / Contributing
- If you contribute, follow the existing code style (Vite + React) and run `npm run lint`.

