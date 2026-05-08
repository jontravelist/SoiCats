import { ActivityIndicator, FlatList, Linking, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { Image } from "expo-image";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import MapView, { Marker } from "react-native-maps";

import { Screen } from "@/components/Screen";
import { Button } from "@/components/Button";
import { StatBars } from "@/components/StatBars";
import { StatRater } from "@/components/StatRater";
import { SpecialtyBadge } from "@/components/SpecialtyBadge";
import { fetchCat, fetchCatSightingLocations, fetchCatSightings, fetchCatTopPhotos, fetchLatestFlagForCat, fetchRecentFeedsForCat, toggleFavourite } from "@/lib/api";
import { useProfile } from "@/hooks/useProfile";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/stores/auth";
import { useTimeAgo } from "@/hooks/useTimeAgo";
import { CatGlyph } from "@/components/CatGlyph";
import { paletteForCat, pokedexNumber, poseForCat } from "@/lib/catTheme";
import { colors, radius, shadow, spacing, typography } from "@/lib/theme";

export default function CatProfile() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useTranslation();
  const router = useRouter();
  const session = useAuthStore((s) => s.session);
  const timeAgo = useTimeAgo();
  const qc = useQueryClient();

  const catQ = useQuery({ queryKey: ["cat", id], queryFn: () => fetchCat(id!), enabled: !!id });
  const sightingsQ = useQuery({
    queryKey: ["cat-sightings", id],
    queryFn: () => fetchCatSightings(id!),
    enabled: !!id,
  });
  const pinsQ = useQuery({
    queryKey: ["cat-pins", id],
    queryFn: () => fetchCatSightingLocations(id!),
    enabled: !!id,
  });
  const flagQ = useQuery({
    queryKey: ["latest-flag", id],
    queryFn: () => fetchLatestFlagForCat(id!),
    enabled: !!id,
  });
  const topQ = useQuery({
    queryKey: ["cat-top-photos", id],
    queryFn: () => fetchCatTopPhotos(id!, 3),
    enabled: !!id,
  });
  const feedsQ = useQuery({
    queryKey: ["recent-feeds", id],
    queryFn: () => fetchRecentFeedsForCat(id!),
    enabled: !!id,
  });
  const profile = useProfile();
  const isFeeder = profile.data?.role === "feeder" || profile.data?.role === "app_admin";
  const favQ = useQuery({
    queryKey: ["fav", id, session?.user.id],
    queryFn: async () => {
      if (!session) return false;
      const { count } = await supabase
        .from("user_favourite_cats")
        .select("user_id", { count: "exact", head: true })
        .eq("cat_id", id!)
        .eq("user_id", session.user.id);
      return (count ?? 0) > 0;
    },
    enabled: !!session && !!id,
  });

  const favMut = useMutation({
    mutationFn: () => toggleFavourite(id!, !favQ.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["fav", id] }),
  });

  if (catQ.isLoading || !catQ.data) {
    return <Screen><ActivityIndicator style={{ flex: 1 }} /></Screen>;
  }
  const cat = catQ.data;
  const sightings = sightingsQ.data ?? [];
  const pins = pinsQ.data ?? [];
  const hero = sightings[0]?.photo_url;
  const lastPin = pins[0];

  // Open native maps app with directions to the cat's last sighting.
  // iOS handles maps:// links natively (Apple Maps); Google handles geo:.
  const openDirections = () => {
    if (!lastPin) return;
    const label = encodeURIComponent(cat.name);
    const url = Platform.OS === "ios"
      ? `maps://?daddr=${lastPin.lat},${lastPin.lng}&q=${label}`
      : `geo:${lastPin.lat},${lastPin.lng}?q=${lastPin.lat},${lastPin.lng}(${label})`;
    Linking.openURL(url).catch(() =>
      // Fallback: Google Maps web URL works on every device.
      Linking.openURL(`https://maps.google.com/?q=${lastPin.lat},${lastPin.lng}`),
    );
  };

  // Pokedex-card palette derived from the cat's primary colour.
  const pal = paletteForCat(cat.primary_color);
  const ratings = (cat as { stats_rating_count?: number }).stats_rating_count ?? 0;
  const photoCount = (cat as { stats_photo_count?: number }).stats_photo_count ?? 0;
  const statsReady = ratings >= 5 && photoCount >= 2;
  const stats = {
    chonk: (cat as { stat_chonk: number | null }).stat_chonk,
    spice: (cat as { stat_spice: number | null }).stat_spice,
    floof: (cat as { stat_floof: number | null }).stat_floof,
    slink: (cat as { stat_slink: number | null }).stat_slink,
    vibes: (cat as { stat_vibes: number | null }).stat_vibes,
  };
  const specialty = (cat as { specialty_stat?: "chonk" | "spice" | "floof" | "slink" | "vibes" | null }).specialty_stat ?? null;
  const specialtyScore = specialty ? stats[specialty] ?? null : null;
  const district = (cat as { district?: { name?: string } | null }).district;

  return (
    <Screen scroll>
      {/* Pokemon-style hero card: solid coloured panel with a rounded photo,
          name banner, N°XXX, type pills, description, stat bars. */}
      <View style={[styles.hero, { backgroundColor: pal.bg }]}>
        <Text style={[styles.heroNumber, { color: pal.textDim }]}>N°{pokedexNumber(cat.id)}</Text>

        <View style={styles.heroPhotoFrame}>
          {hero ? (
            <Image source={hero} style={styles.heroPhoto} contentFit="cover" />
          ) : (
            <CatGlyph color={pal.accent} secondary={pal.text} size={180} pose={poseForCat(cat.id)} />
          )}
        </View>

        <View style={[styles.nameBanner, { backgroundColor: pal.light }]}>
          <Text numberOfLines={1} style={[styles.heroName, { color: pal.text }]}>{cat.name}</Text>
        </View>

        {cat.distinguishing_features ? (
          <Text style={[styles.heroDescription, { color: pal.text }]} numberOfLines={3}>
            {cat.distinguishing_features}
          </Text>
        ) : null}

        <View style={styles.heroBlocks}>
          <View style={styles.heroBlock}>
            <Text style={[styles.sectionLabel, { color: pal.accent }]}>STATS</Text>
            {statsReady ? (
              <StatBars
                values={stats}
                fillColor={pal.accent}
                trackColor={pal.light}
                textColor={pal.text}
              />
            ) : (
              <Text style={[styles.bodyText, { color: pal.textDim }]}>
                Need {Math.max(0, 5 - ratings)} more rating{ratings === 4 ? "" : "s"} on {Math.max(0, 2 - photoCount)} more photo{photoCount === 1 ? "" : "s"} to unlock.
              </Text>
            )}
          </View>

          <View style={styles.heroSide}>
            <Text style={[styles.sectionLabel, { color: pal.accent }]}>TYPE</Text>
            <View style={[styles.typePill, { backgroundColor: pal.light }]}>
              <Text style={[styles.typeText, { color: pal.text }]}>{cat.primary_color}</Text>
            </View>
            <View style={[styles.typePill, { backgroundColor: pal.light }]}>
              <Text style={[styles.typeText, { color: pal.text }]}>{cat.pattern}</Text>
            </View>

            <Text style={[styles.sectionLabel, { color: pal.accent, marginTop: spacing(3) }]}>CATEGORY</Text>
            <Text style={[styles.bodyText, { color: pal.text, textTransform: "capitalize" }]}>
              {[cat.age_guess, cat.sex !== "unknown" ? cat.sex : null].filter(Boolean).join(" · ") || "Cat"}
            </Text>

            {district?.name ? (
              <>
                <Text style={[styles.sectionLabel, { color: pal.accent, marginTop: spacing(3) }]}>DISTRICT</Text>
                <Text style={[styles.bodyText, { color: pal.text }]}>{district.name}</Text>
              </>
            ) : null}

            <Text style={[styles.sectionLabel, { color: pal.accent, marginTop: spacing(3) }]}>LAST SEEN</Text>
            <Text style={[styles.bodyText, { color: pal.text }]}>{timeAgo(cat.last_seen_at)}</Text>
          </View>
        </View>

        <View style={[styles.heroStatusRow]}>
          <View style={[styles.statusBadge, statusStyle(cat.status)]}>
            <Text style={styles.statusText}>{cat.status}</Text>
          </View>
          <Text style={[styles.heroPhotoCount, { color: pal.textDim }]}>
            {sightings.length} photo{sightings.length === 1 ? "" : "s"}
          </Text>
        </View>
      </View>

      <View style={styles.body}>
        {statsReady && specialty ? (
          <SpecialtyBadge stat={specialty} score={specialtyScore ?? undefined} />
        ) : null}

        {/* Rate-the-cat panel — anyone signed in can score the five stats.
            Hidden when the cat is deceased (RIP, no posthumous opinions). */}
        {cat.status !== "deceased" ? <StatRater catId={cat.id} /> : null}

        {(cat.tnr_status !== "unknown" || cat.vaccination_status !== "unknown") ? (
          <View style={styles.welfare}>
            {cat.tnr_status !== "unknown" ? (
              <Text style={styles.welfareItem}>{t(`cat.welfare.tnr.${cat.tnr_status}`)}</Text>
            ) : null}
            {cat.vaccination_status !== "unknown" ? (
              <Text style={styles.welfareItem}>{t(`cat.welfare.vaccination.${cat.vaccination_status}`)}</Text>
            ) : null}
          </View>
        ) : null}

        {flagQ.data && flagQ.data.status === "verified" ? (
          <View style={styles.flagBanner}>
            <Text style={styles.flagBannerLabel}>
              {flagQ.data.flag_type === "deceased"
                ? "💔 Reported deceased"
                : flagQ.data.flag_type === "missing"
                  ? "📍 Reported missing"
                  : "🚑 Reported injured"}
            </Text>
            {flagQ.data.description ? (
              <Text style={styles.flagBannerText}>{flagQ.data.description}</Text>
            ) : null}
          </View>
        ) : null}

        <View style={styles.actions}>
          <Button
            label={favQ.data ? t("cat.actions.unfavourite") : t("cat.actions.favourite")}
            onPress={() => session ? favMut.mutate() : router.push("/auth")}
            variant={favQ.data ? "secondary" : "primary"}
          />
          {lastPin ? (
            <Button label="Directions to last sighting" variant="secondary" onPress={openDirections} />
          ) : null}
          <Button
            label="📣 Share card"
            variant="secondary"
            onPress={() => router.push(`/share-card/${id}`)}
          />
          {cat.status !== "deceased" ? (
            <Button
              label="Report welfare issue"
              variant="ghost"
              onPress={() => session ? router.push(`/flag/${id}`) : router.push("/auth")}
            />
          ) : null}
          {session && session.user.id === cat.discovered_by_user_id ? (
            <Button label="Edit cat" variant="ghost" onPress={() => router.push(`/edit-cat/${id}`)} />
          ) : null}
          {isFeeder && cat.status !== "deceased" ? (
            <Button label="🍚 Log feed" variant="accent" onPress={() => router.push(`/log-feed/${id}`)} />
          ) : null}
          {session ? (
            <Button label="Mark as duplicate" variant="ghost" onPress={() => router.push(`/merge/${id}`)} />
          ) : null}
        </View>
      </View>

      {(feedsQ.data ?? []).length > 0 ? (
        <View style={styles.feedsWrap}>
          <Text style={[styles.sectionLabel, { color: colors.textDim }]}>Recent feeds</Text>
          {(feedsQ.data ?? []).map((row) => {
            const feeder = (row as { feeder?: { handle?: string | null } | null }).feeder;
            return (
              <View key={row.id} style={styles.feedRow}>
                <Text style={styles.feedEmoji}>🍚</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.feedHandle}>@{feeder?.handle ?? "feeder"}</Text>
                  <Text style={styles.feedTime}>{timeAgo(row.fed_at)}</Text>
                  {row.notes ? <Text style={styles.feedNotes}>{row.notes}</Text> : null}
                </View>
              </View>
            );
          })}
        </View>
      ) : null}

      {pins.length > 0 ? (
        <View style={styles.territoryWrap}>
          <Text style={[styles.sectionLabel, { color: colors.textDim }]}>Last {pins.length} {pins.length === 1 ? "sighting" : "sightings"}</Text>
          <Pressable
            onPress={() => router.push("/(tabs)/map")}
            style={styles.miniMapWrap}
            accessibilityHint="Tap to open the full map"
          >
            <MapView
              style={styles.miniMap}
              pointerEvents="none"
              initialRegion={{
                latitude: lastPin!.lat,
                longitude: lastPin!.lng,
                latitudeDelta: 0.01,
                longitudeDelta: 0.01,
              }}
            >
              {pins.map((p) => (
                <Marker
                  key={p.sighting_id}
                  coordinate={{ latitude: p.lat, longitude: p.lng }}
                  pinColor={colors.primary}
                />
              ))}
            </MapView>
          </Pressable>
        </View>
      ) : null}

      {(topQ.data ?? []).length > 0 ? (
        <View style={styles.hofWrap}>
          <Text style={[styles.sectionLabel, { color: colors.textDim }]}>🏆 Hall of Fame · Top photos</Text>
          {(topQ.data ?? []).map((row, i) => (
            <Pressable
              key={row.sighting_id}
              onPress={() => router.push(`/sighting/${row.sighting_id}`)}
              style={({ pressed }) => [styles.hofRow, pressed && { opacity: 0.92 }]}
            >
              <Text style={styles.hofRank}>{["🥇","🥈","🥉"][i] ?? `#${i + 1}`}</Text>
              <Image source={row.photo_url} style={styles.hofThumb} contentFit="cover" />
              <View style={{ flex: 1 }}>
                <Text style={styles.hofMeta}>
                  ♥ {row.like_count}{row.photographer_handle ? ` · @${row.photographer_handle}` : ""}
                </Text>
                {row.caption ? <Text style={styles.hofCaption} numberOfLines={2}>{row.caption}</Text> : null}
              </View>
            </Pressable>
          ))}
        </View>
      ) : null}

      <FlatList
        data={sightings}
        keyExtractor={(s) => s.id}
        numColumns={3}
        scrollEnabled={false}
        renderItem={({ item }) => (
          <Pressable
            onPress={() => router.push(`/sighting/${item.id}`)}
            style={({ pressed }) => [styles.gridCell, pressed && { opacity: 0.85 }]}
          >
            <Image source={item.photo_url} style={styles.gridImage} contentFit="cover" />
          </Pressable>
        )}
        contentContainerStyle={styles.grid}
      />
    </Screen>
  );
}

