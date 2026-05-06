import { StyleSheet, Text, View } from "react-native";
import { colors, radius, shadow, spacing, typography } from "@/lib/theme";
import type { StatKey } from "@/lib/api";

const SPECIALTY: Record<StatKey, { title: string; emoji: string; bg: string }> = {
  chonk: { title: "PEAK CHONK",     emoji: "🍡", bg: "#F4C430" },
  spice: { title: "MAXIMUM SPICE",  emoji: "🌶️", bg: "#E54C3D" },
  floof: { title: "TOTAL FLOOF",    emoji: "☁️", bg: "#90C4E9" },
  slink: { title: "PURE SLINK",     emoji: "🥷", bg: "#1F4D3F" },
  vibes: { title: "BEST VIBES",     emoji: "🧘", bg: "#5CB85C" },
};

interface Props {
  stat: StatKey;
  score?: number | null;
}

export function SpecialtyBadge({ stat, score }: Props) {
  const meta = SPECIALTY[stat];
  return (
    <View style={[styles.wrap, { backgroundColor: meta.bg }]}>
      <Text style={styles.emoji}>{meta.emoji}</Text>
      <View style={{ flex: 1 }}>
        <Text style={styles.title}>{meta.title}</Text>
        {score != null ? <Text style={styles.score}>{score.toFixed(1)} / 5</Text> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing(3),
    paddingHorizontal: spacing(4),
    paddingVertical: spacing(3),
    borderRadius: radius.lg,
    ...shadow.card,
  },
  emoji: { fontSize: 36 },
  title: { ...typography.h2, color: "#fff", letterSpacing: 0.5 },
  score: { ...typography.body, color: "#fff", opacity: 0.9, fontWeight: "700" },
});
