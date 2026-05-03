import { useEffect, useState } from "react";
import { Alert, StyleSheet, Switch, Text, View } from "react-native";
import { useRouter } from "expo-router";

import { Screen } from "@/components/Screen";
import { Button } from "@/components/Button";
import { useAuthStore } from "@/stores/auth";
import { supabase } from "@/lib/supabase";
import { colors, radius, shadow, spacing, typography } from "@/lib/theme";

interface Settings {
  favourite_cat_photo: boolean;
  injured_or_missing: boolean;
  sticker_unlocked: boolean;
  comment_on_my_photo: boolean;
  identify_resolved: boolean;
}

const DEFAULTS: Settings = {
  favourite_cat_photo: true,
  injured_or_missing:  true,
  sticker_unlocked:    true,
  comment_on_my_photo: false,
  identify_resolved:   true,
};

const ROWS: Array<{ key: keyof Settings; title: string; body: string }> = [
  { key: "favourite_cat_photo", title: "Favourite cats",       body: "When a cat you favourited gets a new photo." },
  { key: "injured_or_missing",  title: "Injured or missing",   body: "When a flag is verified for a cat near you." },
  { key: "sticker_unlocked",    title: "Sticker unlocks",      body: "When you cross a points threshold." },
  { key: "identify_resolved",   title: "ID queue resolved",    body: "When the community identifies your photo." },
  { key: "comment_on_my_photo", title: "Comments on my photo", body: "When someone comments on your photo." },
];

export default function NotificationSettings() {
  const session = useAuthStore((s) => s.session);
  const router = useRouter();
  const [settings, setSettings] = useState<Settings>(DEFAULTS);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!session) return;
    void (async () => {
      const { data } = await supabase
        .from("notification_settings")
        .select("*")
        .eq("user_id", session.user.id)
        .maybeSingle();
      if (data) setSettings({ ...DEFAULTS, ...data });
    })();
  }, [session?.user.id]);

  if (!session) {
    return (
      <Screen style={styles.center}>
        <Text>Sign in to manage notifications.</Text>
        <Button label="Sign in" onPress={() => router.push("/auth")} />
      </Screen>
    );
  }

  const save = async () => {
    setBusy(true);
    const { error } = await supabase
      .from("notification_settings")
      .upsert({ user_id: session.user.id, ...settings });
    setBusy(false);
    if (error) {
      Alert.alert("Couldn't save", error.message);
      return;
    }
    router.back();
  };

  return (
    <Screen scroll>
      <View style={styles.container}>
        <Text style={styles.h1}>Notifications</Text>
        <Text style={styles.intro}>
          Choose which alerts to receive. We never send marketing — only the
          ones below.
        </Text>

        {ROWS.map(({ key, title, body }) => (
          <View key={key} style={styles.row}>
            <View style={styles.rowText}>
              <Text style={styles.rowTitle}>{title}</Text>
              <Text style={styles.rowBody}>{body}</Text>
            </View>
            <Switch
              value={settings[key]}
              onValueChange={(v) => setSettings((s) => ({ ...s, [key]: v }))}
              trackColor={{ false: colors.border, true: colors.primary }}
            />
          </View>
        ))}

        <Button label="Save" onPress={save} loading={busy} style={{ marginTop: spacing(4) }} />
        <Button label="Cancel" variant="ghost" onPress={() => router.back()} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: { padding: spacing(5), gap: spacing(2) },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: spacing(6), gap: spacing(3) },
  h1: { ...typography.h1, color: colors.text },
  intro: { ...typography.body, color: colors.textDim, marginBottom: spacing(2) },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing(3),
    padding: spacing(3),
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    ...shadow.card,
  },
  rowText: { flex: 1 },
  rowTitle: { ...typography.h3, color: colors.text },
  rowBody: { ...typography.small, color: colors.textDim, marginTop: 2 },
});