function Stat({ label }: { label: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statText}>{label}</Text>
    </View>
  );
}

function statusStyle(status: string) {
  switch (status) {
    case "injured":  return { backgroundColor: colors.warning };
    case "missing":  return { backgroundColor: colors.danger };
    case "deceased": return { backgroundColor: colors.textDim };
    default:         return { backgroundColor: colors.success };
  }
}

const styles = StyleSheet.create({
  // Pokemon-style hero card
  hero: { padding: spacing(5), paddingBottom: spacing(5), gap: spacing(2), position: "relative" },
  heroNumber: { position: "absolute", top: 16, right: 24, fontSize: 14, fontWeight: "700", letterSpacing: 0.5 },
  heroPhotoFrame: {
    width: "100%",
    aspectRatio: 1.4,
    borderRadius: radius.xl,
    overflow: "hidden",
    backgroundColor: "rgba(255,255,255,0.25)",
    alignItems: "center",
    justifyContent: "center",
  },
  heroPhoto: { width: "100%", height: "100%" },
  nameBanner: {
    alignSelf: "flex-start",
    marginTop: -32,
    paddingHorizontal: 22,
    paddingVertical: 10,
    borderRadius: radius.pill,
    minWidth: 200,
    maxWidth: "80%",
    ...shadow.card,
  },
  heroName: { fontSize: 28, fontWeight: "900", letterSpacing: -0.5 },
  heroDescription: { ...typography.body, opacity: 0.9, marginTop: spacing(1) },
  heroBlocks: { flexDirection: "row", gap: spacing(4), marginTop: spacing(2) },
  heroBlock: { flex: 1.4 },
  heroSide: { flex: 1, gap: 4 },
  bodyText: { ...typography.body, fontWeight: "600" },
  typePill: {
    alignSelf: "flex-start",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: radius.pill,
    marginBottom: 4,
  },
  typeText: { ...typography.small, fontWeight: "700", textTransform: "capitalize" },
  heroStatusRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: spacing(2) },
  heroPhotoCount: { ...typography.small, fontWeight: "700" },

  body: { padding: spacing(4), gap: spacing(3) },
  statusBadge: { alignSelf: "flex-start", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  statusText: { color: "#fff", fontSize: 12, fontWeight: "700", textTransform: "uppercase" },
  welfare: { gap: 4 },
  welfareItem: { ...typography.body, color: colors.textDim },
  flagBanner: {
    marginTop: spacing(3),
    padding: spacing(3),
    borderRadius: radius.lg,
    backgroundColor: colors.danger,
  },
  flagBannerLabel: { ...typography.h3, color: "#fff" },
  flagBannerText: { ...typography.body, color: "#fff", marginTop: 4, opacity: 0.95 },
  actions: { marginTop: spacing(2), gap: spacing(2) },
  territoryWrap: { paddingHorizontal: spacing(4), marginTop: spacing(2), marginBottom: spacing(3) },
  sectionLabel: { ...typography.label, fontSize: 11, marginTop: spacing(2), marginBottom: 6 },
  miniMapWrap: {
    height: 180,
    borderRadius: radius.lg,
    overflow: "hidden",
  },
  miniMap: { width: "100%", height: "100%" },
  statsBlock: { marginTop: spacing(3), gap: spacing(3) },
  radarWrap: { alignItems: "center", gap: spacing(2) },
  statsCount: { ...typography.small, color: colors.textDim },
  statsTeaser: {
    padding: spacing(3),
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
  },
  statsTeaserTitle: { ...typography.h3, color: colors.text },
  statsTeaserBody: { ...typography.small, color: colors.textDim, marginTop: 4 },
  feedsWrap: { paddingHorizontal: spacing(4), marginTop: spacing(2), marginBottom: spacing(3), gap: spacing(2) },
  feedRow: {
    flexDirection: "row",
    gap: spacing(3),
    padding: spacing(3),
    backgroundColor: colors.surface,
    borderRadius: radius.md,
  },
  feedEmoji: { fontSize: 24 },
  feedHandle: { ...typography.h3, color: colors.text },
  feedTime: { ...typography.small, color: colors.textDim, marginTop: 2 },
  feedNotes: { ...typography.body, color: colors.text, marginTop: 4 },
  hofWrap: { paddingHorizontal: spacing(4), marginTop: spacing(2), marginBottom: spacing(3), gap: spacing(2) },
  hofRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    padding: spacing(3),
    borderRadius: radius.lg,
    gap: spacing(3),
    ...shadow.card,
  },
  hofRank: { fontSize: 24 },
  hofThumb: { width: 64, height: 64, borderRadius: radius.md, backgroundColor: colors.surfaceAlt },
  hofMeta: { ...typography.body, color: colors.text, fontWeight: "700" },
  hofCaption: { ...typography.small, color: colors.textDim, marginTop: 2 },
  grid: { paddingHorizontal: 2 },
  gridCell: { flex: 1 / 3, aspectRatio: 1, margin: 1 },
  gridImage: { width: "100%", height: "100%", backgroundColor: colors.border },
});
