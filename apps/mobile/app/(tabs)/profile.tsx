import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";

import { Screen } from "@/components/Screen";
import { Button } from "@/components/Button";
import { DogGlyph } from "@/components/DogGlyph";
import { useAuthStore } from "@/stores/auth";
import { useProfile } from "@/hooks/useProfile";
import { fetchMyPosts, fetchStickerPacks, fetchUserStickers } from "@/lib/api";
import { colors, radius, shadow, spacing, typography } from "@/lib/theme";

export default function ProfileTab() {
  const { t } = useTranslation();
  const router = useRouter();
  const session = useAuthStore((s) => s.session);
  const signOut = useAuthStore((s) => s.signOut);
  const { data: profile, isLoading } = useProfile();

  const ownedQ = useQuery({
    queryKey: ["my-stickers", session?.user.id],
    queryFn: () => fetchUserStickers(session!.user.id),
    enabled: !!session,
  });
  const packsQ = useQuery({ queryKey: ["sticker-packs"], queryFn: fetchStickerPacks });
  const myPostsQ = useQuery({
    queryKey: ["my-posts", session?.user.id],
    queryFn: fetchMyPosts,
    enabled: !!session,
  });

  if (!session) {
    return (
      <Screen style={styles.center}>
        <DogGlyph color={colors.primary} secondary={colors.text} size={140} pose={2} />
        <Text style={styles.h1}>{t("app.name")}</Text>
        <Text style={styles.tagline}>{t("app.tagline")}</Text>
        <Text style={styles.body}>
          Sign in to photograph dogs, name them, and unlock sticker packs from local artists.
        </Text>
        <Button label="Sign in or sign up" onPress={() => router.push("/auth")} style={{ minWidth: 240 }} />
      </Screen>
    );
  }

  if (isLoading || !profile) {
    return <Screen><ActivityIndicator style={{ flex: 1 }} /></Screen>;
  }

  const points = profile.points;
  const nextPack = (packsQ.data ?? []).find((p) => p.unlock_threshold > points);
  const recentStickers = (ownedQ.data ?? []).slice(0, 3);

  return (
    <Screen scroll>
      <View style={styles.header}>
        {profile.avatar_url ? (
          <Image source={profile.avatar_url} style={styles.avatar} />
        ) : (
          <View style={[styles.avatar, styles.avatarPlaceholder]}>
            <DogGlyph color={colors.accent} secondary={colors.text} size={64} pose={0} />
          </View>
        )}
        <Text style={styles.handle}>@{profile.handle ?? "anon"}</Text>
        {profile.display_name ? <Text style={styles.displayName}>{profile.display_name}</Text> : null}
        <View style={styles.pointsPill}>
          <Text style={styles.pointsText}>{t("profile.points", { count: profile.points })}</Text>
        </View>
      </View>

      {/* Stat strip per the Soi Sunset profile spec. Counts are placeholders
          until we wire actual aggregations (dogs spotted, feeds logged,
          streak). For MVP they pull from data we already have. */}
      <View style={styles.statStrip}>
        <StatCell label="Dogs spotted" value={(myPostsQ.data ?? []).length} />
        <StatCell label="Stickers"     value={(ownedQ.data ?? []).length} />
        <StatCell label="Points"       value={profile.points} />
      </View>

      {/* Stickers section. Tap any sticker or the header to open the full drawer. */}
      <Pressable onPress={() => router.push("/stickers")} style={styles.stickerCard}>
        <View style={styles.stickerHeader}>
          <Text style={styles.sectionTitle}>Stickers</Text>
          <Text style={styles.sectionLink}>View all →</Text>
        </View>
        {nextPack ? (
          <Text style={styles.progress}>
            {t("stickers.progress", { points, next: nextPack.unlock_threshold, packName: nextPack.name })}
          </Text>
        ) : (
          <Text style={styles.progress}>{t("stickers.unlockedAll")}</Text>
        )}
        <View style={styles.stickerRow}>
          {recentStickers.length > 0 ? (
            recentStickers.map((row) => {
              const s = row.stickers;
              if (!s) return null;
              return (
                <View key={s.id} style={styles.stickerThumbWrap}>
                  <Image source={s.image_url} style={styles.stickerThumb} contentFit="contain" />
                </View>
              );
            })
          ) : (
            <Text style={styles.stickerEmpty}>Earn 100 points to unlock your first pack.</Text>
          )}
        </View>
      </Pressable>

      <View style={styles.section}>
        <Button label="My posts" variant="secondary" onPress={() => router.push("/profile/my-posts")} />
        <Button label={t("profile.edit")} variant="secondary" onPress={() => router.push("/profile/edit")} />
        <Button label="Notifications" variant="secondary" onPress={() => router.push("/profile/notifications")} />
        {profile.role === "user" ? (
          <Button label="Apply to be a Verified Feeder" variant="ghost" onPress={() => router.push("/profile/apply-feeder")} />
        ) : null}
        {profile.role === "app_admin" ? (
          <Button label="Admin" variant="accent" onPress={() => router.push("/admin")} />
        ) : null}
        <Button label={t("profile.signOut")} variant="ghost" onPress={() => void signOut()} />
      </View>
    </Screen>
  );
}

