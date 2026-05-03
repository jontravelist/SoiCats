import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";

import { Screen } from "@/components/Screen";
import { Button } from "@/components/Button";
import { useAuthStore } from "@/stores/auth";
import { useProfile } from "@/hooks/useProfile";
import { colors, spacing, typography } from "@/lib/theme";

export default function ProfileTab() {
  const { t } = useTranslation();
  const router = useRouter();
  const session = useAuthStore((s) => s.session);
  const signOut = useAuthStore((s) => s.signOut);
  const { data: profile, isLoading } = useProfile();

  if (!session) {
    return (
      <Screen style={styles.center}>
        <Text style={styles.bigEmoji}>🐈</Text>
        <Text style={styles.h1}>{t("app.name")}</Text>
        <Text style={styles.tagline}>{t("app.tagline")}</Text>
        <Text style={styles.body}>
          Sign in to photograph cats, name them, and unlock sticker packs from local artists.
        </Text>
        <Button label="Sign in or sign up" onPress={() => router.push("/auth")} style={{ minWidth: 240 }} />
      </Screen>
    );
  }

  if (isLoading || !profile) {
    return <Screen><ActivityIndicator style={{ flex: 1 }} /></Screen>;
  }

  return (
    <Screen scroll>
      <View style={styles.header}>
        {profile.avatar_url ? (
          <Image source={profile.avatar_url} style={styles.avatar} />
        ) : (
          <View style={[styles.avatar, styles.avatarPlaceholder]}>
            <Text style={{ fontSize: 32 }}>🐈</Text>
          </View>
        )}
        <Text style={styles.handle}>@{profile.handle ?? "anon"}</Text>
        <Text style={styles.points}>{t("profile.points", { count: profile.points })}</Text>
      </View>

      <View style={styles.section}>
        <Button label={t("profile.edit")} variant="secondary" onPress={() => router.push("/profile/edit")} />
        <Button label={t("profile.signOut")} variant="ghost" onPress={() => void signOut()} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: spacing(6), gap: spacing(3) },
  bigEmoji: { fontSize: 80 },
  h1: { ...typography.h1 },
  tagline: { ...typography.body, color: colors.textDim, textAlign: "center" },
  body: { ...typography.body, color: colors.text, textAlign: "center", paddingHorizontal: spacing(4) },
  header: { alignItems: "center", padding: spacing(6), gap: spacing(2) },
  avatar: { width: 96, height: 96, borderRadius: 48, backgroundColor: colors.border },
  avatarPlaceholder: { alignItems: "center", justifyContent: "center" },
  handle: { ...typography.h2 },
  points: { ...typography.body, color: colors.primary, fontWeight: "600" },
  section: { paddingHorizontal: spacing(4), gap: spacing(2) },
});
