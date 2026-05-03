import { useMemo, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";

import { Screen } from "@/components/Screen";
import { SignInPill } from "@/components/SignInPill";
import { fetchNearbyCats, fetchAllCats, fetchExtrasByCatId } from "@/lib/api";
import { useLocation } from "@/hooks/useLocation";
import { formatDistance } from "@/lib/location";
import { useTimeAgo } from "@/hooks/useTimeAgo";
import { colors, radius, shadow, spacing, typography } from "@/lib/theme";
import { useTranslation } from "react-i18next";

type Sort = "near" | "name";

// Cats tab — a searchable directory of every neighbourhood cat.
// Defaults to nearest-first when location is available, A-Z otherwise.
export default function CatsTab() {
  const { t } = useTranslation();
  const router = useRouter();
  const { coords } = useLocation();
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<Sort>("near");

  // Pull a generous radius so the list isn't empty for users in low-density
  // areas. 50km easily covers all of greater Bangkok.
  const nearQ = useQuery({
    queryKey: ["browse-cats-near", coords?.latitude, coords?.longitude],
    queryFn: () => fetchNearbyCats(coords!.latitude, coords!.longitude, 50_000, 200),
    enabled: sort === "near" && !!coords,
  });

  const nameQ = useQuery({
    queryKey: ["browse-cats-name"],
    queryFn: () => fetchAllCats(200),
    enabled: sort === "name" || !coords,
  });

  // The nearby_cats RPC doesn't return features / sex / age, so we
  // batch-fetch them and merge into the rows.
  const nearbyIds = (nearQ.data ?? []).map((r) => r.id);
  const extrasQ = useQuery({
    queryKey: ["extras-by-id", nearbyIds.join(",")],
    queryFn: () => fetchExtrasByCatId(nearbyIds),
    enabled: nearbyIds.length > 0,
  });

  // The two queries return slightly different row shapes; normalise to one
  // and merge in the extras lookup for the nearby case.
  const extras = extrasQ.data ?? {};
  const items = useMemo(() => {
    const raw = sort === "near" && coords ? nearQ.data ?? [] : nameQ.data ?? [];
    return raw.map((r) => {
      const extra = extras[r.id];
      return {
        id: r.id,
        name: r.name,
        pattern: r.pattern,
        primary_color: r.primary_color,
        status: r.status,
        last_seen_at: r.last_seen_at,
        distance_m: "distance_m" in r ? (r.distance_m as number) : undefined,
        thumbnail_url: "thumbnail_url" in r ? (r.thumbnail_url as string | null) : null,
        photo_count: "photo_count" in r ? (r.photo_count as number) : undefined,
        distinguishing_features:
          "distinguishing_features" in r
            ? ((r as { distinguishing_features: string | null }).distinguishing_features ?? null)
            : (extra?.distinguishing_features ?? null),
        sex: ("sex" in r ? (r as { sex: string }).sex : extra?.sex) ?? "unknown",
      };
    });
  }, [nearQ.data, nameQ.data, extras, sort, coords]);

  // Client-side search — cheap for our scale and avoids an extra round-trip.
  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    if (!s) return items;
    return items.filter((c) => c.name.toLowerCase().includes(s));
  }, [items, search]);

  const loading = sort === "near" ? nearQ.isLoading : nameQ.isLoading;

  return (
    <Screen>
      <SignInPill />
      <View style={styles.header}>
        <Text style={styles.brand}>Cats</Text>
        <Text style={styles.tagline}>{t("app.tagline")}</Text>
      </View>

      <View style={styles.controls}>
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Search by name"
          placeholderTextColor={colors.textDim}
          autoCapitalize="none"
          style={styles.searchInput}
        />
        <View style={styles.sortRow}>
          <SortButton label="Nearest" active={sort === "near"} onPress={() => setSort("near")} />
          <SortButton label="A–Z" active={sort === "name"} onPress={() => setSort("name")} />
        </View>
      </View>

      {loading ? (
        <View style={styles.center}><ActivityIndicator /></View>
      ) : filtered.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.empty}>
            {search.trim() ? "No cats match that name yet." : "No cats here yet — be the first to add one."}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(c) => c.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <CatRow
              {...item}
              onPress={() => router.push(`/cat/${item.id}`)}
            />
          )}
        />
      )}
    </Screen>
  );
}

