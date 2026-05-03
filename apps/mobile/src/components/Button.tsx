import { ActivityIndicator, Pressable, StyleSheet, Text, ViewStyle } from "react-native";
import { colors, radius, shadow, typography } from "@/lib/theme";

type Variant = "primary" | "secondary" | "accent" | "ghost" | "danger";

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
  const filled = variant === "primary" || variant === "secondary" || variant === "accent" || variant === "danger";
  return (
    <Pressable
      accessibilityRole="button"
      onPress={isDisabled ? undefined : onPress}
      style={({ pressed }) => [
        styles.base,
        styles[variant],
        filled && shadow.button,
        isDisabled && styles.disabled,
        pressed && !isDisabled && styles.pressed,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={filled ? "#fff" : colors.text} />
      ) : (
        <Text style={[styles.label, styles[`label_${variant}`]]}>{label}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 56,
    paddingHorizontal: 24,
    borderRadius: radius.lg,
    alignItems: "center",
    justifyContent: "center",
  },
  primary:   { backgroundColor: colors.primary },
  secondary: { backgroundColor: colors.secondary },
  accent:    { backgroundColor: colors.accent },
  ghost:     { backgroundColor: "transparent" },
  danger:    { backgroundColor: colors.danger },
  pressed:   { transform: [{ scale: 0.97 }] },
  disabled:  { opacity: 0.5 },
  label: { ...typography.body, fontWeight: "700" },
  label_primary:   { color: "#fff" },
  label_secondary: { color: "#fff" },
  label_accent:    { color: "#fff" },
  label_ghost:     { color: colors.text },
  label_danger:    { color: "#fff" },
});
