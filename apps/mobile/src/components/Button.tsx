import { ActivityIndicator, Pressable, StyleSheet, Text, ViewStyle } from "react-native";
import { colors, radius, typography } from "@/lib/theme";

type Variant = "primary" | "secondary" | "ghost" | "danger";

interface Props {
  label: string;
  onPress?: () => void;
  variant?: Variant;
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
}

export function Button({ label, onPress, variant = "primary", loading, disabled, style }: Props) {
  const isDisabled = disabled || loading;
  return (
    <Pressable
      accessibilityRole="button"
      onPress={isDisabled ? undefined : onPress}
      style={({ pressed }) => [
        styles.base,
        styles[variant],
        isDisabled && styles.disabled,
        pressed && !isDisabled && styles.pressed,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={variant === "primary" || variant === "danger" ? "#fff" : colors.text} />
      ) : (
        <Text style={[styles.label, styles[`label_${variant}`]]}>{label}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 48,
    paddingHorizontal: 20,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  primary:   { backgroundColor: colors.primary },
  secondary: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  ghost:     { backgroundColor: "transparent" },
  danger:    { backgroundColor: colors.danger },
  pressed:   { opacity: 0.85 },
  disabled:  { opacity: 0.5 },
  label: { ...typography.body, fontWeight: "600" },
  label_primary:   { color: "#fff" },
  label_secondary: { color: colors.text },
  label_ghost:     { color: colors.primaryDark },
  label_danger:    { color: "#fff" },
});