function StatCell({ label, value }: { label: string; value: number }) {
  return (
    <View style={styles.statCell}>
      <Text style={styles.statValue}>{value.toLocaleString()}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: spacing(6), gap: spacing(3) },
  bigEmoji: { fontSize: 80 },
  h1: { ...typography.h1, color: colors.text },
  tagline: { ...typography.body, color: colors.textDim, textAlign: "center" },
  body: { ...typography.body, color: colors.text, textAlign: "center", paddingHorizontal: spacing(4) },

  header: { alignItems: "center", padding: spacing(6), gap: spacing(2) },
  avatar: { width: 112, height: 112, borderRadius: 56, backgroundColor: colors.surface, ...shadow.card },
  avatarPlaceholder: { alignItems: "center", justifyContent: "center" },
  handle: { ...typography.h2, color: colors.text },
  displayName: { ...typography.body, color: colors.textDim },
  pointsPill: {
    paddingHorizontal: 14, paddingVertical: 6, borderRadius: radius.pill,
    backgroundColor: colors.accent, marginTop: spacing(1),
  },
  pointsText: { color: "#fff", fontWeight: "700" },

  statStrip: {
    flexDirection: "row",
    marginHorizontal: spacing(4),
    marginBottom: spacing(2),
    paddingVertical: spacing(3),
    paddingHorizontal: spacing(2),
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    ...shadow.card,
  },
  statCell: { flex: 1, alignItems: "center" },
  statValue: { fontSize: 22, fontWeight: "900", color: colors.text, letterSpacing: -0.5, fontVariant: ["tabular-nums"] },
  statLabel: { ...typography.label, fontSize: 10, color: colors.textDim, marginTop: 2 },

  stickerCard: {
    marginHorizontal: spacing(4),
    marginVertical: spacing(2),
    padding: spacing(4),
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    ...shadow.card,
  },
  stickerHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: spacing(2) },
  sectionTitle: { ...typography.h3, color: colors.text },
  sectionLink: { ...typography.body, color: colors.primary, fontWeight: "700" },
  progress: { ...typography.small, color: colors.textDim, marginBottom: spacing(2) },
  stickerRow: { flexDirection: "row", gap: spacing(2) },
  stickerThumbWrap: {
    width: 64, height: 64, borderRadius: radius.md,
    backgroundColor: colors.bg, padding: 6, alignItems: "center", justifyContent: "center",
  },
  stickerThumb: { width: "100%", height: "100%" },
  stickerEmpty: { ...typography.small, color: colors.textDim, fontStyle: "italic" },

  section: { paddingHorizontal: spacing(4), paddingVertical: spacing(2), gap: spacing(2) },
});
