// Edge Function: compute-phash
// POST /functions/v1/compute-phash
// body: { sighting_id: uuid, photo_url: string }
//
// Downloads the freshly uploaded photo from Storage, computes a pHash, and
// stores it on sightings.photo_hash. Called by the mobile client after a
// successful upload, before award-points.

import { adminClient, HttpError, requireUser } from "../_shared/supabase.ts";
import { corsHeaders, jsonResponse } from "../_shared/cors.ts";
import { pHash } from "../_shared/phash.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { id: userId } = await requireUser(req);
    const { sighting_id, photo_url } = await req.json();
    if (!sighting_id || !photo_url) {
      throw new HttpError(400, "sighting_id and photo_url required");
    }

    const admin = adminClient();
    const { data: sighting, error } = await admin
      .from("sightings")
      .select("id, photographer_id, photo_hash")
      .eq("id", sighting_id)
      .single();
    if (error || !sighting) throw new HttpError(404, "Sighting not found");
    if (sighting.photographer_id !== userId) throw new HttpError(403, "Not your sighting");
    if (sighting.photo_hash) {
      return jsonResponse({ photo_hash: sighting.photo_hash, cached: true });
    }

    const res = await fetch(photo_url);
    if (!res.ok) throw new HttpError(400, `Could not fetch photo: ${res.status}`);
    const bytes = new Uint8Array(await res.arrayBuffer());
    const hash = await pHash(bytes);

    await admin.from("sightings").update({ photo_hash: hash }).eq("id", sighting.id);
    return jsonResponse({ photo_hash: hash, cached: false });
  } catch (err) {
    if (err instanceof HttpError) {
      return jsonResponse({ error: err.message }, { status: err.status });
    }
    console.error(err);
    return jsonResponse({ error: "internal" }, { status: 500 });
  }
});
