// Edge Function: recompute-stat-champions
// POST /functions/v1/recompute-stat-champions
//
// Computes champions for every (district, stat) combination. Production:
// pg_cron nightly. Locally: invoke manually via supabase functions invoke
// or run `select recompute_stat_champions();` in SQL.

import { adminClient, HttpError, requireUser } from "../_shared/supabase.ts";
import { corsHeaders, jsonResponse } from "../_shared/cors.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { id: userId } = await requireUser(req);
    const admin = adminClient();
    const { data: me } = await admin.from("users").select("role").eq("id", userId).single();
    if (me?.role !== "app_admin") throw new HttpError(403, "Admin only");

    const { data, error } = await admin.rpc("recompute_stat_champions");
    if (error) throw new HttpError(500, error.message);

    return jsonResponse({ titles_changed: data });
  } catch (err) {
    if (err instanceof HttpError) {
      return jsonResponse({ error: err.message }, { status: err.status });
    }
    console.error(err);
    return jsonResponse({ error: "internal" }, { status: 500 });
  }
});
