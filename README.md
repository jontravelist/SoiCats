# Soi Dogs

Mobile app for Thailand where users photograph soi dogs, name them, and build
a community-curated record of every dog in their neighbourhood.

See `BRIEF.md` for full product spec.

## Stack

- **Mobile:** React Native via Expo (managed workflow), TypeScript
- **Backend:** Supabase (Postgres + PostGIS, Auth, Storage, Realtime, Edge Functions)
- **State:** Zustand + `@tanstack/react-query`
- **Maps:** `react-native-maps` (Google tiles)
- **i18n:** `react-i18next`
- **Navigation:** `expo-router`
- **Errors / analytics:** Sentry, PostHog

## Repo layout

```
soi-dogs/
├── apps/mobile/             # Expo app
├── supabase/
│   ├── migrations/          # SQL migrations (PostGIS, schema, RLS)
│   ├── functions/           # Edge Functions (Deno)
│   └── seed.sql             # Bangkok seed data + sticker packs
├── packages/shared/         # generated types + shared helpers
└── BRIEF.md
```

## Getting started

### 1. Supabase

```bash
# Install CLI
npm i -g supabase

# Start local stack (Postgres with PostGIS, Auth, Storage, etc.)
supabase start

# Apply migrations
supabase db reset

# Seed sticker packs and Bangkok demo dogs
psql "$(supabase status -o env | grep DB_URL | cut -d= -f2-)" -f supabase/seed.sql

# Deploy Edge Functions to your project
supabase functions deploy award-points
supabase functions deploy compute-phash
supabase functions deploy verify-flag
supabase functions deploy recalculate-territory
```

### 2. Mobile

```bash
cd apps/mobile
npm install
cp .env.example .env   # fill in keys from `supabase status`
npx expo start
```

### 3. Generate shared types

```bash
npx supabase gen types typescript --local > packages/shared/database.types.ts
```

## Build phases

- **Phase 1 (6 weeks):** Auth, camera, geofence dog ID, profiles, feed, points, stickers, push.
- **Phase 1.5 (+3 weeks):** Verified feeders, feed logs, injured/missing flags, clinic admin.
- **Phase 2:** Donations.
- **Phase 3:** Thai localization, ML re-ID, sticker marketplace.

## Env vars

See `apps/mobile/.env.example` and `supabase/functions/.env.example`.
