// Thin wrappers around Supabase queries used by the mobile app.

import { supabase } from "@/lib/supabase";
import { env } from "@/lib/env";
import type { Database } from "@shared/database.types";

type NearbyCat = Database["public"]["Functions"]["nearby_cats"]["Returns"][number];
type FeedItem  = Database["public"]["Functions"]["nearby_feed"]["Returns"][number];
type Duplicate = Database["public"]["Functions"]["duplicate_candidates"]["Returns"][number];

export async function fetchNearbyCats(
  lat: number,
  lng: number,
  radius_m = env.NEARBY_CAT_RADIUS_M,
  max_rows = 8,
): Promise<NearbyCat[]> {
  const { data, error } = await supabase.rpc("nearby_cats", {
    lat, lng, radius_m, max_rows,
  });
  if (error) throw error;
  return data ?? [];
}

// Returns up to `limit` cats with no distance filter (i.e. everywhere),
// ordered by name. Used by the Cats browse tab as a fallback when we
// don't have a GPS reading.
export async function fetchAllCats(limit = 200) {
  const { data, error } = await supabase
    .from("cats")
    .select("id, name, name_th, primary_color, pattern, status, last_seen_at, distinguishing_features, sex, age_guess")
    .order("name", { ascending: true })
    .limit(limit);
  if (error) throw error;
  return data ?? [];
}

// The nearby_cats RPC doesn't return distinguishing_features / sex / age_guess
// (would require a migration). Batch-fetch them for a list of IDs and return a
// lookup map.
export async function fetchExtrasByCatId(
  catIds: string[],
): Promise<Record<string, { distinguishing_features: string | null; sex: string; age_guess: string | null }>> {
  if (catIds.length === 0) return {};
  const { data, error } = await supabase
    .from("cats")
    .select("id, distinguishing_features, sex, age_guess")
    .in("id", catIds);
  if (error) throw error;
  return Object.fromEntries(
    (data ?? []).map((r) => [
      r.id,
      {
        distinguishing_features: r.distinguishing_features,
        sex: r.sex,
        age_guess: r.age_guess,
      },
    ]),
  );
}

export async function fetchNearbyFeed(
  lat: number,
  lng: number,
  before?: string,
): Promise<FeedItem[]> {
  const { data, error } = await supabase.rpc("nearby_feed", {
    lat, lng,
    radius_m: env.NEARBY_FEED_RADIUS_M,
    max_rows: 50,
    before: before ?? null,
  });
  if (error) throw error;
  return data ?? [];
}

export async function fetchFollowingFeed(before?: string) {
  const { data, error } = await supabase.rpc("following_feed", {
    max_rows: 50,
    before: before ?? null,
  });
  if (error) throw error;
  return data ?? [];
}

export async function fetchDuplicateCandidates(
  lat: number,
  lng: number,
  primary_color: string,
  pattern: string,
): Promise<Duplicate[]> {
  const { data, error } = await supabase.rpc("duplicate_candidates", {
    lat, lng, primary_color, pattern,
  });
  if (error) throw error;
  return data ?? [];
}

export async function fetchCat(catId: string) {
  const { data, error } = await supabase
    .from("cats")
    .select("*")
    .eq("id", catId)
    .single();
  if (error) throw error;
  return data;
}

export async function fetchCatSightings(catId: string) {
  const { data, error } = await supabase
    .from("sightings")
    .select("id, photo_url, caption, created_at, photographer_id, location")
    .eq("cat_id", catId)
    .eq("status", "confirmed")
    .order("created_at", { ascending: false })
    .limit(60);
  if (error) throw error;
  return data ?? [];
}

// Last 10 confirmed sighting locations for the territory map on cat profile.
// Returns plain lng/lat columns so we don't have to parse PostGIS geography.
export async function fetchCatSightingLocations(catId: string) {
  const { data, error } = await supabase.rpc("cat_recent_sighting_pins", {
    target_cat: catId,
  });
  if (error) throw error;
  return data ?? [];
}

