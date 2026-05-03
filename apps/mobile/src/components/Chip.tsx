import { Pressable, StyleSheet, Text } from "react-native";
import { colors, radius, typography } from "@/lib/theme";

export function Chip({
  label, selected, onPress,
}: { label: string; selected?: boolean; onPress?: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.chip, selected && styles.selected]}
    >
      <Text style={[styles.label, selected && styles.labelSelected]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
  },
  selected: { backgroundColor: colors.primary },
  label: { ...typography.body, color: colors.text, fontWeight: "600" },
  labelSelected: { color: "#fff", fontWeight: "700" },
});
