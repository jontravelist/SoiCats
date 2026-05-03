import { ActivityIndicator, FlatList, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";

import { Screen } from "@/components/Screen";
import { StickerTile } from "@/components/StickerTile";
import { fetchStickerPacks, fetchUserStickers } from "@/lib/api";
import { useAuthStore } from "@/stores/auth";
import { colors, spacing, typography } from "@/lib/theme";
import { useProfile } from "@/hooks/useProfile";

export default function StickersTab() {
  const { t } = useTranslation();
  const router = useRouter();
  const session = useAuthStore((s) => s.session);
  const profile = useProfile();

  const packsQ = useQuery({ queryKey: ["sticker-packs"], queryFn: fetchStickerPacks });
  const ownedQ = useQuery({
    queryKey: ["my-stickers", session?.user.id],
    queryFn: () => fetchUserStickers(session!.user.id),
    enabled: !!session,
  });

  if (packsQ.isLoading) {
    return <Screen><ActivityIndicator style={{ flex: 1 }} /></Screen>;
  }

  const ownedIds = new Set((ownedQ.data ?? []).map((r) => r.stickers?.id).filter(Boolean) as string[]);
  const points = profile.data?.points ?? 0;
  const nextPack = (packsQ.data ?? []).find((p) => p.unlock_threshold > points);

  return (
    <Screen scroll>
      <View style={styles.header}>
        <Text style={styles.title}>{t("stickers.title")}</Text>
        {nextPack ? (
          <Text style={styles.progress}>
            {t("stickers.progress", { points, next: nextPack.unlock_threshold, packName: nextPack.name })}
          </Text>
        ) : (
          <Text style={styles.progress}>{t("stickers.unlockedAll")}</Text>
        )}
      </View>

      {(packsQ.data ?? []).map((pack) => {
        const unlocked = points >= pack.unlock_threshold;
        return (
          <View key={pack.id} style={styles.pack}>
            <View style={styles.packHeader}>
              <Text style={styles.packName}>{pack.name}</Text>
              <Text style={styles.packMeta}>{t("stickers.by", { artist: pack.artist_name })}</Text>
              <Text style={[styles.badge, unlocked ? styles.badgeUnlocked : styles.badgeLocked]}>
                {unlocked ? t("stickers.unlocked") : `${pack.unlock_threshold} pts`}
              </Text>
            </View>
            <FlatList
              data={pack.stickers}
              keyExtractor={(s) => s.id}
              numColumns={3}
              scrollEnabled={false}
              renderItem={({ item }) => (
                <StickerTile
                  imageUrl={item.image_url}
                  name={item.name}
                  locked={!unlocked && !ownedIds.has(item.id)}
                  onPress={unlocked ? () => router.push(`/sticker/${item.id}`) : undefined}
                />
              )}
            />
          </View>
        );
      })}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { padding: spacing(4) },
  title: { ...typography.h1 },
  progress: { ...typography.body, color: colors.textDim, marginTop: spacing(1) },
  pack: { marginBottom: spacing(5), paddingHorizontal: spacing(2) },
  packHeader: { paddingHorizontal: spacing(2), marginBottom: spacing(2) },
  packName: { ...typography.h2 },
  packMeta: { ...typography.small, color: colors.textDim },
  badge: { ...typography.label, marginTop: spacing(1), alignSelf: "flex-start", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999 },
  badgeUnlocked: { backgroundColor: colors.success, color: "#fff" },
  badgeLocked:   { backgroundColor: colors.border, color: colors.textDim },
});