// Discoverer-only edits to a cat. RLS already restricts updates to fields
// that aren't welfare-related (those go through clinic_updates).
export async function updateCat(catId: string, patch: {
  name?: string;
  name_th?: string | null;
  distinguishing_features?: string | null;
  age_guess?: string | null;
  sex?: string | null;
}) {
  const update: Record<string, unknown> = {};
  if (patch.name !== undefined) update.name = patch.name;
  if (patch.name_th !== undefined) update.name_th = patch.name_th;
  if (patch.distinguishing_features !== undefined) update.distinguishing_features = patch.distinguishing_features;
  if (patch.age_guess !== undefined) update.age_guess = patch.age_guess;
  if (patch.sex !== undefined) update.sex = patch.sex;
  const { error } = await supabase.from("cats").update(update).eq("id", catId);
  if (error) throw error;
}

// Search the cats table by name (case-insensitive, anywhere). For the merge
// target picker — keeps payload tiny, no thumbnails.
export async function searchCatsByName(query: string, excludeId?: string, limit = 20) {
  if (!query.trim()) return [];
  let q = supabase
    .from("cats")
    .select("id, name, primary_color, pattern")
    .ilike("name", `%${query.trim()}%`)
    .order("name")
    .limit(limit);
  if (excludeId) q = q.neq("id", excludeId);
  const { data, error } = await q;
  if (error) throw error;
  return data ?? [];
}

// Submit a duplicate-merge request. Admin reviews in Studio; on approval the
// SQL function reassigns every related row from source to target and deletes
// the source cat.
export async function requestCatMerge(input: { sourceCatId: string; targetCatId: string; reason: string }) {
  const { data: user } = await supabase.auth.getUser();
  if (!user.user) throw new Error("Not signed in");
  const { error } = await supabase.from("cat_merge_requests").insert({
    source_cat_id: input.sourceCatId,
    target_cat_id: input.targetCatId,
    requested_by: user.user.id,
    reason: input.reason,
  });
  if (error) throw error;
}

export async function createCat(input: {
  name: string;
  primary_color: string;
  pattern: string;
  age_guess?: string | null;
  sex?: string | null;
  distinguishing_features?: string | null;
  lat: number;
  lng: number;
}) {
  const { data: user } = await supabase.auth.getUser();
  if (!user.user) throw new Error("Not signed in");

  const { data, error } = await supabase
    .from("cats")
    .insert({
      name: input.name,
      primary_color: input.primary_color,
      pattern: input.pattern,
      age_guess: (input.age_guess as Database["public"]["Enums"]["cat_age_guess"]) ?? null,
      sex: (input.sex as Database["public"]["Enums"]["cat_sex"]) ?? "unknown",
      distinguishing_features: input.distinguishing_features ?? null,
      discovered_by_user_id: user.user.id,
      // PostGIS accepts WKT through PostgREST when sent as a string.
      territory_centroid: `SRID=4326;POINT(${input.lng} ${input.lat})` as unknown as never,
    })
    .select("id")
    .single();
  if (error) throw error;
  return data;
}

export async function createSighting(input: {
  cat_id: string | null;
  photo_url: string;
  lat: number;
  lng: number;
  accuracy: number | null;
  caption?: string | null;
}) {
  const { data: user } = await supabase.auth.getUser();
  if (!user.user) throw new Error("Not signed in");

  const { data, error } = await supabase
    .from("sightings")
    .insert({
      cat_id: input.cat_id,
      photographer_id: user.user.id,
      photo_url: input.photo_url,
      location: `SRID=4326;POINT(${input.lng} ${input.lat})` as unknown as never,
      location_accuracy_m: input.accuracy ? Math.round(input.accuracy) : null,
      caption: input.caption ?? null,
      status: input.cat_id ? "confirmed" : "pending_id",
    })
    .select("id, photo_url")
    .single();
  if (error) throw error;

  // Notify everyone who's favourited this cat (other than the photographer).
  if (input.cat_id) {
    const { data: cat } = await supabase
      .from("cats")
      .select("name")
      .eq("id", input.cat_id)
      .single();
    const { data: favs } = await supabase
      .from("user_favourite_cats")
      .select("user_id")
      .eq("cat_id", input.cat_id);
    const recipients = (favs ?? [])
      .map((f) => f.user_id)
      .filter((id) => id !== user.user.id);
    if (recipients.length > 0 && cat) {
      const { sendPush } = await import("./push");
      void sendPush({
        userIds: recipients,
        title: `${cat.name} was just spotted`,
        body: "Tap to see the new photo.",
        category: "favourite_cat_photo",
        data: { cat_id: input.cat_id, sighting_id: data.id },
      });
    }
  }

  return data;
}

