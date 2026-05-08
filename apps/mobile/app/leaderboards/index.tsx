import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";

import { Screen } from "@/components/Screen";
import {
  fetchCurrentWeekTopPhotos,
  fetchDistricts,
  fetchDistrictForPoint,
  fetchFrozenWeeklyWinners,
} from "@/lib/api";
import { useLocation } from "@/hooks/useLocation";
import { colors, radius, shadow, spacing, typography } from "@/lib/theme";

type Tab = "this_week" | "archive";

export default function Leaderboards() {
  const router = useRouter();
  const { coords } = useLocation();
  const [tab, setTab] = useState<Tab>("this_week");
  const [districtId, setDistrictId] = useState<string | null>(null);

  const districtsQ = useQuery({ queryKey: ["districts"], queryFn: fetchDistricts });

  // Auto-select the user's district if their GPS lands inside a curated one.
  useEffect(() => {
    if (districtId || !coords) return;
    void fetchDistrictForPoint(coords.latitude, coords.longitude).then((id) => {
      if (id) setDistrictId(id);
    });
  }, [coords, districtId]);

  // Fall back to the first curated district if location didn't resolve to one.
  useEffect(() => {
    if (districtId || !districtsQ.data) return;
    const curated = districtsQ.data.find((d) => d.is_curated);
    if (curated) setDistrictId(curated.id);
  }, [districtsQ.data, districtId]);

  const currentQ = useQuery({
    queryKey: ["leaderboard-current", districtId],
    queryFn: () => fetchCurrentWeekTopPhotos(districtId!, 10),
    enabled: !!districtId && tab === "this_week",
  });
  const archiveQ = useQuery({
    queryKey: ["leaderboard-archive", districtId],
    queryFn: () => fetchFrozenWeeklyWinners(districtId!, 8),
    enabled: !!districtId && tab === "archive",
  });

  const districtName = useMemo(() => {
    return districtsQ.data?.find((d) => d.id === districtId)?.name ?? "";
  }, [districtsQ.data, districtId]);

  return (
    <Screen scroll>
      <View style={styles.header}>
        <Text style={styles.brand}>Leaderboards</Text>
        <Text style={styles.tagline}>Weekly Top 3 photos · per district</Text>
      </View>

      {/* District picker */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.districtRow}>
        {(districtsQ.data ?? []).map((d) => (
          <Pressable
            key={d.id}
            onPress={() => setDistrictId(d.id)}
            style={[styles.districtChip, districtId === d.id && styles.districtChipActive]}
          >
            <Text style={[styles.districtLabel, districtId === d.id && styles.districtLabelActive]}>{d.name}</Text>
          </Pressable>
        ))}
      </ScrollView>

      <View style={styles.tabs}>
        <TabBtn label="This week" active={tab === "this_week"} onPress={() => setTab("this_week")} />
        <TabBtn label="Archive"   active={tab === "archive"}   onPress={() => setTab("archive")} />
      </View>

      {tab === "this_week" ? (
        <ThisWeek
          loading={currentQ.isLoading}
          rows={currentQ.data ?? []}
          districtName={districtName}
          onTap={(id) => router.push(`/sighting/${id}`)}
        />
      ) : (
        <Archive
          loading={archiveQ.isLoading}
          rows={archiveQ.data ?? []}
          onTap={(id) => router.push(`/sighting/${id}`)}
        />
      )}
    </Screen>
  );
}

function TabBtn({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={[styles.tabBtn, active && styles.tabBtnActive]}>
      <Text style={[styles.tabLabel, active && styles.tabLabelActive]}>{label}</Text>
    </Pressable>
  );
}

interface CurrentRow {
  rank: number;
  sighting_id: string;
  photo_url: string;
  cat_name: string;
  like_count: number;
  photographer_handle: string | null;
}

function ThisWeek({ loading, rows, districtName, onTap }:
  { loading: boolean; rows: CurrentRow[]; districtName: string; onTap: (id: string) => void }) {
  if (loading) return <View style={styles.center}><ActivityIndicator /></View>;
  if (rows.length === 0) {
    return (
      <View style={styles.center}>
        <Text style={styles.empty}>No photos in {districtName} yet this week.</Text>
      </View>
    );
  }
  return (
    <FlatList
      data={rows}
      keyExtractor={(r) => r.sighting_id}
      scrollEnabled={false}
      contentContainerStyle={styles.list}
      renderItem={({ item }) => (
        <Pressable onPress={() => onTap(item.sighting_id)} style={styles.row}>
          <Text style={styles.rank}>{["🥇","🥈","🥉"][item.rank - 1] ?? `#${item.rank}`}</Text>
          <Image source={item.photo_url} style={styles.thumb} contentFit="cover" />
          <View style={{ flex: 1 }}>
            <Text style={styles.cat}>{item.cat_name}</Text>
            <Text style={styles.meta}>♥ {item.like_count}{item.photographer_handle ? ` · @${item.photographer_handle}` : ""}</Text>
          </View>
        </Pressable>
      )}
    />
  );
}

