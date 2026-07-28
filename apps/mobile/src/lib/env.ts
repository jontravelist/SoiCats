// Centralised env reader. All public values come from EXPO_PUBLIC_* so they are
// inlined at build time. Anything secret stays server-side (Edge Functions only).

function required(key: string, value: string | undefined): string {
  if (!value) {
    throw new Error(
      `Missing required env var: ${key}. Copy .env.example to .env and fill it in.`,
    );
  }
  return value;
}

function num(value: string | undefined, fallback: number): number {
  const n = value ? Number(value) : NaN;
  return Number.isFinite(n) ? n : fallback;
}

export const env = {
  SUPABASE_URL: required("EXPO_PUBLIC_SUPABASE_URL", process.env.EXPO_PUBLIC_SUPABASE_URL),
  SUPABASE_ANON_KEY: required(
    "EXPO_PUBLIC_SUPABASE_ANON_KEY",
    process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
  ),
  SENTRY_DSN: process.env.EXPO_PUBLIC_SENTRY_DSN ?? null,
  POSTHOG_KEY: process.env.EXPO_PUBLIC_POSTHOG_KEY ?? null,
  GOOGLE_MAPS_API_KEY: process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY ?? null,
  NEARBY_DOG_RADIUS_M: num(process.env.EXPO_PUBLIC_NEARBY_DOG_RADIUS_M, 150),
  NEARBY_FEED_RADIUS_M: num(process.env.EXPO_PUBLIC_NEARBY_FEED_RADIUS_M, 5000),
};
