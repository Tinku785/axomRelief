# Axom Relief

Flood relief helpline for Assam — "Axom stands together". React (Vite) + Supabase.

Implements the design in `../project/AxomRelief.dc.html` (Claude Design export) pixel-for-pixel:
green/white with orange call-to-action accents, bilingual English/Assamese toggle,
district-based location, request/rescuer forms, an illustrated relief map, and an
admin dashboard — backed by a real Supabase database instead of in-browser state.

## 1. Install

```
npm install
```

## 2. Set up Supabase

1. Create a project at [supabase.com](https://supabase.com).
2. Run the schema migration: open the SQL editor in your Supabase dashboard and paste
   the contents of `supabase/migrations/0001_init.sql`, or via the CLI:
   ```
   supabase link --project-ref <your-project-ref>
   supabase db push
   ```
3. Optional demo data (matches the design prototype's sample requests/helpers/helplines/news):
   run `supabase/seed.sql` the same way.
4. Create an admin account manually: Supabase dashboard → Authentication → Users → Add user.
   There is no public sign-up — this is the only way to get an admin login.

## 3. Configure environment variables

```
cp .env.example .env.local
```

Fill in:
- `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` — Settings → API in your Supabase project.
- `VITE_FORMSPREE_FORM_ID` — from `https://formspree.io/f/<form-id>`, used by the footer's
  Feedback form.
- `VITE_TURNSTILE_SITE_KEY` — from the Cloudflare dashboard, used on the request form's bot
  check. Leave blank in development: it falls back to Cloudflare's public test key, which
  always passes.

Without these, the app still runs and renders every screen, but shows a
"Backend not configured" message wherever it would otherwise read or write data.

## 4. Run

```
npm run dev
```

## 5. Deploy

Designed to deploy on Vercel (`vercel deploy`) — set the same env vars as project
Environment Variables in the Vercel dashboard.

## Notes on scope

- The relief map (embedded strip + full-screen pan/zoom overlay) is the same hand-drawn
  SVG illustration used in the design prototype, not a real Leaflet/OpenStreetMap map —
  this matches the final design direction from the Claude Design chat transcript rather
  than the earlier (superseded) build-prompts.md, which called for real map tiles.
- Anti-spam: both public write forms (request + rescuer registration) have an off-screen
  honeypot field, and the request form has a live Cloudflare Turnstile widget. None of this
  is re-enforced server-side yet (no Edge Function) — Supabase RLS controls what each form
  can write, but the honeypot/Turnstile checks themselves are client-side only.
