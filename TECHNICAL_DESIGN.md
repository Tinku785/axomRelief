# Technical Design Document

## Purpose
This document describes the technical architecture, component responsibilities, data flows, and operational considerations for Axom Relief — a bilingual flood-relief helpline web app for Assam. It is intended for developers, maintainers, or system designers who will extend, deploy, or operate the application.

## Goals
- Provide a lightweight, resilient public site where people can request help and rescuers can register.
- Keep the public surface read/write behavior safe using Supabase RLS and simple client-side anti-spam measures.
- Make the map and list UX highly usable on phones in low-bandwidth situations.
- Deploy easily to serverless platforms (Vercel recommended).

## High-level architecture

- Frontend: React + Vite. Single-page application served as static assets. React Router handles routes (/ , /request, /helping, /admin, etc.).
- Data & Auth: Supabase (Postgres + Auth + RLS) stores requests, helper registrations, helplines and news. Admin users are Supabase Auth users created in the dashboard.
- Map: react-leaflet + OpenStreetMap tiles for location display; small custom divIcon pins to avoid CDN-sprite problems under bundlers.
- External services: Cloudflare Turnstile (client-side bot check), Formspree (feedback form in footer).
- Hosting: Vercel recommended for static frontend deployment; environment variables set in Vercel UI.

Mermaid: system architecture (copy into a renderer to visualize)

```mermaid
flowchart LR
  Browser[User's browser (React SPA)] -->|HTTP(S) static files| CDN[Vercel CDN]
  Browser -->|Supabase JS (anon key)| Supabase[Supabase (Postgres + Auth + RLS)]
  Browser -->|Tiles| OSM[OpenStreetMap Tile Servers]
  Browser -->|Turnstile widget| Cloudflare[Cloudflare Turnstile]
  Browser -->|Formspree POST| Formspree[Formspree]
  Admin[Admin user] -->|Auth (Supabase)| Supabase
```

## Component responsibilities
- src/main.jsx: application bootstrapping, React contexts (Lang, Auth, FooterData).
- src/App.jsx: route configuration and top-level shell (Header, Footer, Admin route handling).
- src/supabaseClient.js: creates Supabase client from VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY. Uses safe placeholders if env not configured.
- src/context/LangContext.jsx: bilingual toggle (English / Assamese) and translation getter used across UI.
- src/components/ReliefMap.jsx: all map behaviors — tile layer attribution, fit-to-markers, focus-on-point behavior, custom pin icons, popup content (phone links, open-in-maps, copy coords), ResizeObserver handling.
- src/pages/RequestForm.jsx: public request submission flow, honeypot field, Turnstile widget, validation, client-side submit to Supabase.
- src/pages/AdminDashboard.jsx: admin-only tools to view and manage requests, helpers, helplines, news.

## Data model (conceptual)
The repository includes migrations (supabase/migrations). Conceptually the schema includes:
- requests: id (uuid), created_at, name, phones, district, lat, lng, title/description, status
- helpers (rescuers): id (uuid), created_at, name, phones, district, equipment, availability
- helplines: id, name, phone, description
- news: id, title, body, published_at
- users: Supabase Auth users used for admin login

Note: The exact column names/types live in `supabase/migrations/0001_init.sql`. Use those when importing sample data.

## Authentication & Authorization
- Admins are Supabase Auth users; there is no public admin signup flow. Create admin users in Supabase dashboard.
- Public writes (requests, helper signups) are controlled via Postgres Row-Level Security (RLS) policies in Supabase. RLS configuration is in the migrations file.

## Anti-spam and validation
- Client-side anti-spam: a hidden honeypot input and Cloudflare Turnstile widget on the request form.
- Important: honey pot / Turnstile checks are currently client-only. For production-grade protection, verify Turnstile on the server (Edge Function) and enforce honeypot at server-side before writing to DB.

## Map UX & performance considerations
- Use OpenStreetMap tiles (no API key). Always include the required attribution.
- Fit-to-markers uses map.fitBounds with a MAX_FIT_ZOOM to avoid zooming to an alley when a single marker exists.
- Focus-on-point uses map.setView and opens the marker popup to avoid animation race conditions in React.
- The map uses a small custom divIcon instead of CDN PNG sprites to avoid bundler path issues.
- ResizeObserver invalidates the map size and re-fits bounds for modal expand and phone rotation.

## Operational notes
- Environment variables required at runtime (frontend build): VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, VITE_FORMSPREE_FORM_ID, VITE_TURNSTILE_SITE_KEY.
- In development, leaving VITE_TURNSTILE_SITE_KEY blank falls back to Cloudflare's public test key which always passes the check; do not use the test key in production.
- The app gracefully degrades when Supabase envs are missing: frontend renders with a clear "Backend not configured" message.

## Deployment checklist
- Create Supabase project and run migrations (supabase/migrations/0001_init.sql).
- Seed optional demo data (supabase/seed.sql or supabase/sample_data.sql).
- Set environment variables in Vercel: VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, VITE_FORMSPREE_FORM_ID (optional), VITE_TURNSTILE_SITE_KEY.
- Ensure OSM attribution rendering on your deployed domain.

## Extensibility suggestions
- Server-side Turnstile verification: implement an Edge Function or server endpoint to validate tokens before writing publicly-provided data.
- Monitoring: add Sentry or similar for client errors and log submission failures.
- Offline / resilience: consider saving a local copy of a request in IndexedDB when network fails, then retry.

## Diagrams
See docs/DIAGRAMS.md for editable Mermaid snippets and rendered guidance.

