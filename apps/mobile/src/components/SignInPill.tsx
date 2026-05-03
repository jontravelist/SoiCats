import { Pressable, StyleSheet, Text } from "react-native";
import { useRouter } from "expo-router";
import { colors, radius, typography, shadow } from "@/lib/theme";
import { useAuthStore } from "@/stores/auth";

// Persistent sign-in chip shown in the top-right of the main tabs while
// the user is signed out. One tap pops the auth modal. Hidden once
// the user has a session.
export function SignInPill() {
  const router = useRouter();
  const session = useAuthStore((s) => s.session);
  if (session) return null;
  return (
    <Pressable
      onPress={() => router.push("/auth")}
      style={({ pressed }) => [styles.pill, pressed && { opacity: 0.85 }]}
    >
      <Text style={styles.label}>Sign in</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pill: {
    position: "absolute",
    top: 8,
    right: 16,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: radius.pill,
    backgroundColor: colors.primary,
    zIndex: 10,
    ...shadow.button,
  },
  label: { ...typography.small, color: "#fff", fontWeight: "700" },
});