// Calls the award-points Edge Function. Returns the points actually awarded.
export async function awardPoints(sightingId: string): Promise<number> {
  const { data, error } = await supabase.functions.invoke<{ awarded: number }>(
    "award-points",
    { body: { sighting_id: sightingId } },
  );
  if (error) {
    // Don't fail the post for points; log and move on.
    console.warn("award-points failed", error);
    return 0;
  }
  return data?.awarded ?? 0;
}

export async function computePhotoHash(sightingId: string, photoUrl: string) {
  const { error } = await supabase.functions.invoke("compute-phash", {
    body: { sighting_id: sightingId, photo_url: photoUrl },
  });
  if (error) console.warn("compute-phash failed", error);
}

export async function toggleFavourite(catId: string, on: boolean) {
  const { data: user } = await supabase.auth.getUser();
  if (!user.user) throw new Error("Not signed in");
  if (on) {
    const { error } = await supabase
      .from("user_favourite_cats")
      .insert({ user_id: user.user.id, cat_id: catId });
    if (error && error.code !== "23505") throw error; // ignore unique violation
  } else {
    const { error } = await supabase
      .from("user_favourite_cats")
      .delete()
      .eq("user_id", user.user.id)
      .eq("cat_id", catId);
    if (error) throw error;
  }
}

export async function toggleLike(sightingId: string, on: boolean) {
  const { data: user } = await supabase.auth.getUser();
  if (!user.user) throw new Error("Not signed in");
  if (on) {
    const { error } = await supabase
      .from("likes")
      .insert({ sighting_id: sightingId, user_id: user.user.id });
    if (error && error.code !== "23505") throw error;
  } else {
    const { error } = await supabase
      .from("likes")
      .delete()
      .eq("sighting_id", sightingId)
      .eq("user_id", user.user.id);
    if (error) throw error;
  }
}

export async function postComment(sightingId: string, body: string) {
  const { data: user } = await supabase.auth.getUser();
  if (!user.user) throw new Error("Not signed in");
  const { error } = await supabase.from("comments").insert({
    sighting_id: sightingId,
    user_id: user.user.id,
    body,
  });
  if (error) throw error;

  // Best-effort push to the photo owner.
  const { data: sighting } = await supabase
    .from("sightings")
    .select("photographer_id, cats(name), users:photographer_id(handle)")
    .eq("id", sightingId)
    .single();
  if (sighting && sighting.photographer_id !== user.user.id) {
    const catName = (sighting as { cats?: { name?: string } | null }).cats?.name ?? "your photo";
    const { sendPush } = await import("./push");
    void sendPush({
      userIds: [sighting.photographer_id],
      title: "New comment",
      body: `Someone commented on your photo of ${catName}.`,
      category: "comment_on_my_photo",
      data: { sighting_id: sightingId },
    });
  }
}