function SortButton({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={[styles.sortBtn, active && styles.sortBtnActive]}>
      <Text style={[styles.sortLabel, active && styles.sortLabelActive]}>{label}</Text>
    </Pressable>
  );
}

interface CatRowProps {
  name: string;
  pattern: string;
  primary_color: string;
  status: string;
  last_seen_at: string;
  distance_m?: number;
  thumbnail_url: string | null;
  photo_count?: number;
  distinguishing_features: string | null;
  sex: string;
  onPress: () => void;
}

function CatRow({ name, pattern, primary_color, distance_m, thumbnail_url, photo_count, last_seen_at, distinguishing_features, sex, onPress }: CatRowProps) {
  const { t } = useTranslation();
  const timeAgo = useTimeAgo();
  const sexEmoji = sex === "male" ? "♂" : sex === "female" ? "♀" : null;
  const subtitleParts = [
    `${primary_color} · ${pattern}`,
    sexEmoji,
    photo_count != null ? `${photo_count} ${photo_count === 1 ? "photo" : "photos"}` : null,
    distance_m != null ? formatDistance(distance_m, t) : `Last seen ${timeAgo(last_seen_at)}`,
  ].filter(Boolean) as string[];
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.row, pressed && { opacity: 0.92 }]}>
      <View style={styles.thumbWrap}>
        {thumbnail_url ? (
          <Image source={thumbnail_url} style={styles.thumb} contentFit="cover" />
        ) : (
          <Text style={styles.thumbEmoji}>🐈</Text>
        )}
      </View>
      <View style={styles.rowText}>
        <Text style={styles.rowName}>{name}</Text>
        <Text style={styles.rowMeta}>{subtitleParts.join("  ·  ")}</Text>
        {distinguishing_features ? (
          <Text style={styles.rowFeature} numberOfLines={2}>
            ✨ {distinguishing_features}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: spacing(6), paddingTop: spacing(2), paddingBottom: spacing(1) },
  brand: { fontSize: 36, fontWeight: "900", color: colors.text, letterSpacing: -1 },
  tagline: { ...typography.body, color: colors.textDim, marginTop: 4 },

  controls: { paddingHorizontal: spacing(4), paddingTop: spacing(2), gap: spacing(2) },
  searchInput: {
    minHeight: 48,
    paddingHorizontal: 16,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    fontSize: 16,
    color: colors.text,
    ...shadow.card,
  },
  sortRow: { flexDirection: "row", gap: spacing(2), marginTop: spacing(1) },
  sortBtn: { paddingHorizontal: 18, paddingVertical: 8, borderRadius: 999, backgroundColor: colors.surface },
  sortBtnActive: { backgroundColor: colors.primary },
  sortLabel: { ...typography.body, color: colors.text, fontWeight: "600" },
  sortLabelActive: { color: "#fff", fontWeight: "700" },

  list: { padding: spacing(4), gap: spacing(2) },
  row: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    padding: spacing(3),
    borderRadius: radius.lg,
    gap: spacing(3),
    ...shadow.card,
  },
  thumbWrap: {
    width: 64, height: 64, borderRadius: radius.md, overflow: "hidden",
    backgroundColor: colors.accentSoft, alignItems: "center", justifyContent: "center",
  },
  thumb: { width: "100%", height: "100%" },
  thumbEmoji: { fontSize: 32 },
  rowText: { flex: 1 },
  rowName: { ...typography.h3, color: colors.text },
  rowMeta: { ...typography.small, color: colors.textDim, marginTop: 2 },
  rowFeature: { ...typography.small, color: colors.text, marginTop: 4, fontStyle: "italic" },

  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 32 },
  empty: { ...typography.body, color: colors.textDim, textAlign: "center" },
});
