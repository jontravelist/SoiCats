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