interface ArchiveRow {
  week_start: string;
  rank: number;
  sighting_id: string;
  photo_url: string;
  cat_name: string;
  photographer_handle: string | null;
  like_count: number;
}

function Archive({ loading, rows, onTap }:
  { loading: boolean; rows: ArchiveRow[]; onTap: (id: string) => void }) {
  if (loading) return <View style={styles.center}><ActivityIndicator /></View>;
  if (rows.length === 0) {
    return (
      <View style={styles.center}>
        <Text style={styles.empty}>No frozen winners yet. Once Monday rolls around, last week's top 3 land here.</Text>
      </View>
    );
  }
  // Group by week_start for display.
  const byWeek = rows.reduce<Record<string, ArchiveRow[]>>((acc, r) => {
    (acc[r.week_start] ??= []).push(r);
    return acc;
  }, {});
  const weeks = Object.keys(byWeek).sort().reverse();

  return (
    <View style={styles.list}>
      {weeks.map((wk) => (
        <View key={wk} style={styles.weekBlock}>
          <Text style={styles.weekHeader}>Week of {new Date(wk).toLocaleDateString()}</Text>
          {byWeek[wk].map((r) => (
            <Pressable key={r.sighting_id} onPress={() => onTap(r.sighting_id)} style={styles.row}>
              <Text style={styles.rank}>{["🥇","🥈","🥉"][r.rank - 1] ?? `#${r.rank}`}</Text>
              <Image source={r.photo_url} style={styles.thumb} contentFit="cover" />
              <View style={{ flex: 1 }}>
                <Text style={styles.cat}>{r.cat_name}</Text>
                <Text style={styles.meta}>♥ {r.like_count}{r.photographer_handle ? ` · @${r.photographer_handle}` : ""}</Text>
              </View>
            </Pressable>
          ))}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: spacing(6), paddingTop: spacing(2), paddingBottom: spacing(1) },
  brand: { fontSize: 32, fontWeight: "900", color: colors.text, letterSpacing: -1 },
  tagline: { ...typography.body, color: colors.textDim, marginTop: 4 },

  districtRow: { gap: 8, paddingHorizontal: spacing(4), paddingVertical: spacing(2) },
  districtChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, backgroundColor: colors.surface },
  districtChipActive: { backgroundColor: colors.primary },
  districtLabel: { ...typography.small, color: colors.text, fontWeight: "600" },
  districtLabelActive: { color: "#fff", fontWeight: "700" },

  tabs: { flexDirection: "row", paddingHorizontal: spacing(4), paddingTop: spacing(1), paddingBottom: spacing(2), gap: spacing(2) },
  tabBtn: { paddingHorizontal: 18, paddingVertical: 10, borderRadius: 999, backgroundColor: colors.surface },
  tabBtnActive: { backgroundColor: colors.secondary },
  tabLabel: { ...typography.body, color: colors.text, fontWeight: "600" },
  tabLabelActive: { color: "#fff", fontWeight: "700" },

  list: { padding: spacing(4), gap: spacing(2) },
  row: {
    flexDirection: "row", alignItems: "center", gap: spacing(3),
    backgroundColor: colors.surface, padding: spacing(3), borderRadius: radius.lg,
    ...shadow.card,
  },
  rank: { fontSize: 24 },
  thumb: { width: 64, height: 64, borderRadius: radius.md, backgroundColor: colors.surfaceAlt },
  cat: { ...typography.h3, color: colors.text },
  meta: { ...typography.small, color: colors.textDim, marginTop: 2 },

  weekBlock: { gap: spacing(2) },
  weekHeader: { ...typography.label, color: colors.textDim, marginTop: spacing(2) },

  center: { padding: spacing(6), alignItems: "center" },
  empty: { ...typography.body, color: colors.textDim, textAlign: "center" },
});
