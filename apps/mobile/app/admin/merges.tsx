import { useState } from "react";
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { Screen } from "@/components/Screen";
import { Button } from "@/components/Button";
import { approveDogMerge, fetchOpenMergeRequests, rejectDogMerge } from "@/lib/api";
import { useTimeAgo } from "@/hooks/useTimeAgo";
import { useProfile } from "@/hooks/useProfile";
import { colors, radius, shadow, spacing, typography } from "@/lib/theme";

interface CatLite {
  id: string;
  name: string;
  primary_color: string;
  pattern: string;
  distinguishing_features: string | null;
}

interface MergeRow {
  id: string;
  reason: string;
  created_at: string;
  source: CatLite;
  target: CatLite;
  requester: { handle: string | null } | null;
}

export default function MergeQueue() {
  const router = useRouter();
  const profile = useProfile();
  const qc = useQueryClient();
  const timeAgo = useTimeAgo();
  const [acting, setActing] = useState<string | null>(null);

  const q = useQuery({
    queryKey: ["admin-open-merges"],
    queryFn: fetchOpenMergeRequests,
    enabled: profile.data?.role === "app_admin",
  });

  const approveMut = useMutation({
    mutationFn: (id: string) => approveDogMerge(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-open-merges"] }),
  });
  const rejectMut = useMutation({
    mutationFn: (id: string) => rejectDogMerge(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-open-merges"] }),
  });

  if (profile.data?.role !== "app_admin") {
    return (
      <Screen style={styles.center}>
        <Text style={styles.body}>Admins only.</Text>
      </Screen>
    );
  }

  if (q.isLoading) {
    return <Screen><ActivityIndicator style={{ flex: 1 }} /></Screen>;
  }

  const items = (q.data ?? []) as unknown as MergeRow[];

  if (items.length === 0) {
    return (
      <Screen style={styles.center}>
        <Text style={styles.bigEmoji}>🎉</Text>
        <Text style={styles.h2}>Inbox zero</Text>
        <Text style={styles.body}>No merge requests waiting.</Text>
      </Screen>
    );
  }

  const onApprove = (row: MergeRow) => {
    Alert.alert(
      "Approve merge?",
      `All photos, favourites, and flags from "${row.source.name}" will move to "${row.target.name}", and "${row.source.name}" will be deleted. This can't be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Approve",
          style: "destructive",
          onPress: async () => {
            setActing(row.id);
            try { await approveMut.mutateAsync(row.id); }
            catch (e) { Alert.alert("Couldn't approve", e instanceof Error ? e.message : String(e)); }
            finally { setActing(null); }
          },
        },
      ],
    );
  };

  const onReject = (row: MergeRow) => {
    setActing(row.id);
    rejectMut.mutateAsync(row.id)
      .catch((e) => Alert.alert("Couldn't reject", e instanceof Error ? e.message : String(e)))
      .finally(() => setActing(null));
  };

  return (
    <Screen scroll>
      <View style={styles.container}>
        <Text style={styles.h1}>Merge requests</Text>

        {items.map((row) => (
          <View key={row.id} style={styles.card}>
            <Text style={styles.meta}>
              @{row.requester?.handle ?? "anon"} · {timeAgo(row.created_at)}
            </Text>

            <View style={styles.compareRow}>
              <Pressable style={styles.dogSide} onPress={() => router.push(`/dog/${row.source.id}`)}>
                <Text style={styles.label}>From (will be deleted)</Text>
                <Text style={styles.dogName}>{row.source.name}</Text>
                <Text style={styles.dogMeta}>
                  {row.source.primary_color} · {row.source.pattern}
                </Text>
                {row.source.distinguishing_features ? (
                  <Text style={styles.feat} numberOfLines={2}>✨ {row.source.distinguishing_features}</Text>
                ) : null}
              </Pressable>

              <Text style={styles.arrow}>→</Text>

              <Pressable style={styles.dogSide} onPress={() => router.push(`/dog/${row.target.id}`)}>
                <Text style={styles.label}>Into (will survive)</Text>
                <Text style={styles.dogName}>{row.target.name}</Text>
                <Text style={styles.dogMeta}>
                  {row.target.primary_color} · {row.target.pattern}
                </Text>
                {row.target.distinguishing_features ? (
                  <Text style={styles.feat} numberOfLines={2}>✨ {row.target.distinguishing_features}</Text>
                ) : null}
              </Pressable>
            </View>

            <View style={styles.reasonBox}>
              <Text style={styles.label}>Reason</Text>
              <Text style={styles.reasonText}>{row.reason}</Text>
            </View>

            <View style={styles.actions}>
              <Button
                label="Approve merge"
                variant="danger"
                onPress={() => onApprove(row)}
                loading={acting === row.id && approveMut.isPending}
                disabled={!!acting && acting !== row.id}
              />
              <Button
                label="Reject"
                variant="ghost"
                onPress={() => onReject(row)}
                loading={acting === row.id && rejectMut.isPending}
                disabled={!!acting && acting !== row.id}
              />
            </View>
          </View>
        ))}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: spacing(6), gap: spacing(3) },
  bigEmoji: { fontSize: 64 },
  h1: { ...typography.h1, color: colors.text, marginBottom: spacing(2) },
  h2: { ...typography.h2, color: colors.text },
  body: { ...typography.body, color: colors.textDim, textAlign: "center" },

  container: { padding: spacing(4), gap: spacing(3) },
  card: { backgroundColor: colors.surface, padding: spacing(4), borderRadius: radius.lg, gap: spacing(2), ...shadow.card },
  meta: { ...typography.small, color: colors.textDim },

  compareRow: { flexDirection: "row", alignItems: "stretch", gap: spacing(2), marginVertical: spacing(2) },
  dogSide: { flex: 1, padding: spacing(2), borderRadius: radius.md, backgroundColor: colors.bg, gap: 2 },
  arrow: { fontSize: 24, color: colors.primary, fontWeight: "900", alignSelf: "center" },

  label: { ...typography.label, color: colors.textDim },
  dogName: { ...typography.h3, color: colors.text },
  dogMeta: { ...typography.small, color: colors.textDim },
  feat: { ...typography.small, color: colors.text, fontStyle: "italic", marginTop: 2 },

  reasonBox: { padding: spacing(2), backgroundColor: colors.accentSoft, borderRadius: radius.md },
  reasonText: { ...typography.body, color: colors.text },

  actions: { flexDirection: "row", gap: spacing(2), marginTop: spacing(2) },
});
