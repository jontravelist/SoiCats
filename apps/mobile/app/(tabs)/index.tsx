import { useState } from "react";
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";

import { useRouter } from "expo-router";

import { Screen } from "@/components/Screen";
import { SignInPill } from "@/components/SignInPill";
import { FeedItem } from "@/components/FeedItem";
import { CatGlyph } from "@/components/CatGlyph";
import { fetchNearbyCats, fetchNearbyFeed, fetchFavouritesFeed, fetchPendingIdentificationCount, fetchCatsNeedingHelp } from "@/lib/api";
import { useLocation } from "@/hooks/useLocation";
import { useAuthStore } from "@/stores/auth";
import { useProfile } from "@/hooks/useProfile";
import { paletteForCat, poseForCat } from "@/lib/catTheme";
import { colors, radius, shadow, spacing, typography } from "@/lib/theme";

type Tab = "nearby" | "favourites";

export default function FeedTab() {
  const { t } = useTranslation();
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("nearby");
  const session = useAuthStore((s) => s.session);
  const profile = useProfile();
  const { coords, loading: locLoading } = useLocation();

  // Cats nearby — used to populate the story-strip of CatGlyph chips
  // along the top of the feed per the Soi Sunset spec.
  const storyQ = useQuery({
    queryKey: ["story-cats", coords?.latitude, coords?.longitude],
    queryFn: () => fetchNearbyCats(coords!.latitude, coords!.longitude, 50_000, 8),
    enabled: !!coords,
  });

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
            <Text style={styles.greeting} numberOfLines={1}>
              Hello, {profile.data?.handle ? `@${profile.data.handle}` : "cat lover"}
            </Text>
            <Text style={styles.brand}>{t("app.name")}</Text>
          </View>
          {profile.data ? (
            <View style={styles.pointsPill}>
              <Text style={styles.pointsPillText}>★ {profile.data.points.toLocaleString()}</Text>
            </View>
          ) : null}
          <Pressable onPress={() => router.push("/leaderboards")} style={styles.bellChip}>
            <Text style={styles.bellChipText}>🏆</Text>
          </Pressable>
        </View>
      </View>

      {/* Story strip — round CatGlyph chips for nearby cats. Tap → cat profile. */}
      {(storyQ.data ?? []).length > 0 ? (
        <FlatList
          horizontal
          data={storyQ.data ?? []}
          keyExtractor={(c) => c.id}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.storyRow}
          renderItem={({ item }) => {
            const pal = paletteForCat(item.primary_color);
            return (
              <Pressable onPress={() => router.push(`/cat/${item.id}`)} style={styles.storyItem}>
                <View style={[styles.storyChip, { backgroundColor: pal.bg, borderColor: pal.accent }]}>
                  <CatGlyph color={pal.accent} secondary={pal.bg === pal.accent ? pal.text : pal.bg} size={48} pose={poseForCat(item.id)} />
                </View>
                <Text numberOfLines={1} style={styles.storyName}>{item.name}</Text>
              </Pressable>
            );
          }}
        />
      ) : null}

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
  header: { paddingHorizontal: spacing(4), paddingTop: spacing(2), paddingBottom: spacing(1) },
  headerRow: { flexDirection: "row", alignItems: "center", gap: spacing(2) },
  greeting: { ...typography.small, color: colors.textDim, fontWeight: "700", letterSpacing: 0.2 },
  brand: { fontSize: 28, fontWeight: "900", color: colors.text, letterSpacing: -0.5, marginTop: 2 },
  pointsPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.pill,
    backgroundColor: colors.accent,
    ...shadow.card,
  },
  pointsPillText: { color: colors.text, fontWeight: "900", fontSize: 13, letterSpacing: 0.2, fontVariant: ["tabular-nums"] },
  bellChip: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
    ...shadow.card,
  },
  bellChipText: { fontSize: 18 },

  storyRow: { paddingHorizontal: spacing(4), paddingVertical: spacing(2), gap: spacing(3) },
  storyItem: { width: 64, alignItems: "center", marginRight: 4 },
  storyChip: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  storyName: { ...typography.small, fontSize: 11, color: colors.text, marginTop: 4, fontWeight: "700" },
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
