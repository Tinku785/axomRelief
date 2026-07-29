import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabaseConfigured = Boolean(url && anonKey);

if (!supabaseConfigured) {
  console.warn(
    'Axom Relief: VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY are not set. ' +
    'Copy .env.example to .env.local and fill them in, then run the migration ' +
    'in supabase/migrations before the app can read or write real data.'
  );
}

// A dummy but well-formed URL keeps supabase-js from throwing at import time
// when the env vars are missing, so the rest of the app can render and show
// a clear "not configured" message instead of a blank crash.
export const supabase = createClient(
  url || 'https://placeholder.supabase.co',
  anonKey || 'placeholder-anon-key'
);
