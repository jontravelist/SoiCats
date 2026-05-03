# Soi Cats — MVP Build Brief

**For:** Claude Code
**Owner:** Jon Lister
**Status:** v1.1, ready to build (adds stat ratings, district leaderboards, share cards)
**Working name:** Soi Cats (placeholder, finalise before launch)

---

## 1. Project summary

A mobile app for Thailand where users photograph stray cats they encounter, name them, and build a community-curated record of every cat in their neighbourhood. Cats become recurring characters with profiles, photo histories, territories, welfare status, and Pokemon-style stat ratings (Chonk, Spice, Floof, Slink, Vibes). Users earn points for contributing, compete on weekly district leaderboards, and unlock sticker packs designed by local Thai artists.

Launch market: **Bangkok only**. Launch language: **English only** (architected for Thai second).

The app is **community first**. A welfare layer (verified feeders, injured/missing alerts, clinic-verified TNR and vaccination status) sits on top. Donations are out of scope for v1.

---

## 2. Vision and positioning

Think Strava for stray cats: an Instagram-style feed that doubles as a longitudinal welfare record. The community-app side drives daily engagement; the welfare layer gives it civic purpose and protects it from being a vanity feed.

The emotional hook is **recognition**. The first time a user opens the app on their street and sees that the tabby they feed every morning is already named "Khao Niao" with 47 photos and a known territory, the app has won.

---

## 3. Locked decisions

| Decision | Choice |
|---|---|
| Cat identification | Geofence-first (Option 3). Light ML later. |
| Stack | React Native (Expo) + Supabase (Postgres + PostGIS + Auth + Storage + Edge Functions + Realtime) |
| Launch scope | Bangkok only |
| Language | English first; i18n-ready architecture |
| Donations | Out of scope for v1 |
| Clinic onboarding | Manual verification by app admin |
| Approach | Community first, welfare layer on top |

---

## 4. Out of scope for v1

Explicitly **not** building in the MVP. Do not architect around them, but do not paint into a corner that blocks them.

- Donations, payments, recurring sponsorship
- Thai language UI (architecture must support i18n; copy is English only)
- ML-based cat re-identification (geofence + user confirmation only)
- Sticker artist marketplace or revenue share
- Cross-city expansion outside Bangkok
- In-app messaging between users
- Web app (mobile native only)

---

## 5. Tech stack

**Mobile:** React Native via **Expo** (managed workflow, EAS Build for distribution). TypeScript throughout.

