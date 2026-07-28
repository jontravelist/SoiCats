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
import { fetchDog, fetchDogSightingLocations, fetchDogSightings, fetchDogTopPhotos, fetchLatestFlagForDog, fetchRecentFeedsForDog, toggleFavourite } from "@/lib/api";
import { useProfile } from "@/hooks/useProfile";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/stores/auth";
import { useTimeAgo } from "@/hooks/useTimeAgo";
import { DogGlyph } from "@/components/DogGlyph";
import { TradingCard } from "@/components/TradingCard";
import { paletteForDog, pokedexNumber, poseForDog } from "@/lib/dogTheme";
import { colors, radius, shadow, spacing, typography } from "@/lib/theme";

export default function DogProfile() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useTranslation();
  const router = useRouter();
  const session = useAuthStore((s) => s.session);
  const timeAgo = useTimeAgo();
  const qc = useQueryClient();

  const dogQ = useQuery({ queryKey: ["dog", id], queryFn: () => fetchDog(id!), enabled: !!id });
  const sightingsQ = useQuery({
    queryKey: ["dog-sightings", id],
    queryFn: () => fetchDogSightings(id!),
    enabled: !!id,
  });
  const pinsQ = useQuery({
    queryKey: ["dog-pins", id],
    queryFn: () => fetchDogSightingLocations(id!),
    enabled: !!id,
  });
  const flagQ = useQuery({
    queryKey: ["latest-flag", id],
    queryFn: () => fetchLatestFlagForDog(id!),
    enabled: !!id,
  });
  const topQ = useQuery({
    queryKey: ["dog-top-photos", id],
    queryFn: () => fetchDogTopPhotos(id!, 3),
    enabled: !!id,
  });
  const feedsQ = useQuery({
    queryKey: ["recent-feeds", id],
    queryFn: () => fetchRecentFeedsForDog(id!),
    enabled: !!id,
  });
  const profile = useProfile();
  const isFeeder = profile.data?.role === "feeder" || profile.data?.role === "app_admin";
  const favQ = useQuery({
    queryKey: ["fav", id, session?.user.id],
    queryFn: async () => {
      if (!session) return false;
      const { count } = await supabase
        .from("user_favourite_dogs")
        .select("user_id", { count: "exact", head: true })
        .eq("dog_id", id!)
        .eq("user_id", session.user.id);
      return (count ?? 0) > 0;
    },
    enabled: !!session && !!id,
  });

  const favMut = useMutation({
    mutationFn: () => toggleFavourite(id!, !favQ.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["fav", id] }),
  });

  if (dogQ.isLoading || !dogQ.data) {
    return <Screen><ActivityIndicator style={{ flex: 1 }} /></Screen>;
  }
  const dog = dogQ.data;
  const sightings = sightingsQ.data ?? [];
  const pins = pinsQ.data ?? [];
  const hero = sightings[0]?.photo_url;
  const lastPin = pins[0];

  // Open native maps app with directions to the dog's last sighting.
  // iOS handles maps:// links natively (Apple Maps); Google handles geo:.
  const openDirections = () => {
    if (!lastPin) return;
    const label = encodeURIComponent(dog.name);
    const url = Platform.OS === "ios"
      ? `maps://?daddr=${lastPin.lat},${lastPin.lng}&q=${label}`
      : `geo:${lastPin.lat},${lastPin.lng}?q=${lastPin.lat},${lastPin.lng}(${label})`;
    Linking.openURL(url).catch(() =>
      // Fallback: Google Maps web URL works on every device.
      Linking.openURL(`https://maps.google.com/?q=${lastPin.lat},${lastPin.lng}`),
    );
  };

  // Pokedex-card palette derived from the dog's primary colour.
  const pal = paletteForDog(dog.primary_color);
  const ratings = (dog as { stats_rating_count?: number }).stats_rating_count ?? 0;
  const photoCount = (dog as { stats_photo_count?: number }).stats_photo_count ?? 0;
  // Show stats as soon as any rating exists. The five-rating threshold
  // earlier discounted single voters as 'unreliable' but felt punishing on
  // newly-discovered dogs. Score volatility is fine — the radar will just
  // shift as more votes come in.
  const statsReady = ratings >= 1;
  const stats = {
    bork: (dog as { stat_bork: number | null }).stat_bork,
    zoom: (dog as { stat_zoom: number | null }).stat_zoom,
    floof: (dog as { stat_floof: number | null }).stat_floof,
    chill: (dog as { stat_chill: number | null }).stat_chill,
    guard: (dog as { stat_guard: number | null }).stat_guard,
  };
  const specialty = (dog as { specialty_stat?: "bork" | "zoom" | "floof" | "chill" | "guard" | null }).specialty_stat ?? null;
  const specialtyScore = specialty ? stats[specialty] ?? null : null;
  const district = (dog as { district?: { name?: string } | null }).district;

  return (
    <Screen scroll>
      {/* Pokémon trading-card hero — see src/components/TradingCard.tsx
          for the layout spec from the Soi Sunset design handoff. */}
      <TradingCard
        dog={dog}
        heroPhotoUrl={hero ?? null}
        photographerHandle={(sightings[0] as { users?: { handle?: string } } | undefined)?.users?.handle}
        lastSeen={timeAgo(dog.last_seen_at)}
        photoCount={sightings.length}
      />

      <View style={styles.statusRow}>
        <View style={[styles.statusBadge, statusStyle(dog.status)]}>
          <Text style={styles.statusText}>{dog.status}</Text>
        </View>
        {district?.name ? (
          <Text style={styles.districtText}>📍 {district.name}</Text>
        ) : null}
      </View>

      {!statsReady ? (
        <View style={styles.statsHint}>
          <Text style={styles.statsHintText}>
            Need {Math.max(0, 5 - ratings)} more rating{ratings === 4 ? "" : "s"} from {Math.max(0, 2 - photoCount)} more photo{photoCount === 1 ? "" : "s"} for the field stats to lock in.
          </Text>
        </View>
      ) : null}

      <View style={styles.body}>
        {statsReady && specialty ? (
          <SpecialtyBadge stat={specialty} score={specialtyScore ?? undefined} />
        ) : null}

        {/* Rate-the-dog panel — anyone signed in can score the five stats.
            Hidden when the dog is deceased (RIP, no posthumous opinions). */}
        {dog.status !== "deceased" ? <StatRater dogId={dog.id} /> : null}

        {(dog.tnr_status !== "unknown" || dog.vaccination_status !== "unknown") ? (
          <View style={styles.welfare}>
            {dog.tnr_status !== "unknown" ? (
              <Text style={styles.welfareItem}>{t(`dog.welfare.tnr.${dog.tnr_status}`)}</Text>
            ) : null}
            {dog.vaccination_status !== "unknown" ? (
              <Text style={styles.welfareItem}>{t(`dog.welfare.vaccination.${dog.vaccination_status}`)}</Text>
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
            label={favQ.data ? t("dog.actions.unfavourite") : t("dog.actions.favourite")}
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
          {dog.status !== "deceased" ? (
            <Button
              label="Report welfare issue"
              variant="ghost"
              onPress={() => session ? router.push(`/flag/${id}`) : router.push("/auth")}
            />
          ) : null}
          {session && session.user.id === dog.discovered_by_user_id ? (
            <Button label="Edit dog" variant="ghost" onPress={() => router.push(`/edit-dog/${id}`)} />
          ) : null}
          {isFeeder && dog.status !== "deceased" ? (
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
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing(2),
    paddingHorizontal: spacing(4),
    marginTop: -spacing(1),
    marginBottom: spacing(2),
  },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  statusText: { color: "#fff", fontSize: 12, fontWeight: "700", textTransform: "uppercase" },
  districtText: { ...typography.small, color: colors.textDim, fontWeight: "700" },
  statsHint: {
    marginHorizontal: spacing(4),
    marginBottom: spacing(2),
    padding: spacing(3),
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.md,
  },
  statsHintText: { ...typography.small, color: colors.text, textAlign: "center" },

  body: { padding: spacing(4), gap: spacing(3) },
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