export async function fetchComments(sightingId: string) {
  const { data, error } = await supabase
    .from("comments")
    .select("id, body, created_at, user_id, users(handle, avatar_url)")
    .eq("sighting_id", sightingId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

// Cats with an open verified welfare flag — what powers the 'Needs help'
// pinned section at the top of the Feed.
export async function fetchCatsNeedingHelp(lat?: number, lng?: number) {
  const { data, error } = await supabase.rpc("cats_needing_help", {
    lat: lat ?? null,
    lng: lng ?? null,
    radius_m: 50_000,
    max_rows: 20,
  });
  if (error) throw error;
  return data ?? [];
}

export async function fetchLatestFlagForCat(catId: string) {
  const { data, error } = await supabase.rpc("latest_flag_for_cat", { target_cat: catId });
  if (error) throw error;
  return (data ?? [])[0] ?? null;
}

// Insert a welfare flag. The DB trigger immediately auto-verifies if the
// flagger is a feeder/admin or there's already a corroborating open flag.
export async function flagCat(input: {
  catId: string;
  flagType: "injured" | "missing" | "deceased";
  description: string;
  photoUrl?: string | null;
}) {
  const { data: user } = await supabase.auth.getUser();
  if (!user.user) throw new Error("Not signed in");
  const { error } = await supabase.from("cat_health_flags").insert({
    cat_id: input.catId,
    flagged_by: user.user.id,
    flag_type: input.flagType,
    description: input.description,
    photo_url: input.photoUrl ?? null,
  });
  if (error) throw error;
}

// Returns cats with their centroid lng/lat so the Map tab can pin markers
// at the correct location instead of clustering them at the user's spot.
export async function fetchCatsInRadius(lat: number, lng: number, radius_m = 50_000, max_rows = 500) {
  const { data, error } = await supabase.rpc("cats_in_radius", {
    lat, lng, radius_m, max_rows,
  });
  if (error) throw error;
  return data ?? [];
}

export async function fetchPendingIdentifications(lat?: number, lng?: number) {
  const { data, error } = await supabase.rpc("pending_identifications", {
    lat: lat ?? null,
    lng: lng ?? null,
    radius_m: 50_000,
    max_rows: 30,
  });
  if (error) throw error;
  return data ?? [];
}

export async function fetchPendingIdentificationCount(lat?: number, lng?: number): Promise<number> {
  const { data, error } = await supabase.rpc("pending_identification_count", {
    lat: lat ?? null,
    lng: lng ?? null,
    radius_m: 50_000,
  });
  if (error) throw error;
  return (data as unknown as number) ?? 0;
}

// Cast a vote on a pending sighting. Either propose an existing cat or vote
// 'this is a new cat'. The trigger on identification_votes auto-resolves
// when thresholds are met.
export async function castIdentificationVote(input: {
  sightingId: string;
  proposedCatId?: string | null;
  proposedNew?: boolean;
}) {
  const { data: user } = await supabase.auth.getUser();
  if (!user.user) throw new Error("Not signed in");
  const { error } = await supabase.from("identification_votes").insert({
    sighting_id: input.sightingId,
    voter_id: user.user.id,
    proposed_cat_id: input.proposedCatId ?? null,
    proposed_new: input.proposedNew ?? false,
  });
  if (error) throw error;
}

// Sightings posted by the calling user, including pending_id ones in the
// community-ID queue. Newest first.
export async function fetchMyPosts() {
  const { data: user } = await supabase.auth.getUser();
  if (!user.user) return [];
  const { data, error } = await supabase
    .from("sightings")
    .select("id, photo_url, caption, status, created_at, cat_id, cats(name)")
    .eq("photographer_id", user.user.id)
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) throw error;
  return data ?? [];
}

export async function fetchCurrentUserProfile() {
  const { data: user } = await supabase.auth.getUser();
  if (!user.user) return null;
  const { data, error } = await supabase
    .from("users")
    .select("*")
    .eq("id", user.user.id)
    .single();
  // PGRST116 = "no rows" — happens after a `supabase db reset` if a stale
  // auth token still lives in AsyncStorage. Sign out so the welcome screen
  // can take over instead of the Profile tab spinning forever.
  if (error?.code === "PGRST116") {
    await supabase.auth.signOut();
    return null;
  }
  if (error) throw error;
  return data;
}

export async function fetchUserStickers(userId: string) {
  const { data, error } = await supabase
    .from("user_stickers")
    .select("unlocked_at, stickers(id, name, image_url, sticker_packs(id, name, artist_name, unlock_threshold))")
    .eq("user_id", userId)
    .order("unlocked_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function fetchStickerPacks() {
  const { data, error } = await supabase
    .from("sticker_packs")
    .select("*, stickers(id, name, image_url, sort_order)")
    .order("unlock_threshold", { ascending: true });
  if (error) throw error;
  return data ?? [];
}
