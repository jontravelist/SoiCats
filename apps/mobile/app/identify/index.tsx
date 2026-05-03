import { useState } from "react";
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { Screen } from "@/components/Screen";
import { Button } from "@/components/Button";
import { CatCard } from "@/components/CatCard";
import {
  castIdentificationVote,
  fetchNearbyCats,
  fetchPendingIdentifications,
} from "@/lib/api";
import { useAuthStore } from "@/stores/auth";
import { useTimeAgo } from "@/hooks/useTimeAgo";
import { useLocation } from "@/hooks/useLocation";
import { colors, radius, shadow, spacing, typography } from "@/lib/theme";

export default function HelpIdentify() {
  const router = useRouter();
  const session = useAuthStore((s) => s.session);
  const { coords } = useLocation();
  const qc = useQueryClient();

  const queueQ = useQuery({
    queryKey: ["pending-identifications", coords?.latitude, coords?.longitude],
    queryFn: () => fetchPendingIdentifications(coords?.latitude, coords?.longitude),
    enabled: !!session,
  });

  if (!session) {
    return (
      <Screen style={styles.center}>
        <Text style={styles.title}>Sign in to help</Text>
        <Text style={styles.body}>Other users have posted photos that need a name. Sign in to vote.</Text>
        <Button label="Sign in" onPress={() => router.push("/auth")} />
      </Screen>
    );
  }

  if (queueQ.isLoading) {
    return <Screen><ActivityIndicator style={{ flex: 1 }} /></Screen>;
  }

  const items = queueQ.data ?? [];

  if (items.length === 0) {
    return (
      <Screen style={styles.center}>
        <Text style={styles.bigEmoji}>🎉</Text>
        <Text style={styles.title}>Nothing to identify</Text>
        <Text style={styles.body}>You've voted on every pending photo nearby. Check back later.</Text>
      </Screen>
    );
  }

  return (
    <Screen scroll>
      <View style={styles.header}>
        <Text style={styles.brand}>Help identify</Text>
        <Text style={styles.tagline}>
          {items.length} {items.length === 1 ? "photo" : "photos"} waiting on the community.
        </Text>
      </View>

      {items.map((item) => (
        <PendingCard
          key={item.sighting_id}
          item={item}
          onVoted={() => qc.invalidateQueries({ queryKey: ["pending-identifications"] })}
        />
      ))}
    </Screen>
  );
}

interface PendingItem {
  sighting_id: string;
  photo_url: string;
  caption: string | null;
  created_at: string;
  distance_m: number | null;
  photographer_handle: string | null;
  sighting_lng: number;
  sighting_lat: number;
}

function PendingCard({ item, onVoted }: { item: PendingItem; onVoted: () => void }) {
  const timeAgo = useTimeAgo();
  const [busy, setBusy] = useState(false);

  // Suggest cats near where the photo was taken.
  const suggestionsQ = useQuery({
    queryKey: ["id-suggestions", item.sighting_id],
    queryFn: () => fetchNearbyCats(item.sighting_lat, item.sighting_lng, 200, 8),
  });

  const vote = async (input: { proposedCatId?: string | null; proposedNew?: boolean; skip?: boolean }) => {
    setBusy(true);
    try {
      if (!input.skip) {
        await castIdentificationVote({
          sightingId: item.sighting_id,
          proposedCatId: input.proposedCatId,
          proposedNew: input.proposedNew,
        });
      }
      // 'skip' just removes the card locally — there's no DB row to write,
      // so the same sighting will reappear in a future fetch if the user
      // has nothing else to vote on. That's intentional: skipping is a soft
      // pass, not a 'no'.
      onVoted();
    } catch (e) {
      Alert.alert("Couldn't submit vote", e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  const suggestions = suggestionsQ.data ?? [];

  return (
    <View style={styles.card}>
      <Image source={item.photo_url} style={styles.photo} contentFit="cover" />
      <View style={styles.cardBody}>
        <Text style={styles.meta}>
          @{item.photographer_handle ?? "anon"} · {timeAgo(item.created_at)}
          {item.distance_m != null ? ` · ${Math.round(item.distance_m)}m away` : ""}
        </Text>
        {item.caption ? <Text style={styles.caption}>{item.caption}</Text> : null}

        <Text style={styles.h3}>Which cat is this?</Text>

        {suggestionsQ.isLoading ? (
          <ActivityIndicator />
        ) : suggestions.length === 0 ? (
          <Text style={styles.body}>No known cats nearby. If it's not a known cat, vote "New cat".</Text>
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.suggestionsRow}>
            {suggestions.map((c) => (
              <CatCard
                key={c.id}
                name={c.name}
                thumbnailUrl={c.thumbnail_url}
                subtitle={`${Math.round(c.distance_m)}m`}
                onPress={() => vote({ proposedCatId: c.id })}
              />
            ))}
          </ScrollView>
        )}

        <View style={styles.actions}>
          <Button label="New cat" variant="secondary" onPress={() => vote({ proposedNew: true })} loading={busy} />
          <Button label="Skip" variant="ghost" onPress={() => vote({ skip: true })} disabled={busy} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: spacing(6), gap: spacing(3) },
  bigEmoji: { fontSize: 64 },
  title: { ...typography.h1, color: colors.text, textAlign: "center" },
  body: { ...typography.body, color: colors.textDim, textAlign: "center" },

  header: { paddingHorizontal: spacing(6), paddingTop: spacing(2), paddingBottom: spacing(2) },
  brand: { fontSize: 32, fontWeight: "900", color: colors.text, letterSpacing: -1 },
  tagline: { ...typography.body, color: colors.textDim, marginTop: 4 },

  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    marginHorizontal: spacing(4),
    marginVertical: spacing(2),
    overflow: "hidden",
    ...shadow.card,
  },
  photo: { width: "100%", aspectRatio: 1, backgroundColor: colors.accentSoft },
  cardBody: { padding: spacing(4), gap: spacing(2) },
  meta: { ...typography.small, color: colors.textDim },
  caption: { ...typography.body, color: colors.text },
  h3: { ...typography.h3, color: colors.text, marginTop: spacing(2) },
  suggestionsRow: { gap: 12, paddingVertical: spacing(1) },
  actions: { flexDirection: "row", gap: spacing(2), marginTop: spacing(2) },
});
