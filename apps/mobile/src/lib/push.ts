import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import { Platform } from "react-native";
import Constants from "expo-constants";
import { supabase } from "@/lib/supabase";

// Show banners + sound for foreground notifications too. Most apps want
// this on so the user notices a comment or flag while they're inside the app.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

// Register the device for push and persist the Expo Push token to Supabase.
// Safe to call repeatedly — the unique constraint on token + upsert keeps
// the table clean. Returns null when running on a simulator or when the
// projectId hasn't been wired up yet (Expo Go before EAS init).
export async function registerForPush(userId: string): Promise<string | null> {
  if (!Device.isDevice) return null;

  const projectId = Constants.expoConfig?.extra?.eas?.projectId;
  if (!projectId || projectId === "TODO-set-via-eas-init") {
    // Without an EAS projectId, Expo Push tokens can't be issued. Return
    // gracefully so dev iteration doesn't error every launch.
    return null;
  }

  const existing = await Notifications.getPermissionsAsync();
  let status = existing.status;
  if (status !== "granted") {
    const requested = await Notifications.requestPermissionsAsync();
    status = requested.status;
  }
  if (status !== "granted") return null;

  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: "default",
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }

  const tokenResp = await Notifications.getExpoPushTokenAsync({ projectId });
  const token = tokenResp.data;

  await supabase
    .from("device_tokens")
    .upsert({
      user_id: userId,
      token,
      platform: Platform.OS === "ios" ? "ios" : "android",
      last_seen_at: new Date().toISOString(),
    }, { onConflict: "token" });

  return token;
}

// Fire-and-forget call to the send-push edge function. Failures are logged
// but never surfaced — a missed notification shouldn't break the action
// that triggered it.
export async function sendPush(input: {
  userIds: string[];
  title: string;
  body: string;
  category: keyof NotificationCategoryMap;
  data?: Record<string, unknown>;
}) {
  try {
    await supabase.functions.invoke("send-push", {
      body: {
        user_ids: input.userIds,
        title: input.title,
        body: input.body,
        category: input.category,
        data: input.data ?? {},
      },
    });
  } catch (e) {
    console.warn("send-push failed", e);
  }
}

// Settings keys that match notification_settings columns and the category
// gate inside the send-push edge function.
export interface NotificationCategoryMap {
  favourite_cat_photo: boolean;
  injured_or_missing: boolean;
  sticker_unlocked: boolean;
  comment_on_my_photo: boolean;
  identify_resolved: boolean;
}
