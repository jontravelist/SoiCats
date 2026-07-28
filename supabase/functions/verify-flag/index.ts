// Edge Function: verify-flag
// POST /functions/v1/verify-flag
// body: { flag_id: uuid }
//
// Decides whether a dog_health_flags row crosses the verification threshold.
// Verification rule from BRIEF Section 7.7:
//  - Verified-feeder flag = auto-verified.
//  - Standard-user flag = needs a second open flag for the same dog or admin review.
// On verification:
//  - dogs.status updated.
//  - 30-point bonus written for the original flagger.
//  - Push notification fan-out queued (Expo Push call would happen here in prod;
//    we leave a stub log).

import { adminClient, HttpError, requireUser } from "../_shared/supabase.ts";
import { corsHeaders, jsonResponse } from "../_shared/cors.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { id: caller } = await requireUser(req);
    const { flag_id } = await req.json();
    if (!flag_id) throw new HttpError(400, "flag_id required");

    const admin = adminClient();
    const { data: flag, error } = await admin
      .from("dog_health_flags")
      .select("*")
      .eq("id", flag_id)
      .single();
    if (error || !flag) throw new HttpError(404, "Flag not found");
    if (flag.status !== "open") {
      return jsonResponse({ verified: flag.status === "verified", reason: "already_processed" });
    }

    const { data: flagger } = await admin
      .from("users")
      .select("role")
      .eq("id", flag.flagged_by)
      .single();
    const { data: callerUser } = await admin
      .from("users")
      .select("role")
      .eq("id", caller)
      .single();

    const isAdmin     = callerUser?.role === "app_admin";
    const flaggerIsFeeder = flagger?.role === "feeder" || flagger?.role === "app_admin";

    let shouldVerify = false;
    if (isAdmin) {
      shouldVerify = true;
    } else if (flaggerIsFeeder) {
      shouldVerify = true;
    } else {
      const { count } = await admin
        .from("dog_health_flags")
        .select("id", { count: "exact", head: true })
        .eq("dog_id", flag.dog_id)
        .eq("flag_type", flag.flag_type)
        .neq("id", flag.id)
        .in("status", ["open", "verified"]);
      shouldVerify = (count ?? 0) >= 1;
    }

    if (!shouldVerify) {
      return jsonResponse({ verified: false, reason: "needs_corroboration" });
    }

    // Apply the verification.
    await admin
      .from("dog_health_flags")
      .update({ status: "verified", verified_at: new Date().toISOString(), verified_by: caller })
      .eq("id", flag.id);

    const newDogStatus =
      flag.flag_type === "deceased" ? "deceased"
      : flag.flag_type === "missing" ? "missing"
      : "injured";
    await admin.from("dogs").update({ status: newDogStatus }).eq("id", flag.dog_id);

    // 30-point bonus to the original flagger.
    await admin.from("points_log").insert({
      user_id: flag.flagged_by,
      action_type: "flag_verified",
      points: 30,
      related_entity_id: flag.id,
      related_entity_type: "dog_health_flag",
    });

    // TODO: fan out push notifications via Expo Push:
    //  - users within 1km of the dog's territory_centroid
    //  - feeders within 2km
    // We stub this by logging. The actual Expo Push call belongs in a
    // dedicated `notify` function so it can be retried independently.
    console.log(`Flag ${flag.id} verified — push fan-out pending`);

    return jsonResponse({ verified: true });
  } catch (err) {
    if (err instanceof HttpError) {
      return jsonResponse({ error: err.message }, { status: err.status });
    }
    console.error(err);
    return jsonResponse({ error: "internal" }, { status: 500 });
  }
});
