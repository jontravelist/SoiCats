// Edge Function: compute-weekly-winners
// POST /functions/v1/compute-weekly-winners
//
// Snapshots last week's top 3 photos per district into
// weekly_leaderboard_winners and awards bonus points. Idempotent.
//
// Production: invoked by pg_cron every Monday 00:00 ICT (Sunday 17:00 UTC).
// Locally and pre-EAS: call manually via `supabase functions invoke
// compute-weekly-winners` or run `select freeze_weekly_winners();` in SQL.

import { adminClient, HttpError, requireUser } from "../_shared/supabase.ts";
import { corsHeaders, jsonResponse } from "../_shared/cors.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    // Require admin caller. Cron uses the service-role key which bypasses
    // this — requireUser only resolves for human admins.
    const { id: userId } = await requireUser(req);
    const admin = adminClient();
    const { data: me } = await admin.from("users").select("role").eq("id", userId).single();
    if (me?.role !== "app_admin") throw new HttpError(403, "Admin only");

    const { data, error } = await admin.rpc("freeze_weekly_winners");
    if (error) throw new HttpError(500, error.message);

    return jsonResponse({ inserted: data });
  } catch (err) {
    if (err instanceof HttpError) {
      return jsonResponse({ error: err.message }, { status: err.status });
    }
    console.error(err);
    return jsonResponse({ error: "internal" }, { status: 500 });
  }
});
