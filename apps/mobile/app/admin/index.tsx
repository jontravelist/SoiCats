import { useRouter } from "expo-router";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { useQuery } from "@tanstack/react-query";

import { Screen } from "@/components/Screen";
import { Button } from "@/components/Button";
import { useAuthStore } from "@/stores/auth";
import { useProfile } from "@/hooks/useProfile";
import { fetchOpenMergeRequests } from "@/lib/api";
import { colors, radius, shadow, spacing, typography } from "@/lib/theme";

// Admin landing — only renders for app_admin users. Lists categories of
// pending work (currently just merge requests; feeder applications and
// flag review come in Phase 1.5).
export default function AdminHome() {
  const router = useRouter();
  const session = useAuthStore((s) => s.session);
  const profile = useProfile();

  const mergesQ = useQuery({
    queryKey: ["admin-open-merges"],
    queryFn: fetchOpenMergeRequests,
    enabled: profile.data?.role === "app_admin",
  });

  if (!session || profile.isLoading) {
    return <Screen><ActivityIndicator style={{ flex: 1 }} /></Screen>;
  }

  if (profile.data?.role !== "app_admin") {
    return (
      <Screen style={styles.center}>
        <Text style={styles.body}>Admins only.</Text>
        <Button label="Back" variant="secondary" onPress={() => router.back()} />
      </Screen>
    );
  }

  const mergeCount = mergesQ.data?.length ?? 0;

  return (
    <Screen scroll>
      <View style={styles.container}>
        <Text style={styles.h1}>Admin</Text>
        <Text style={styles.body}>
          Review user-submitted requests. Each action below is permanent — read carefully.
        </Text>

        <Button
          label={`Merge requests${mergeCount > 0 ? `  ·  ${mergeCount} open` : ""}`}
          variant={mergeCount > 0 ? "primary" : "secondary"}
          onPress={() => router.push("/admin/merges")}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: spacing(6), gap: spacing(3) },
  container: { padding: spacing(5), gap: spacing(3) },
  h1: { ...typography.h1, color: colors.text },
  body: { ...typography.body, color: colors.textDim },
  // referenced from above to silence unused warnings if styles get split later
  pad: { padding: spacing(4), borderRadius: radius.lg, ...shadow.card },
});
