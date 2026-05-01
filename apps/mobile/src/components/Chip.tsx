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
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  selected: { backgroundColor: colors.primary, borderColor: colors.primary },
  label: { ...typography.small, color: colors.text },
  labelSelected: { color: "#fff", fontWeight: "600" },
});
