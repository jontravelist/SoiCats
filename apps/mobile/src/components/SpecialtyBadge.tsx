import { StyleSheet, Text, View } from "react-native";
import { radius, shadow, typography } from "@/lib/theme";
import { STAT_COLORS, STAT_META } from "@/lib/stats";
import type { StatKey } from "@/lib/api";

interface Props {
  stat: StatKey;
  score?: number | null;
}

export function SpecialtyBadge({ stat, score }: Props) {
  const meta = STAT_META[stat];
  const bg = STAT_COLORS[stat];
  // Chill is charcoal — needs a lighter inner shadow accent.
  return (
    <View style={[styles.wrap, { backgroundColor: bg }]}>
      <Text style={styles.emoji}>{meta.icon}</Text>
      <View style={{ flex: 1 }}>
        <Text style={styles.title}>{meta.specialty}</Text>
        {score != null ? <Text style={styles.score}>{score.toFixed(1)} / 5</Text> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: radius.pill,
    borderWidth: 2,
    borderColor: "rgba(0,0,0,0.12)",
    alignSelf: "center",
    ...shadow.button,
  },
  emoji: { fontSize: 22 },
  title: { ...typography.label, color: "#fff", fontSize: 13, letterSpacing: 1.2 },
  score: { ...typography.small, color: "#fff", opacity: 0.9, fontWeight: "700", marginTop: 1 },
});
