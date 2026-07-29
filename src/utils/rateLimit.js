// The insert trigger in migration 0003 raises this when a client IP has burned
// its quota. Postgres surfaces it as a plain P0001 error, so match on the text.
export function isRateLimited(err) {
  return String(err?.message ?? '').includes('rate_limit_exceeded');
}
