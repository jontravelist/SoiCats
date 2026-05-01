# Soi Cats — MVP Build Brief

**For:** Claude Code
**Owner:** Jon Lister
**Status:** v1.0, ready to build
**Working name:** Soi Cats (placeholder, finalise before launch)

-----

## 1. Project summary

A mobile app for Thailand where users photograph stray cats they encounter, name them, and build a community-curated record of every cat in their neighbourhood. Cats become recurring characters with profiles, photo histories, territories, and welfare status. Users earn points for contributing and unlock sticker packs designed by local Thai artists.

Launch market: **Bangkok only**. Launch language: **English only** (architected for Thai second).

The app is **community first**. A welfare layer (verified feeders, injured/missing alerts, clinic-verified TNR and vaccination status) sits on top. Donations are out of scope for v1.

-----

## 2. Vision and positioning

Think Strava for stray cats: an Instagram-style feed that doubles as a longitudinal welfare record. The community-app side drives daily engagement; the welfare layer gives it civic purpose and protects it from being a vanity feed.

The emotional hook is **recognition**. The first time a user opens the app on their street and sees that the tabby they feed every morning is already named "Khao Niao" with 47 photos and a known territory, the app has won.

-----

## 3. Locked decisions

| Decision           | Choice                                                                                           |
| ------------------ | ------------------------------------------------------------------------------------------------ |
| Cat identification | Geofence-first (Option 3). Light ML later.                                                       |
| Stack              | React Native (Expo) + Supabase (Postgres + PostGIS + Auth + Storage + Edge Functions + Realtime) |
| Launch scope       | Bangkok only                                                                                     |
| Language           | English first; i18n-ready architecture                                                           |
| Donations          | Out of scope for v1                                                                              |
| Clinic onboarding  | Manual verification by app admin                                                                 |
| Approach           | Community first, welfare layer on top                                                            |

-----

## 4. Out of scope for v1

Explicitly **not** building in the MVP. Do not architect around them, but do not paint into a corner that blocks them.

- Donations, payments, recurring sponsorship
- Thai language UI (architecture must support i18n; copy is English only)
- ML-based cat re-identification (geofence + user confirmation only)
- Sticker artist marketplace or revenue share
- Cross-city expansion outside Bangkok
- In-app messaging between users
- Web app (mobile native only)

-----

See README.md for the implemented scaffold and how to run it.
