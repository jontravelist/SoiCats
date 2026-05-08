import { useState } from "react";
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";

import { useRouter } from "expo-router";

import { Screen } from "@/components/Screen";
import { SignInPill } from "@/components/SignInPill";
import { FeedItem } from "@/components/FeedItem";
import { fetchNearbyFeed, fetchFavouritesFeed, fetchPendingIdentificationCount, fetchCatsNeedingHelp } from "@/lib/api";
import { useLocation } from "@/hooks/useLocation";
import { useAuthStore } from "@/stores/auth";
import { colors, radius, shadow, spacing, typography } from "@/lib/theme";

type Tab = "nearby" | "favourites";

export default function FeedTab() {
  const { t } = useTranslation();
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("nearby");
  const session = useAuthStore((s) => s.session);
  const { coords, loading: locLoading } = useLocation();

  const pendingCountQ = useQuery({
    queryKey: ["pending-id-count", coords?.latitude, coords?.longitude],
    queryFn: () => fetchPendingIdentificationCount(coords?.latitude, coords?.longitude),
    enabled: !!session,
  });
  const pendingCount = pendingCountQ.data ?? 0;

  // Cats with verified welfare flags within 50km. The pinned section at the
  // top of the feed comes from this — see BRIEF section 7.7.
  const helpQ = useQuery({
    queryKey: ["cats-needing-help", coords?.latitude, coords?.longitude],
    queryFn: () => fetchCatsNeedingHelp(coords?.latitude, coords?.longitude),
  });
  const helpItems = helpQ.data ?? [];

  const nearbyQ = useQuery({
    queryKey: ["nearby-feed", coords?.latitude, coords?.longitude],
    queryFn: () => fetchNearbyFeed(coords!.latitude, coords!.longitude),
    enabled: tab === "nearby" && !!coords,
  });

  const favouritesQ = useQuery({
    queryKey: ["favourites-feed", session?.user.id],
    queryFn: () => fetchFavouritesFeed(),
    enabled: tab === "favourites" && !!session,
  });

  const items = tab === "nearby" ? nearbyQ.data ?? [] : favouritesQ.data ?? [];
  const loading = tab === "nearby" ? nearbyQ.isLoading || locLoading : favouritesQ.isLoading;

  return (
    <Screen>
      <SignInPill />
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.brand}>{t("app.name")}</Text>
            <Text style={styles.tagline}>{t("app.tagline")}</Text>
          </View>
          <Pressable onPress={() => router.push("/leaderboards")} style={styles.leaderboardChip}>
            <Text style={styles.leaderboardChipText}>🏆</Text>
          </Pressable>
        </View>
      </View>

      {helpItems.length > 0 ? (
        <View style={styles.needsHelp}>
          <Text style={styles.needsHelpTitle}>Needs help</Text>
          <FlatList
            horizontal
            data={helpItems}
            keyExtractor={(it) => it.flag_id}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: spacing(4), gap: spacing(2) }}
            renderItem={({ item }) => (
              <Pressable onPress={() => router.push(`/cat/${item.cat_id}`)} style={styles.needsHelpCard}>
                <Text style={styles.needsHelpFlag}>
                  {item.flag_type === "deceased" ? "💔" : item.flag_type === "missing" ? "📍" : "🚑"}
                </Text>
                <Text style={styles.needsHelpName} numberOfLines={1}>{item.cat_name}</Text>
                <Text style={styles.needsHelpType}>{item.flag_type}</Text>
              </Pressable>
            )}
          />
        </View>
      ) : null}

      {pendingCount > 0 ? (
        <Pressable onPress={() => router.push("/identify")} style={styles.helpCard}>
          <Text style={styles.helpEmoji}>🤝</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.helpTitle}>
              {pendingCount} {pendingCount === 1 ? "photo needs" : "photos need"} identifying
            </Text>
            <Text style={styles.helpBody}>Tap to help name them →</Text>
          </View>
        </Pressable>
      ) : null}

      <View style={styles.tabs}>
        <TabButton label={t("feed.tabs.nearby")} active={tab === "nearby"} onPress={() => setTab("nearby")} />
        <TabButton label={t("feed.tabs.favourites")} active={tab === "favourites"} onPress={() => setTab("favourites")} />
      </View>

      {loading ? (
        <View style={styles.center}><ActivityIndicator /></View>
      ) : items.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.empty}>
            {tab === "nearby" ? t("feed.empty") : t("feed.emptyFavourites")}
          </Text>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(it) => it.sighting_id}
          renderItem={({ item }) => (
            <FeedItem
              sightingId={item.sighting_id}
              catId={item.cat_id}
              catName={item.cat_name}
              photoUrl={item.photo_url}
              caption={item.caption}
              photographerHandle={item.photographer_handle}
              distanceM={"distance_m" in item ? (item as { distance_m: number }).distance_m : undefined}
              createdAt={item.created_at}
              likeCount={item.like_count}
              commentCount={item.comment_count}
            />
          )}
          onRefresh={tab === "nearby" ? () => nearbyQ.refetch() : () => favouritesQ.refetch()}
          refreshing={tab === "nearby" ? nearbyQ.isRefetching : favouritesQ.isRefetching}
        />
      )}
    </Screen>
  );
}

function TabButton({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={[styles.tabBtn, active && styles.tabBtnActive]}>
      <Text style={[styles.tabLabel, active && styles.tabLabelActive]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: spacing(6), paddingTop: spacing(2), paddingBottom: spacing(1) },
  headerRow: { flexDirection: "row", alignItems: "center", gap: spacing(2) },
  brand: { fontSize: 36, fontWeight: "900", color: colors.text, letterSpacing: -1 },
  tagline: { ...typography.body, color: colors.textDim, marginTop: 4 },
  leaderboardChip: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.accent,
    alignItems: "center",
    justifyContent: "center",
    ...shadow.button,
  },
  leaderboardChipText: { fontSize: 22 },
  tabs: { flexDirection: "row", paddingHorizontal: spacing(4), paddingVertical: spacing(2), gap: spacing(2) },
  tabBtn: { paddingHorizontal: 18, paddingVertical: 10, borderRadius: 999, backgroundColor: colors.surface },
  tabBtnActive: { backgroundColor: colors.primary },
  tabLabel: { ...typography.body, color: colors.text, fontWeight: "600" },
  tabLabelActive: { color: "#fff", fontWeight: "700" },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
  empty: { ...typography.body, color: colors.textDim, textAlign: "center" },
  helpCard: {
    marginHorizontal: spacing(4),
    marginVertical: spacing(2),
    padding: spacing(4),
    flexDirection: "row",
    alignItems: "center",
    gap: spacing(3),
    backgroundColor: colors.accent,
    borderRadius: radius.lg,
    ...shadow.card,
  },
  helpEmoji: { fontSize: 32 },
  helpTitle: { ...typography.h3, color: "#fff" },
  helpBody: { ...typography.small, color: "#fff", opacity: 0.9, marginTop: 2 },
  needsHelp: { paddingTop: spacing(2), paddingBottom: spacing(1) },
  needsHelpTitle: { ...typography.label, color: colors.danger, paddingHorizontal: spacing(6), marginBottom: spacing(2) },
  needsHelpCard: {
    width: 130,
    padding: spacing(3),
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 2,
    borderColor: colors.danger,
    alignItems: "center",
    gap: 4,
  },
  needsHelpFlag: { fontSize: 28 },
  needsHelpName: { ...typography.h3, color: colors.text },
  needsHelpType: { ...typography.small, color: colors.danger, fontWeight: "700", textTransform: "uppercase" },
});
