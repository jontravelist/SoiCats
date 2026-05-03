import { ActivityIndicator, FlatList, StyleSheet, Text, View } from "react-native";
import { Image } from "expo-image";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { Screen } from "@/components/Screen";
import { Button } from "@/components/Button";
import { fetchCat, fetchCatSightings, toggleFavourite } from "@/lib/api";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/stores/auth";
import { useTimeAgo } from "@/hooks/useTimeAgo";
import { colors, radius, spacing, typography } from "@/lib/theme";

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
  const hero = sightings[0]?.photo_url;

  return (
    <Screen scroll>
      {hero ? (
        <Image source={hero} style={styles.hero} contentFit="cover" />
      ) : (
        <View style={[styles.hero, { alignItems: "center", justifyContent: "center" }]}>
          <Text style={{ fontSize: 64 }}>🐈</Text>
        </View>
      )}

      <View style={styles.body}>
        <View style={styles.titleRow}>
          <Text style={styles.name}>{cat.name}</Text>
          <View style={[styles.statusBadge, statusStyle(cat.status)]}>
            <Text style={styles.statusText}>{cat.status}</Text>
          </View>
        </View>
        <Text style={styles.meta}>
          {t("cat.lastSeen", { time: timeAgo(cat.last_seen_at) })}
        </Text>

        <View style={styles.statsRow}>
          <Stat label={t("cat.stats.photos", { count: sightings.length })} />
          <Stat label={`${cat.pattern} · ${cat.primary_color}`} />
        </View>

        {cat.distinguishing_features ? (
          <View style={styles.featureCard}>
            <Text style={styles.featureLabel}>✨ Distinguishing features</Text>
            <Text style={styles.featureText}>{cat.distinguishing_features}</Text>
          </View>
        ) : null}

        <View style={styles.welfare}>
          <Text style={styles.welfareItem}>
            {t(`cat.welfare.tnr.${cat.tnr_status}`)}
          </Text>
          <Text style={styles.welfareItem}>
            {t(`cat.welfare.vaccination.${cat.vaccination_status}`)}
          </Text>
        </View>

        <View style={styles.actions}>
          <Button
            label={favQ.data ? t("cat.actions.unfavourite") : t("cat.actions.favourite")}
            onPress={() => session ? favMut.mutate() : router.push("/auth")}
            variant={favQ.data ? "secondary" : "primary"}
          />
        </View>
      </View>

      <FlatList
        data={sightings}
        keyExtractor={(s) => s.id}
        numColumns={3}
        scrollEnabled={false}
        renderItem={({ item }) => (
          <Image source={item.photo_url} style={styles.gridImage} contentFit="cover" />
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
  hero: { width: "100%", aspectRatio: 1, backgroundColor: colors.border },
  body: { padding: spacing(4) },
  titleRow: { flexDirection: "row", alignItems: "center", gap: spacing(2) },
  name: { ...typography.h1 },
  meta: { ...typography.small, color: colors.textDim, marginTop: 4 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  statusText: { color: "#fff", fontSize: 12, fontWeight: "600", textTransform: "uppercase" },
  statsRow: { flexDirection: "row", gap: spacing(2), marginTop: spacing(3) },
  stat: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: radius.sm, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  statText: { ...typography.small },
  featureCard: {
    marginTop: spacing(3),
    padding: spacing(3),
    borderRadius: radius.lg,
    backgroundColor: colors.accentSoft,
  },
  featureLabel: { ...typography.label, color: colors.text, marginBottom: 4 },
  featureText: { ...typography.body, color: colors.text },
  welfare: { marginTop: spacing(3), gap: 4 },
  welfareItem: { ...typography.body, color: colors.textDim },
  actions: { marginTop: spacing(4), gap: spacing(2) },
  grid: { paddingHorizontal: 2 },
  gridImage: { flex: 1 / 3, aspectRatio: 1, margin: 1, backgroundColor: colors.border },
});