**Backend:** **Supabase**
- Postgres with **PostGIS** extension for geo queries
- Supabase Auth (email + Apple + Google sign-in)
- Supabase Storage for photos (with image transformation via Supabase's built-in transformer)
- Supabase Realtime for live feed and comment updates
- Supabase Edge Functions (Deno) for points calculation, anti-abuse checks, and any server-side logic that must not run client-side

**Maps:** `react-native-maps` with Google Maps tiles (Bangkok rendering quality is best on Google in this region).

**Push notifications:** Expo Notifications + Expo Push API.

**Image processing on device:** `expo-image-manipulator` for resize and EXIF strip before upload.

**State:** Zustand for client state. React Query (`@tanstack/react-query`) for server cache.

**Analytics:** PostHog (self-hosted not required for v1).

**Error tracking:** Sentry.

**Local dev:** Supabase CLI for local Postgres. Migrations in `supabase/migrations/`.

---

## 6. User roles

| Role | Capabilities | How granted |
|---|---|---|
| Anonymous | Browse public feed, view cat profiles | Default, no signup |
| User | All anonymous + upload, comment, like, earn points, unlock stickers | Sign up |
| Verified Feeder | All user + log feeds, flag injured/missing with higher trust weight | Manual approval by app admin (apply via in-app form) |
| Clinic Admin | Update vaccination, sterilisation, ear-tip, health check records on cat profiles | Manual verification by app admin |
| App Admin | All of the above + moderation, clinic verification, sticker management | Internal only, set via DB |

Anonymous browsing is important. Friction at signup kills photo apps. Let people scroll the local feed first; gate the upload action behind signup.

---

## 7. Core user flows

### 7.1 Onboarding

1. App opens to nearby feed (no auth required).
2. User scrolls, taps a cat, sees a profile.
3. User taps "+" to add a photo. Auth sheet appears.
4. Sign up via Apple, Google, or email. Pick handle, optional avatar.
5. One-screen tutorial: "Photograph cats, name them, earn stickers."
6. Drop into camera.

### 7.2 Photo upload + cat ID (the core flow, see Section 8 for ID logic detail)

1. User taps "+" → camera opens (with library fallback).
2. Take photo. Local resize to 2048px max edge, EXIF stripped.
3. App requests GPS (must be ≥50m accuracy; if worse, prompt user to step into open sky or tag location manually on a map).
4. While photo uploads to Storage in background, app queries cats with territory within 150m of user.
5. Screen shows: **"Which cat is this?"** with horizontal scroll of nearby cat cards (thumbnail, name, "23 photos"). Plus two buttons: **"New cat"** and **"Not sure"**.
6. User picks one of three paths:
   - **Existing cat:** photo posts to that cat. Points awarded. Cat's territory centroid updated.
   - **New cat:** form for name (suggested Thai cat names + custom field), pattern tags (chips: tabby, tortie, calico, tuxedo, solid black, solid white, ginger, grey, pointed), distinguishing features (free text), optional age guess (kitten / young / adult / senior).
   - **Not sure:** photo enters a "Help identify" community queue. No points awarded yet. Photo is not on a cat profile until resolved. Other users can vote on which cat it is, or confirm it is new.
7. Caption field (optional, 280 chars).
8. Post.

### 7.3 Cat profile

Top: hero photo (most-liked recent), name, status badge (active / missing / injured / deceased).

Stats row:
- Total photos
- Unique photographers
- Discovered by [user] on [date]
- Last seen [time ago]

Welfare strip (only shows what is known):
- Pattern and colour tags
- TNR status: unknown / intact / ear-tipped / sterilised (with date if confirmed)
- Vaccination status: unknown / partial / fully vaccinated (with date)
- Source of welfare data shown as small "verified by [Clinic Name]" badge

**Territory map:** small embedded map showing last 10 sighting pins. Tappable to expand.

Photos grid: chronological, most recent first.

Action bar: ❤️ favourite this cat (adds to user's "my cats" list and triggers push notifications when others post photos), 📍 directions to last sighting (opens external maps).

### 7.4 Feed

Two tabs:
- **Nearby:** sightings within 5km of user, chronological.
- **Following:** sightings of cats the user has favourited, plus cats they have photographed.

Each feed item: photo, cat name (tappable to profile), photographer handle, distance from user, time, like count, comment count.

Pull to refresh. Infinite scroll. Realtime updates when a new sighting drops (subtle "3 new photos" pill at top).

### 7.5 Sticker unlocks

Profile tab shows current points and progress to next sticker tier. When a tier is hit, a celebratory modal pops with the new sticker pack reveal and artist credit.

Sticker drawer accessible from profile: grid of unlocked stickers, tap any to:
- Save to camera roll
- Share to Instagram, LINE, WhatsApp (use native share sheet)
- Set as profile decoration

### 7.6 Verified feeder: feed log (Phase 1.5)

Verified feeders see an extra "🍚 Log feed" button on cat profiles. Tap → quick form (time defaults to now, optional notes, optional photo). Logged feed appears on cat profile timeline as a non-photo event.

### 7.7 Injured / missing flag (Phase 1.5)

Any user can flag a cat. Verified feeders' flags carry more weight (auto-trigger alerts; standard user flags require either a second flag or admin review).

Flag form: type (injured / missing / deceased), description, optional photo.

When a flag is verified:
- Cat status changes
- Push notification fires to all users within 1km, and to verified feeders within 2km
- Cat appears in a "Needs help" pinned section of nearby feed

Resolution: cat photographed again healthy = community can mark resolved; clinic admin can also resolve. Deceased status is permanent (cat profile becomes a memorial; no new photos accepted).

---

## 8. Cat identification logic (Option 3 in detail)

This is the most important system in the app. Get it wrong and either every photo creates a duplicate cat (chaos) or every photo gets misattributed (worse than chaos).

### 8.1 Lookup query

When user opens the upload flow, after photo capture, fire this query:

```sql
SELECT
  id, name, primary_color, pattern,
  ST_Distance(territory_centroid, $user_location) AS distance_m,
  (SELECT photo_url FROM sightings WHERE cat_id = cats.id ORDER BY created_at DESC LIMIT 1) AS thumbnail
FROM cats
WHERE ST_DWithin(territory_centroid, $user_location, 150)
  AND status IN ('active', 'injured', 'missing')
  AND last_seen_at > NOW() - INTERVAL '90 days'
ORDER BY distance_m ASC
LIMIT 8;
```

Radius is 150m by default. Make this a configurable env var; we will tune it.

### 8.2 Territory centroid

Each cat has a `territory_centroid` (PostGIS `geography(Point)`). On every confirmed sighting:

- Recalculate centroid as the geometric mean of the cat's last 10 sighting locations.
- This makes territories drift naturally if a cat moves.

### 8.3 New cat creation

When user picks "New cat":
- Required: name, pattern tag, primary colour
- Optional: age guess, distinguishing features
- The first sighting becomes the cat's territory centroid
- User who created the cat is `discovered_by_user_id`

Name collisions are allowed (two cats can both be "Mango"); we disambiguate by territory.

### 8.4 "Not sure" queue

Photos in the "Help identify" queue are visible only on a dedicated screen. They show:
- Photo
- Location pin on small map
- Up to 8 nearby cat suggestions
- "This is [cat name]" buttons + "New cat" + "Skip"

Resolution rule: 3 matching votes from users with > 50 points = auto-confirm. 1 vote from a verified feeder = auto-confirm. App admin override available.

Once resolved, the original photographer earns their points (delayed).

### 8.5 Anti-duplication

When user creates "New cat", before saving, check: are there cats within 80m with the same primary_color and pattern? If yes, show a "Wait — could this be one of these?" interstitial with those cats. User can confirm new or pick existing.

### 8.6 Future ML hook (do not build, do leave the seam)

Add a `photo_embedding` vector column on sightings, nullable. Add a `model_version` column. We will populate these later with a vision model and use them to improve suggestions. Do not block on this.

---

## 9. Cat stat ratings

Pokemon-style five-stat system. Every cat has emergent personality stats that come from community voting on photos.

### 9.1 The five stats

| Stat | What it measures | Low-end framing | High-end framing |
|---|---|---|---|
| **Chonk** | Body presence, fluff, fullness | Lean machine | Absolute unit |
| **Spice** | Sass, hiss-energy, attitude | Soft soul | Spicy queen |
| **Floof** | Fur volume, fluffiness | Sleek | Cloud cat |
| **Slink** | Stealth, ninja moves, poise | Solid presence | Pure shadow |
| **Vibes** | Chill, zen, dignity | Chaos energy | Buddha cat |

**Core principle:** every stat must read positive at both ends. Soi cats are scrappy; a "1 chonk" cat is celebrated as lean, not shamed. No "cuteness" or "ugliness" stats — every cat must score high somewhere.

### 9.2 How rating works

After uploading a photo, the user sees an **optional** rating step:
- Five sliders (1-5), one per stat
- Each slider defaults to "skip"
- One-tap "Rate all 3" or skip entirely
- Skipping is fine; do not gate posting on rating

A user can also rate any photo from the feed by long-pressing. Same five sliders.

### 9.3 How cat-level stats are computed

Each rating is a row in `photo_ratings` (per photo, per stat, per voter). The cat's displayed stat is a weighted average across all ratings for all photos of that cat:

- Recent photos weighted higher (decay over 90 days)
- Verified feeders' votes weighted 1.5x
- A user can only rate a single photo once per stat (updates allowed)
- Cat stats only "lock in" once the cat has at least 5 ratings on at least 2 photos. Below that threshold, show "Stats coming soon" instead of unreliable averages.

### 9.4 Display

On cat profile:
- **Specialty badge** at top: highest-scoring stat in big type ("MAXIMUM SPICE", "PEAK CHONK"). If two stats tie, show both.
- **Radar chart** showing all five stats, 1-5 scale
- Tap any stat to see the framing label ("Mango: Spicy queen — 4.7/5")
- Below radar: "Rated by 23 users across 12 photos"

On photo cards in the feed: small chip showing the photo's individual stat scores if the user has rated it.

### 9.5 Stat champions

Per district (see Section 10), maintain a "Bangkok's Chonkiest Cat", "Spiciest Cat", etc. Top of each stat per district, updated nightly via a scheduled Edge Function.

A user whose photo pushed a cat into a stat champion title earns a bonus (see Section 11).

### 9.6 Anti-abuse

- One vote per user per photo per stat (upserted)
- Votes by accounts < 24h old are excluded from cat-level averages until the account is 7 days old (votes still recorded for backfill)
- Admin can purge votes from suspended accounts
- Stat manipulation by coordinated voting flagged when standard deviation across recent voters drops below threshold (build flag, not auto-action)

---

## 10. Leaderboards

District-based, weekly cycle. The point of district scoping is to keep small neighbourhoods alive and prevent Sukhumvit from dominating everything.

### 10.1 Districts

Bangkok is divided into 50 official districts (เขต / khet). For MVP, hard-code a curated list of 12-15 high-density districts where the user base will concentrate:

```
Watthana (Thonglor / Ekkamai / Phrom Phong)
Khlong Toei (Asok / Phra Khanong)
Pathum Wan (Siam / Chit Lom)
Bang Rak (Silom / Sathorn)
Ratchathewi (Phaya Thai / Victoria Monument)
Phaya Thai (Ari / Saphan Khwai)
Chatuchak (Mo Chit / Ladprao)
Huai Khwang
Bang Sue
Phra Nakhon (Old City / Khao San)
Sathon (Sathorn proper)
Yan Nawa (Rama 3)
Khlong San (Icon Siam side)
Bangkok Noi (Thonburi side)
Suan Luang (On Nut)
```

Districts beyond this list still work — sightings outside curated districts go into a single "Greater Bangkok" leaderboard so users in less-dense areas still have a board.

Store district as a polygon in a `districts` table; assign each sighting to a district at upload via PostGIS `ST_Contains` lookup, cached on the sighting row.

### 10.2 Weekly Top 3 photos

Per district, every Monday 00:00 ICT:
- Previous week's top 3 photos by like count are frozen
- Winners get points bonuses (see Section 11)
- Frozen winners display permanently in a "Hall of Fame" archive per district

Display in the app:
- Leaderboard tab shows current-week top photos per district (live, updates as likes accumulate)
- Below current week: last week's frozen top 3 with winner badges
- Tappable archive: every previous week's winners

### 10.3 Cat-level Hall of Fame

On every cat profile, show top 3 photos of that cat by all-time like count. Updates live. No weekly reset; this is a forever leaderboard for each cat. Highly competitive territory once a cat has a regular photographer following.

### 10.4 Stat champion leaderboards

Per district, per stat, top 5 cats by stat score. So per district there are five small leaderboards: Chonkiest, Spiciest, Floofiest, Slinkiest, Best Vibes.

City-wide also shown ("Bangkok's Spiciest Cat") but secondary to district view.

### 10.5 User leaderboards (lightweight)

Per district:
- Most photos this week
- Most cats discovered this month
- Highest-rated photo this week

Keep these understated; the focus is cats, not users. But surface them in the leaderboard tab.

### 10.6 Welfare exclusion (important)

Photos flagged as injured / missing / deceased are excluded from all leaderboards. Cats with current injured/missing status are excluded from stat champion leaderboards until status is resolved.

Reason: do not create incentive to skip welfare photos because they "won't win." Welfare is the moral backbone of the app. Ratings and leaderboards are the game on top, not the game itself.

---

## 11. Share cards

The viral loop. Every cat profile and every weekly winner can be exported as a 1080x1080 stat card image users share to Instagram, LINE, WhatsApp.

### 11.1 Cat stat card

Composition (1080x1080 PNG):
- Hero photo (most-liked recent photo of the cat) as background, slightly desaturated with dark gradient overlay at bottom
- Cat name in display type, top-left
- District tag below name ("Phrom Phong")
- Specialty badge in centre-right ("MAXIMUM SPICE" with stat value)
- Radar chart bottom-left showing all 5 stats
- Stats list bottom-right: "Chonk 4.2 / Spice 4.7 / Floof 3.1 / Slink 2.8 / Vibes 4.0"
- "Soi Cats" wordmark + small cat icon, bottom-centre, with `soicats.app` URL or whatever the final domain is
- Photo credit: "📷 @photographer" small, top-right

Generate with `react-native-view-shot`. Render an off-screen React component, capture as PNG, hand to native share sheet.

### 11.2 Photo winner card

When a user's photo wins weekly Top 3 in their district:
- Push notification: "Your photo of Mango won 2nd place in Phrom Phong this week"
- Tap → share card with: the photo full-bleed, "WEEK X WINNER — PHROM PHONG" banner, cat name, photographer credit, ranking medal, Soi Cats wordmark
- One-tap share to Instagram Stories

### 11.3 Stat champion card

When a cat takes a stat champion title in its district:
- Push to all users who have photographed that cat
- Share card: "MANGO IS NOW PHROM PHONG'S SPICIEST CAT 🌶️"
- Hero photo, big stat readout, district tag, Soi Cats wordmark

### 11.4 Implementation notes

- Build cards as React Native components with a fixed 1080x1080 layout
- Use a single typography system (export Google Fonts or system fonts as embedded assets)
- Test render quality on iOS and Android — `react-native-view-shot` has format quirks
- Cache rendered cards in Storage so re-shares don't re-render
- All share cards include UTM-tagged URLs for attribution tracking via PostHog

### 11.5 Watermarking

Every share card has the Soi Cats wordmark and URL. Non-removable, baked into the render. This is the marketing engine; do not let users export "clean" versions.

---

## 12. Points system

| Action | Points | Notes |
|---|---|---|
| Photo of existing cat | 10 | First photo of that cat by this user this week |
| First-ever photo of a new cat | 25 | "Discoverer" bonus |
| Photo of a cat unseen for 14+ days | 15 | "Welfare check" bonus |
| Photo confirmed via "Help identify" queue | 10 (delayed) | Awarded on resolution |
| Logging a feed (verified feeders only) | 5 | Max 3 per cat per day |
| Verified injured/missing flag | 30 | Awarded on verification, not on submission |
| Comment on a sighting | 1 | Max 10/day |
| Receiving a like on your photo | 1 | Max 20/day |
| Rating photos (any stat) | 1 | Max 15/day; capped to discourage drive-by voting |
| Weekly Top 3 photo: 1st place | 100 | District leaderboard, awarded Monday 00:00 |
| Weekly Top 3 photo: 2nd place | 50 | District leaderboard |
| Weekly Top 3 photo: 3rd place | 25 | District leaderboard |
| Photo that pushes a cat to a new stat champion title | 50 | Per district, per stat, one-time per title change |
| First photo on a brand new cat profile to receive 5+ stat ratings | 20 | Encourages early rating activity on new cats |

**Daily cap:** 100 points per user per day. Hard cap. (Weekly leaderboard bonuses bypass the daily cap because they are awarded on Mondays for the previous week's accumulated activity.)

**Account age gate:** Discoverer bonus and welfare check bonus require account age > 24 hours.

All point awards write to a `points_log` table for audit and recalculation. Never increment `users.points` without a corresponding log row.

---

## 13. Sticker system

### 13.1 Tiers

| Tier | Points | Pack |
|---|---|---|
| 1 | 100 | "Soi Starter" — 6 stickers |
| 2 | 500 | "Neighbourhood Regular" — 8 stickers |
| 3 | 1,500 | "Cat Whisperer" — 10 stickers |
| 4 | 5,000 | "Soi Legend" — 12 stickers |

Each pack designed by a different local artist. Artist credit is mandatory and displayed on every sticker preview.

### 13.2 Sticker storage

Stickers are PNG with transparent background, 1024x1024. Stored in Supabase Storage under `stickers/{pack_id}/{sticker_id}.png`. Metadata in a `stickers` table.

### 13.3 Export

Tapping a sticker opens a sheet:
- Save to camera roll (writes to user's Photos)
- Share via native share sheet (iOS share sheet handles routing to LINE, Instagram, WhatsApp, iMessage)
- iOS sticker pack format (post-MVP)

### 13.4 Admin

Sticker packs are added via SQL or a future admin UI. For MVP, admins seed packs directly via the Supabase dashboard.

---

## 14. Anti-abuse rules

The gamification will be gamed. Build the rate limits into Edge Functions, not client code.

| Rule | Implementation |
|---|---|
| Daily points cap (100) | Edge function checks `points_log` sum for today before awarding |
| Same-cat, same-place farming | If user uploaded a photo of the same cat within 50m in the last 4 hours, photo posts but no points |
| Duplicate photo detection | Compute pHash on upload via Edge Function. If pHash matches any photo by this user in last 30 days (Hamming distance < 5), no points |
| GPS spoofing | Require `accuracy <= 50m` from device. Reject if accuracy worse without manual map confirmation |
| Account age | Discoverer + welfare bonuses gated to account age > 24h |
| New cat spam | Max 5 new cats per user per day |
| Comment spam | Max 30 comments per user per day, max 10 on a single sighting |
| Stat rating spam | Max 15 rating-action points per day; votes from accounts < 7 days old excluded from cat-level averages |
| Self-vote prevention | A user cannot rate their own photos for any stat |
| Coordinated voting | Detect when stat ratings on a single cat come from accounts that vote together repeatedly; flag for admin review |
| Report and block | Any user can report content; admin queue handles |

Soft-fail on points: when a rule trips, the photo still posts (silent on the user side), it just doesn't earn. We do not want users to feel punished for ambiguous behaviour. They will figure out the rules.

---

## 15. Data model

PostGIS extension required. All location columns are `geography(Point, 4326)`.

### users
```
id              uuid PK (= auth.users.id)
handle          text UNIQUE
display_name    text
avatar_url      text
role            enum('user','feeder','clinic_admin','app_admin') default 'user'
points          int default 0
locale          text default 'en'
home_location   geography(Point) nullable
created_at      timestamptz
last_active_at  timestamptz
```

### cats
```
id                       uuid PK
name                     text
name_th                  text nullable
discovered_by_user_id    uuid FK users
discovered_at            timestamptz
primary_color            text
pattern                  text
distinguishing_features  text nullable
age_guess                enum('kitten','young','adult','senior') nullable
territory_centroid       geography(Point)
last_seen_at             timestamptz
status                   enum('active','injured','missing','deceased') default 'active'
tnr_status               enum('unknown','intact','ear_tipped','sterilised') default 'unknown'
tnr_confirmed_at         timestamptz nullable
tnr_confirmed_by_clinic  uuid FK clinics nullable
vaccination_status       enum('unknown','partial','fully_vaccinated') default 'unknown'
last_vaccination_at      timestamptz nullable

-- Stat aggregates (cached from photo_ratings, recomputed nightly + on-write)
stat_chonk               numeric(3,2) nullable
stat_spice               numeric(3,2) nullable
stat_floof               numeric(3,2) nullable
stat_slink               numeric(3,2) nullable
stat_vibes               numeric(3,2) nullable
stats_rating_count       int default 0
stats_last_computed_at   timestamptz nullable
specialty_stat           text nullable  -- the highest stat name; 'spice' / 'chonk' / etc.

district_id              uuid FK districts nullable  -- inferred from territory_centroid
created_at               timestamptz

INDEX on territory_centroid (GIST)
INDEX on status, last_seen_at
INDEX on district_id, specialty_stat
```

### sightings
```
id                uuid PK
cat_id            uuid FK cats nullable (null while in "not sure" queue)
photographer_id   uuid FK users
photo_url         text
photo_hash        text (perceptual hash, 16-char hex)
photo_embedding   vector(512) nullable (future ML hook)
model_version     text nullable
location          geography(Point)
location_accuracy_m  int
district_id       uuid FK districts nullable  -- cached at upload via ST_Contains
caption           text nullable
like_count        int default 0  -- denormalised for leaderboard queries
points_awarded    int default 0
status            enum('confirmed','pending_id','rejected') default 'confirmed'
created_at        timestamptz

INDEX on location (GIST)
INDEX on cat_id, created_at DESC
INDEX on photographer_id, created_at DESC
INDEX on status
INDEX on district_id, created_at DESC
INDEX on district_id, like_count DESC  -- weekly leaderboard queries
```

### cat_health_flags, feed_logs, comments, likes, user_favourite_cats, sticker_packs, stickers, user_stickers, clinics, clinic_updates, points_log, identification_votes
(unchanged from v1.0 — see migrations for full definitions)

### districts
```
id            uuid PK
name          text
name_th       text nullable
slug          text UNIQUE  -- 'phrom-phong', 'thonglor', etc.
boundary      geography(Polygon)
is_curated    boolean default true  -- false = falls into "Greater Bangkok"
created_at    timestamptz

INDEX on boundary (GIST)
INDEX on slug
```

Seed with curated Bangkok districts (see Section 10.1). Boundaries can be sourced from OpenStreetMap admin level 8 polygons for เขต (khet) divisions.

### photo_ratings
```
id            uuid PK
sighting_id   uuid FK sightings
voter_id      uuid FK users
stat          enum('chonk','spice','floof','slink','vibes')
score         int CHECK (score BETWEEN 1 AND 5)
created_at    timestamptz
updated_at    timestamptz
PRIMARY KEY (sighting_id, voter_id, stat)

INDEX on sighting_id
INDEX on voter_id, created_at
```

A trigger on insert/update recalculates the parent cat's stat aggregates (debounced — write to a job queue, process every 30s in batch to avoid hot-row contention on popular cats).

### weekly_leaderboard_winners
```
id              uuid PK
week_start      date  -- Monday 00:00 ICT of the week being awarded
district_id     uuid FK districts
rank            int CHECK (rank IN (1,2,3))
sighting_id     uuid FK sightings
photographer_id uuid FK users
cat_id          uuid FK cats
like_count      int  -- frozen at award time
points_awarded  int
created_at      timestamptz

UNIQUE (week_start, district_id, rank)
INDEX on photographer_id, week_start DESC
INDEX on district_id, week_start DESC
```

Populated every Monday 00:00 ICT by a scheduled Edge Function.

### stat_champions
```
id              uuid PK
district_id     uuid FK districts
stat            enum('chonk','spice','floof','slink','vibes')
cat_id          uuid FK cats
score           numeric(3,2)
held_since      timestamptz
last_computed_at timestamptz

UNIQUE (district_id, stat)
INDEX on cat_id
```

One row per district per stat (5 stats x ~15 districts = 75 rows). Recomputed nightly. When a cat takes a title from another, write a `points_log` entry for the photographer whose recent rating tipped the balance, and fire a push notification.

### share_card_renders
```
id              uuid PK
card_type       enum('cat_profile','photo_winner','stat_champion')
target_id       uuid  -- cat_id or sighting_id depending on card_type
rendered_url    text  -- Supabase Storage URL
rendered_at     timestamptz
expires_at      timestamptz  -- regenerate after this
share_count     int default 0

INDEX on card_type, target_id
```

Cache rendered share cards. Regenerate when underlying data changes (new photo becomes hero, stat tier changes, etc.) or after 7 days, whichever first.

### Row Level Security

All tables get RLS policies. Sketch:
- Read: most tables public read (this is a community app)
- Write: users can only insert their own rows; updates/deletes restricted to owner or admin
- `clinic_updates` insert restricted to `clinic_admin` role
- `cats.tnr_status`, `vaccination_status`, `last_vaccination_at` updateable only via clinic_updates trigger or admin
- `photo_ratings`: insert/update restricted to authenticated users; cannot rate own photos (enforced by RLS check against `sightings.photographer_id != auth.uid()`)
- `weekly_leaderboard_winners`, `stat_champions`: read-only for all users; writes only by Edge Functions (service role)
- `cats` stat columns updateable only via the rating-aggregation trigger or admin

---

## 16. Notifications

Use Expo Push. Store device tokens in a `device_tokens` table linked to user.

| Trigger | Audience | Body |
|---|---|---|
| New photo of a favourited cat | Users who favourited that cat | "Mango was just spotted by @user near Soi 11" |
| Verified injured/missing flag | Users within 1km, feeders within 2km | "Mango may be injured near Soi 11. Tap to help." |
| Sticker tier unlocked | Affected user | "You hit 500 points! New pack unlocked." |
| Comment on your photo | Photo owner | "@user commented on your photo of Mango" |
| Help identify resolved | Original photographer | "Your photo was identified as Mango. +10 points." |
| Weekly Top 3 winner | Photographer | "Your photo of Mango won 2nd place in Phrom Phong this week 🥈" |
| Stat champion title taken | Users who photographed that cat | "Mango is now Phrom Phong's Spiciest Cat 🌶️" |
| Stat champion title lost | Photographer who held it | "Khao Niao just took the Chonkiest title from Mango" (optional, off by default) |

User notification settings screen: toggle each category. Default all on except comments and stat-champion-lost (can be noisy or sad).

---

## 17. Localization

English only at launch, but architected for Thai second.

- Use `i18n-js` or `react-i18next`. All UI strings in `locales/en.json`.
- No string literals in JSX. Lint rule to enforce.
- Cat names: store both `name` (Latin script) and `name_th` (Thai). UI shows `name_th` first when locale is `th`, falls back to `name`.
- Sticker pack names and artist credits also localizable.
- Stat names and framing labels ("Chonk / Spice / Floof / Slink / Vibes") need careful Thai localization — these are English jokes that need Thai equivalents that land. Flag for native speaker review when Thai is added.
- District names: use Thai names primarily for `th` locale (เขตวัฒนา for Watthana etc.), with romanised fallback.
- Date and number formatting via `Intl` APIs with locale.

---

## 18. Admin and clinic portals

Out of scope for the mobile app build. For MVP, admins use the **Supabase dashboard directly** to:
- Verify clinic accounts (set `clinics.verified_at`)
- Promote users to `feeder` or `clinic_admin` role
- Moderate flagged content
- Seed sticker packs
- Seed district polygons

Clinics need a way to log vaccinations. Two options for MVP:
- **A:** Clinics use the mobile app, log in as `clinic_admin`, and get an extra "Update record" button on cat profiles.
- **B:** Clinics submit updates via a Google Form that an admin transcribes.

Recommend **A** for MVP. It is cheaper to build (one extra button + form) than to build a separate web portal, and clinics will already be on phones.

---

## 19. Build phases

### Phase 1: Core MVP (target: 7-8 weeks, up from 6 to absorb ratings + leaderboards + share cards)
- Auth (Apple, Google, email)
- Profile screen, handle, avatar
- Camera + upload + GPS capture
- Geofence-based cat ID flow
- New cat creation
- Cat profile with photos grid and territory map
- **Cat stat ratings (Chonk / Spice / Floof / Slink / Vibes) — voting + aggregation + radar display + specialty badge**
- **District assignment for sightings (PostGIS)**
- **Weekly district leaderboards (top 3 photos per district)**
- **Cat-level Hall of Fame (top 3 photos per cat)**
- **Stat champion leaderboards per district**
- **Share card rendering (cat profile, photo winner, stat champion)**
- Feed (Nearby + Following tabs)
- Comments and likes
- Points system + daily cap + anti-abuse
- Sticker tiers + unlock + share
- Push notifications (favourited cat, sticker unlock, comment, weekly winner, stat champion)
- "Not sure" queue + community ID voting

### Phase 1.5: Welfare layer (target: +3 weeks)
- Verified feeder application flow
- Feed log feature for feeders
- Injured / missing / deceased flagging
- Proximity push alerts on verified flags
- "Needs help" pinned section in feed
- Clinic admin role + cat record update UI
- TNR and vaccination status display on cat profiles
- Welfare exclusion enforced on leaderboards and stat champions

### Phase 2: Donations (separate brief)

### Phase 3: Thai localization, ML re-ID assist, sticker artist marketplace, iOS sticker pack export

---

## 20. Repo structure

```
soi-cats/
├── apps/
│   └── mobile/                    # Expo app
│       ├── src/
│       │   ├── screens/
│       │   ├── components/
│       │   │   └── ShareCards/    # off-screen render targets for share images
│       │   ├── features/          # feature-sliced (cats, sightings, feed, ratings, leaderboards, etc.)
│       │   ├── lib/
│       │   ├── hooks/
│       │   ├── stores/            # Zustand
│       │   └── locales/
│       ├── app.json
│       └── eas.json
├── supabase/
│   ├── migrations/
│   ├── functions/                 # Edge Functions (Deno)
│   │   ├── award-points/
│   │   ├── compute-phash/
│   │   ├── verify-flag/
│   │   ├── recalculate-territory/
│   │   ├── recompute-cat-stats/        # debounced rating aggregation
│   │   ├── compute-weekly-winners/     # cron, Monday 00:00 ICT
│   │   ├── recompute-stat-champions/   # nightly cron
│   │   └── render-share-card/          # serverless image composition fallback
│   └── seed.sql
├── packages/
│   └── shared/                    # shared types, generated from Supabase schema
├── BRIEF.md                       # this file
└── README.md
```

Use `supabase gen types typescript` to generate types into `packages/shared/types.ts`.

---

## 21. Environment variables

```
EXPO_PUBLIC_SUPABASE_URL=
EXPO_PUBLIC_SUPABASE_ANON_KEY=
EXPO_PUBLIC_SENTRY_DSN=
EXPO_PUBLIC_POSTHOG_KEY=
EXPO_PUBLIC_GOOGLE_MAPS_API_KEY=
EXPO_PUBLIC_NEARBY_CAT_RADIUS_M=150
EXPO_PUBLIC_NEARBY_FEED_RADIUS_M=5000
EXPO_PUBLIC_STAT_MIN_RATINGS_FOR_DISPLAY=5
EXPO_PUBLIC_SHARE_CARD_DOMAIN=soicats.app

# Edge Function secrets (server-side only)
SUPABASE_SERVICE_ROLE_KEY=
EXPO_ACCESS_TOKEN=
```

---

## 22. Things Claude Code should decide

These are intentionally left open so Claude Code can pick the best implementation:

- Exact image upload flow (direct to Storage from client vs through Edge Function for hashing first)
- Comment threading depth (recommend flat for MVP)
- Realtime channel subscription patterns (per cat? per feed area?)
- Map provider abstraction (so we can swap Google for Mapbox later)
- Form library (recommend `react-hook-form` + `zod`)
- Test framework setup (recommend Vitest for units, Detox for E2E if time)
- Share card rendering: client-side via `react-native-view-shot` (recommended for MVP, no server cost) vs server-side via Edge Function with `satori` (better for shareability outside app, but more infra)
- Stat aggregation strategy: debounced trigger + materialised view, or trigger + write-through cache (recommend the former for simplicity at MVP scale)
- Radar chart library: `victory-native` vs `react-native-svg-charts` vs hand-rolled SVG (hand-rolled is fine, the chart is simple)

---

## 23. Things to ask Jon before deciding

- Final app name (Soi Cats is placeholder)
- App icon and primary brand colour
- Curated Thai cat name list (Khao Niao, Mango, Som Tam, etc., need a starter list of 30-40)
- First sticker pack artist (commission ahead of build completion)
- Bangkok launch districts: confirm the 12-15 district list in Section 10.1
- District boundary source (recommend OSM admin level 8 polygons; may need light cleanup)
- Stat name finals: Chonk / Spice / Floof / Slink / Vibes locked, but framing labels at each end of each scale need a copywriter pass
- Specialty badge typography: which display font carries the Pokemon-card energy (consider commissioning a custom wordmark)
- Privacy policy and ToS copy (legal, before TestFlight)
- Apple Developer + Google Play accounts (under which entity? Listed Creative or new?)
- Final share card URL domain (placeholder is `soicats.app`)

---

## 24. Definition of done for Phase 1

- [ ] User can sign up, take a photo, identify or create a cat, and post in under 60 seconds
- [ ] Two cats with overlapping territories can be distinguished without confusion
- [ ] Points award correctly and daily cap enforced
- [ ] At least one sticker pack unlockable end-to-end
- [ ] Push notifications firing reliably
- [ ] App passes Apple and Google review
- [ ] No P0 bugs in Sentry over 7 days of internal testing
- [ ] Loads to first interactive screen in under 2 seconds on a mid-range Android
- [ ] User can rate any photo on five stats; cat profile shows aggregated radar + specialty badge once threshold is met
- [ ] District is correctly assigned to every sighting at upload via PostGIS
- [ ] Weekly leaderboards compute correctly on Monday cron and award points to winners
- [ ] Stat champion titles compute correctly and notifications fire on title changes
- [ ] Share card renders for cat profiles, photo winners, and stat champions; image is properly watermarked and shareable to Instagram, LINE, WhatsApp via native share sheet
- [ ] Welfare-flagged photos and cats are excluded from all leaderboards and champion calculations

---

*End of brief.*
