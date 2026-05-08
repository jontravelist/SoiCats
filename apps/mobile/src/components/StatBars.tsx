import { StyleSheet, Text, View } from "react-native";
import { typography } from "@/lib/theme";
import type { StatKey } from "@/lib/api";

const ROWS: { key: StatKey; label: string }[] = [
  { key: "chonk", label: "Chonk" },
  { key: "spice", label: "Spice" },
  { key: "floof", label: "Floof" },
  { key: "slink", label: "Slink" },
  { key: "vibes", label: "Vibes" },
];

interface Props {
  values: Partial<Record<StatKey, number | null>>;
  fillColor: string;
  trackColor: string;
  textColor: string;
}

// Pokemon-style horizontal stat bars. Each row: label on the left, then a
// rounded track with a coloured fill scaled to score / 5.
export function StatBars({ values, fillColor, trackColor, textColor }: Props) {
  return (
    <View style={styles.wrap}>
      {ROWS.map(({ key, label }) => {
        const v = values[key];
        const pct = v ? Math.max(0, Math.min(1, v / 5)) : 0;
        return (
          <View key={key} style={styles.row}>
            <Text style={[styles.label, { color: textColor }]}>{label}</Text>
            <View style={[styles.track, { backgroundColor: trackColor }]}>
              <View style={[styles.fill, { width: `${pct * 100}%`, backgroundColor: fillColor }]} />
            </View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 8 },
  row: { flexDirection: "row", alignItems: "center", gap: 12 },
  label: { ...typography.small, fontWeight: "700", width: 64, textAlign: "right" },
  track: {
    flex: 1,
    height: 8,
    borderRadius: 4,
    overflow: "hidden",
  },
  fill: { height: "100%", borderRadius: 4 },
});
