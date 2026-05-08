import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { fetchMyCatRatings, rateCat, STAT_KEYS, StatKey } from "@/lib/api";
import { useAuthStore } from "@/stores/auth";
import { colors, radius, shadow, spacing, typography } from "@/lib/theme";

const LABELS: Record<StatKey, { name: string; emoji: string; low: string; high: string }> = {
  chonk: { name: "Chonk", emoji: "🍡", low: "Lean machine",     high: "Absolute unit" },
  spice: { name: "Spice", emoji: "🌶️", low: "Soft soul",        high: "Spicy queen" },
  floof: { name: "Floof", emoji: "☁️", low: "Sleek",            high: "Cloud cat" },
  slink: { name: "Slink", emoji: "🥷", low: "Solid presence",   high: "Pure shadow" },
  vibes: { name: "Vibes", emoji: "🧘", low: "Chaos energy",     high: "Buddha cat" },
};

interface Props {
  catId: string;
}

// Five-stat rater scoped to a cat. Tap a number 1-5 per row to set or
// update your score for that stat. RLS allows any signed-in user to rate
// any cat (we treat cats as community subjects, not owned content).
export function StatRater({ catId }: Props) {
  const session = useAuthStore((s) => s.session);
  const qc = useQueryClient();

  const myQ = useQuery({
    queryKey: ["my-cat-ratings", catId, session?.user.id],
    queryFn: () => fetchMyCatRatings(catId),
    enabled: !!session,
  });

  const [pending, setPending] = useState<Partial<Record<StatKey, number>>>({});
  useEffect(() => { setPending(myQ.data ?? {}); }, [myQ.data]);

  const mut = useMutation({
    mutationFn: (input: { stat: StatKey; score: number }) =>
      rateCat({ catId, ...input }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["my-cat-ratings", catId] });
      qc.invalidateQueries({ queryKey: ["cat", catId] });
    },
  });

  if (!session) {
    return (
      <View style={styles.notice}>
        <Text style={styles.noticeText}>Sign in to rate this cat.</Text>
      </View>
    );
  }

  const setScore = (stat: StatKey, score: number) => {
    setPending((p) => ({ ...p, [stat]: score }));
    mut.mutate({ stat, score });
  };

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.title}>Rate this cat</Text>
        {mut.isPending ? <ActivityIndicator size="small" /> : null}
      </View>
      {STAT_KEYS.map((stat) => {
        const my = pending[stat];
        const meta = LABELS[stat];
        return (
          <View key={stat} style={styles.row}>
            <View style={styles.rowLabel}>
              <Text style={styles.statEmoji}>{meta.emoji}</Text>
              <Text style={styles.statName}>{meta.name}</Text>
            </View>
            <View style={styles.scores}>
              {[1, 2, 3, 4, 5].map((n) => {
                const active = my === n;
                return (
                  <Pressable
                    key={n}
                    onPress={() => setScore(stat, n)}
                    style={[styles.scoreBtn, active && styles.scoreBtnActive]}
                  >
                    <Text style={[styles.scoreText, active && styles.scoreTextActive]}>{n}</Text>
                  </Pressable>
                );
              })}
            </View>
            {my != null ? (
              <Text style={styles.framing}>
                {my <= 2 ? meta.low : my >= 4 ? meta.high : "—"}
              </Text>
            ) : null}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    margin: spacing(3),
    padding: spacing(3),
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    gap: spacing(2),
    ...shadow.card,
  },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  title: { ...typography.h3, color: colors.text },
  row: { gap: 4 },
  rowLabel: { flexDirection: "row", alignItems: "center", gap: 6 },
  statEmoji: { fontSize: 18 },
  statName: { ...typography.body, fontWeight: "700", color: colors.text },
  scores: { flexDirection: "row", gap: 6, marginTop: 4 },
  scoreBtn: {
    flex: 1,
    height: 40,
    borderRadius: radius.md,
    backgroundColor: colors.bg,
    alignItems: "center",
    justifyContent: "center",
  },
  scoreBtnActive: { backgroundColor: colors.primary },
  scoreText: { ...typography.body, color: colors.text, fontWeight: "700" },
  scoreTextActive: { color: "#fff" },
  framing: { ...typography.small, color: colors.textDim, fontStyle: "italic", marginTop: 2 },
  notice: { padding: spacing(3), backgroundColor: colors.surface, borderRadius: radius.md, margin: spacing(3) },
  noticeText: { ...typography.small, color: colors.textDim, textAlign: "center" },
});
