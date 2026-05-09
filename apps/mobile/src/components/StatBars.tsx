import { StyleSheet, Text, View } from "react-native";
import { typography } from "@/lib/theme";
import { STAT_COLORS, STAT_META } from "@/lib/stats";
import type { StatKey } from "@/lib/api";

const ROWS: StatKey[] = ["chonk", "spice", "floof", "slink", "vibes"];

interface Props {
  values: Partial<Record<StatKey, number | null>>;
  trackColor: string;
  textColor: string;
}

// Pokemon-style horizontal stat bars, one per stat, each tinted with the
// stat's signature colour from the Soi Sunset palette (Chonk mango, Spice
// pink, Floof teal, Slink charcoal, Vibes papaya).
export function StatBars({ values, trackColor, textColor }: Props) {
  return (
    <View style={styles.wrap}>
      {ROWS.map((key) => {
        const v = values[key];
        const pct = v ? Math.max(0, Math.min(1, v / 5)) : 0;
        const meta = STAT_META[key];
        const fill = STAT_COLORS[key];
        return (
          <View key={key} style={styles.row}>
            <View style={styles.label}>
              <Text style={styles.icon}>{meta.icon}</Text>
              <Text style={[styles.name, { color: textColor }]}>{meta.label}</Text>
            </View>
            <View style={[styles.track, { backgroundColor: trackColor }]}>
              <View style={[styles.fill, { width: `${pct * 100}%`, backgroundColor: fill }]} />
            </View>
            <Text style={[styles.value, { color: textColor }]}>{v ? v.toFixed(1) : "—"}</Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 6 },
  row: { flexDirection: "row", alignItems: "center", gap: 10 },
  label: { width: 78, flexDirection: "row", alignItems: "center", gap: 4 },
  icon: { fontSize: 13 },
  name: { ...typography.label, fontSize: 10, letterSpacing: 1.4 },
  track: {
    flex: 1,
    height: 9,
    borderRadius: 5,
    overflow: "hidden",
  },
  fill: { height: "100%", borderRadius: 5 },
  value: { ...typography.small, fontWeight: "800", width: 30, textAlign: "right" },
});
