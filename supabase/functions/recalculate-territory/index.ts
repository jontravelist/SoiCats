// Edge Function: recalculate-territory
// POST /functions/v1/recalculate-territory
// body: { cat_id: uuid }
//
// Manual trigger for the territory recalculation. The DB trigger on sightings
// already handles the common case; this endpoint is for admin use after bulk
// edits, status changes, etc.

import { adminClient, HttpError, requireUser } from "../_shared/supabase.ts";
import { corsHeaders, jsonResponse } from "../_shared/cors.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { id: caller } = await requireUser(req);
    const { cat_id } = await req.json();
    if (!cat_id) throw new HttpError(400, "cat_id required");

    const admin = adminClient();
    const { data: callerUser } = await admin
      .from("users")
      .select("role")
      .eq("id", caller)
      .single();
    if (callerUser?.role !== "app_admin") {
      throw new HttpError(403, "Admin only");
    }

    const { error } = await admin.rpc("recalculate_territory", { target_cat_id: cat_id });
    if (error) throw new HttpError(500, error.message);
    return jsonResponse({ ok: true });
  } catch (err) {
    if (err instanceof HttpError) {
      return jsonResponse({ error: err.message }, { status: err.status });
    }
    console.error(err);
    return jsonResponse({ error: "internal" }, { status: 500 });
  }
});
