// Edge Function: award-points
// POST /functions/v1/award-points
// body: { sighting_id: uuid }
//
// Server-side enforcement of the points rules (Section 9 of BRIEF.md):
// - Daily cap of 100 points per user.
// - Same-cat-same-place farming: 0 points if same user posted same cat within 50m in last 4h.
// - Duplicate photo (pHash within Hamming distance 5 in last 30 days): 0 points.
// - Account age gate for discoverer + welfare check bonuses.
// - "Help identify" delayed awards happen via verify-flag/queue-resolution path.
//
// The mobile client calls this *after* a sighting row has been inserted by the user
// (RLS makes sure they can only insert their own). This function then computes
// the correct point value, writes a points_log row, and updates the sighting's
// `points_awarded`. The trigger on points_log keeps users.points and stickers in sync.

import { adminClient, HttpError, requireUser } from "../_shared/supabase.ts";
import { corsHeaders, jsonResponse } from "../_shared/cors.ts";
import { hammingHex } from "../_shared/phash.ts";

const DAILY_CAP = 100;
const FARMING_RADIUS_M = 50;
const FARMING_WINDOW_HOURS = 4;
const NEW_CAT_BONUS = 25;
const EXISTING_CAT_POINTS = 10;
const WELFARE_CHECK_BONUS = 15;
const ACCOUNT_AGE_GATE_HOURS = 24;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { id: userId } = await requireUser(req);
    const { sighting_id } = await req.json();
    if (!sighting_id) throw new HttpError(400, "sighting_id required");

    const admin = adminClient();

    // Fetch sighting + user.
    const [{ data: sighting, error: sErr }, { data: user, error: uErr }] = await Promise.all([
      admin.from("sightings").select("*").eq("id", sighting_id).single(),
      admin.from("users").select("created_at").eq("id", userId).single(),
    ]);
    if (sErr || !sighting) throw new HttpError(404, "Sighting not found");
    if (uErr || !user) throw new HttpError(404, "User not found");
    if (sighting.photographer_id !== userId) throw new HttpError(403, "Not your sighting");
    if (sighting.points_awarded > 0) {
      return jsonResponse({ awarded: 0, reason: "already_awarded" });
    }

    const accountAgeMs = Date.now() - new Date(user.created_at).getTime();
    const accountAgeHours = accountAgeMs / 3_600_000;

    // 1. Daily cap.
    const { data: todayRows } = await admin.rpc("points_today", { target_user: userId });
    const pointsToday = (todayRows as unknown as number) ?? 0;
    if (pointsToday >= DAILY_CAP) {
      return jsonResponse({ awarded: 0, reason: "daily_cap" });
    }

    // 2. Pending ID sightings don't award yet — that happens at queue resolution.
    if (sighting.status === "pending_id" || sighting.cat_id === null) {
      return jsonResponse({ awarded: 0, reason: "pending_id" });
    }

    // 3. Farming check: same user, same cat, within FARMING_RADIUS_M, in last
    //    FARMING_WINDOW_HOURS. Done via a SQL RPC because PostgREST cannot
    //    express ST_DWithin against a column the way we want here.
    const since = new Date(Date.now() - FARMING_WINDOW_HOURS * 3_600_000).toISOString();
    const { data: farmingHit } = await admin.rpc("recent_close_sighting", {
      photographer: userId,
      target_cat: sighting.cat_id,
      exclude_id: sighting.id,
      radius_m: FARMING_RADIUS_M,
      since,
    });
    if (farmingHit) {
      return jsonResponse({ awarded: 0, reason: "farming" });
    }

    // 4. Duplicate-photo check via pHash.
    if (sighting.photo_hash) {
      const { data: recentHashes } = await admin
        .from("sightings")
        .select("id, photo_hash")
        .eq("photographer_id", userId)
        .neq("id", sighting.id)
        .gte("created_at", new Date(Date.now() - 30 * 86_400_000).toISOString())
        .not("photo_hash", "is", null);

      const dup = (recentHashes ?? []).find(
        (r) => r.photo_hash && hammingHex(r.photo_hash, sighting.photo_hash!) < 5,
      );
      if (dup) {
        return jsonResponse({ awarded: 0, reason: "duplicate_photo" });
      }
    }

    // 5. Decide point value.
    let actionType: string;
    let points: number;

    // Was this user the discoverer (the cat row references them and this is the
    // first sighting of that cat)?
    const { data: cat } = await admin
      .from("cats")
      .select("discovered_by_user_id, last_seen_at, created_at")
      .eq("id", sighting.cat_id)
      .single();

    const { count: priorCount } = await admin
      .from("sightings")
      .select("id", { count: "exact", head: true })
      .eq("cat_id", sighting.cat_id)
      .lt("created_at", sighting.created_at);

    const isFirstEverPhoto = (priorCount ?? 0) === 0;

    if (
      isFirstEverPhoto &&
      cat?.discovered_by_user_id === userId &&
      accountAgeHours >= ACCOUNT_AGE_GATE_HOURS
    ) {
      actionType = "discoverer_bonus";
      points = NEW_CAT_BONUS;
    } else {
      // Welfare check bonus — cat unseen for >= 14 days before this sighting.
      const lastSeenBeforeMs = cat?.last_seen_at
        ? new Date(cat.last_seen_at).getTime()
        : 0;
      const gapDays = (Date.now() - lastSeenBeforeMs) / 86_400_000;
      if (gapDays >= 14 && accountAgeHours >= ACCOUNT_AGE_GATE_HOURS) {
        actionType = "welfare_check";
        points = WELFARE_CHECK_BONUS;
      } else {
        actionType = "photo_existing_cat";
        points = EXISTING_CAT_POINTS;
      }
    }

    // 6. Apply daily cap (partial credit).
    const headroom = DAILY_CAP - pointsToday;
    points = Math.max(0, Math.min(points, headroom));
    if (points === 0) {
      return jsonResponse({ awarded: 0, reason: "daily_cap" });
    }

    // 7. Write points log + sighting.points_awarded atomically (via two writes;
    //    the points_log trigger updates users.points + unlocks stickers).
    const { error: logErr } = await admin.from("points_log").insert({
      user_id: userId,
      action_type: actionType,
      points,
      related_entity_id: sighting.id,
      related_entity_type: "sighting",
    });
    if (logErr) throw new HttpError(500, logErr.message);

    await admin
      .from("sightings")
      .update({ points_awarded: points })
      .eq("id", sighting.id);

    return jsonResponse({ awarded: points, action: actionType });
  } catch (err) {
    if (err instanceof HttpError) {
      return jsonResponse({ error: err.message }, { status: err.status });
    }
    console.error(err);
    return jsonResponse({ error: "internal" }, { status: 500 });
  }
});
