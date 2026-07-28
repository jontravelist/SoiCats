// Edge Function: send-push
// POST /functions/v1/send-push
// body: { user_ids: uuid[], title: string, body: string, category: string, data?: object }
//
// Looks up the device tokens for each user, filters by their notification
// preferences (skip if the relevant category is disabled), batches into
// chunks of 100 per the Expo Push API contract, and dispatches.
//
// Best-effort: any failure logs and continues; the caller (mobile client or
// DB trigger) shouldn't fail the original action just because a push didn't
// land.

import { adminClient, HttpError, requireUser } from "../_shared/supabase.ts";
import { corsHeaders, jsonResponse } from "../_shared/cors.ts";

type Category =
  | "favourite_dog_photo"
  | "injured_or_missing"
  | "sticker_unlocked"
  | "comment_on_my_photo"
  | "identify_resolved";

const CATEGORY_COLUMNS: Record<Category, string> = {
  favourite_dog_photo: "favourite_dog_photo",
  injured_or_missing:  "injured_or_missing",
  sticker_unlocked:    "sticker_unlocked",
  comment_on_my_photo: "comment_on_my_photo",
  identify_resolved:   "identify_resolved",
};

interface PushMessage {
  to: string;
  sound: "default";
  title: string;
  body: string;
  data?: Record<string, unknown>;
}

const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    // Authenticated only — DB triggers using pg_net should pass the service-role
    // key as the Authorization header so requireUser still resolves. We don't
    // restrict by role; any signed-in caller can ask to push to anyone, and
    // category preferences gate at the recipient end.
    await requireUser(req);

    const { user_ids, title, body, category, data } = await req.json();
    if (!Array.isArray(user_ids) || user_ids.length === 0) {
      throw new HttpError(400, "user_ids required");
    }
    if (typeof title !== "string" || typeof body !== "string") {
      throw new HttpError(400, "title and body required");
    }
    if (!CATEGORY_COLUMNS[category as Category]) {
      throw new HttpError(400, `unknown category ${category}`);
    }

    const admin = adminClient();
    const prefColumn = CATEGORY_COLUMNS[category as Category];

    // Recipients with the category enabled. Treat missing settings rows as
    // 'enabled' since the schema's defaults match the BRIEF defaults.
    const { data: settings } = await admin
      .from("notification_settings")
      .select(`user_id, ${prefColumn}`)
      .in("user_id", user_ids);

    const optedOut = new Set(
      (settings ?? []).filter((s: any) => s[prefColumn] === false).map((s: any) => s.user_id),
    );
    const opted = user_ids.filter((id: string) => !optedOut.has(id));
    if (opted.length === 0) return jsonResponse({ sent: 0, skipped: user_ids.length });

    const { data: tokens } = await admin
      .from("device_tokens")
      .select("token, user_id")
      .in("user_id", opted);

    if (!tokens || tokens.length === 0) {
      return jsonResponse({ sent: 0, skipped: user_ids.length, reason: "no_tokens" });
    }

    const messages: PushMessage[] = tokens.map((t) => ({
      to: t.token,
      sound: "default",
      title,
      body,
      data: { category, ...(data ?? {}) },
    }));

    // Expo Push API takes up to 100 messages per call.
    let sent = 0;
    for (let i = 0; i < messages.length; i += 100) {
      const chunk = messages.slice(i, i + 100);
      const r = await fetch(EXPO_PUSH_URL, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          accept: "application/json",
          "accept-encoding": "gzip, deflate",
        },
        body: JSON.stringify(chunk),
      });
      if (!r.ok) {
        console.warn("Expo Push API non-OK", r.status, await r.text());
        continue;
      }
      sent += chunk.length;
    }

    return jsonResponse({ sent });
  } catch (err) {
    if (err instanceof HttpError) {
      return jsonResponse({ error: err.message }, { status: err.status });
    }
    console.error(err);
    return jsonResponse({ error: "internal" }, { status: 500 });
  }
});
