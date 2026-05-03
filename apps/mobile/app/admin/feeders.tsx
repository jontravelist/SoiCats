import { useState } from "react";
import { ActivityIndicator, Alert, StyleSheet, Text, View } from "react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { Screen } from "@/components/Screen";
import { Button } from "@/components/Button";
import {
  approveFeederApplication,
  fetchOpenFeederApplications,
  rejectFeederApplication,
} from "@/lib/api";
import { useTimeAgo } from "@/hooks/useTimeAgo";
import { useProfile } from "@/hooks/useProfile";
import { colors, radius, shadow, spacing, typography } from "@/lib/theme";

interface Row {
  id: string;
  area: string;
  bio: string;
  created_at: string;
  applicant: { id: string; handle: string | null; display_name: string | null; avatar_url: string | null; points: number } | null;
}

export default function FeederQueue() {
  const profile = useProfile();
  const qc = useQueryClient();
  const timeAgo = useTimeAgo();
  const [acting, setActing] = useState<string | null>(null);

  const q = useQuery({
    queryKey: ["admin-open-feeder-applications"],
    queryFn: fetchOpenFeederApplications,
    enabled: profile.data?.role === "app_admin",
  });

  const approveMut = useMutation({
    mutationFn: (id: string) => approveFeederApplication(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-open-feeder-applications"] }),
  });
  const rejectMut = useMutation({
    mutationFn: ({ id, why }: { id: string; why?: string }) => rejectFeederApplication(id, why),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-open-feeder-applications"] }),
  });

  if (profile.data?.role !== "app_admin") {
    return <Screen style={styles.center}><Text style={styles.body}>Admins only.</Text></Screen>;
  }

  if (q.isLoading) {
    return <Screen><ActivityIndicator style={{ flex: 1 }} /></Screen>;
  }

  const items = (q.data ?? []) as unknown as Row[];

  if (items.length === 0) {
    return (
      <Screen style={styles.center}>
        <Text style={styles.bigEmoji}>🍚</Text>
        <Text style={styles.h2}>Inbox zero</Text>
        <Text style={styles.body}>No feeder applications waiting.</Text>
      </Screen>
    );
  }

  const onApprove = (row: Row) => {
    Alert.alert(
      "Approve application?",
      `@${row.applicant?.handle ?? "anon"} will become a Verified Feeder. Their flags auto-verify and they can log feeds.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Approve",
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

  const onReject = (row: Row) => {
    Alert.prompt?.(
      "Reject application?",
      "Optional: tell them why. They'll see this when they next open the apply screen.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Reject",
          style: "destructive",
          onPress: async (why?: string) => {
            setActing(row.id);
            try { await rejectMut.mutateAsync({ id: row.id, why }); }
            catch (e) { Alert.alert("Couldn't reject", e instanceof Error ? e.message : String(e)); }
            finally { setActing(null); }
          },
        },
      ],
      "plain-text",
    ) ?? (async () => {
      // Alert.prompt is iOS-only. Fallback for Android: reject with no reason.
      setActing(row.id);
      try { await rejectMut.mutateAsync({ id: row.id }); }
      catch (e) { Alert.alert("Couldn't reject", e instanceof Error ? e.message : String(e)); }
      finally { setActing(null); }
    })();
  };

  return (
    <Screen scroll>
      <View style={styles.container}>
        <Text style={styles.h1}>Feeder applications</Text>

        {items.map((row) => (
          <View key={row.id} style={styles.card}>
            <Text style={styles.handle}>@{row.applicant?.handle ?? "anon"}</Text>
            <Text style={styles.meta}>
              {row.applicant?.points ?? 0} points · applied {timeAgo(row.created_at)}
            </Text>

            <View style={styles.field}>
              <Text style={styles.label}>Area</Text>
              <Text style={styles.value}>{row.area}</Text>
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>About</Text>
              <Text style={styles.value}>{row.bio}</Text>
            </View>

            <View style={styles.actions}>
              <Button
                label="Approve"
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
  body: { ...typography.body, color: colors.textDim, textAlign: "center" },
  h1: { ...typography.h1, color: colors.text, marginBottom: spacing(2) },
  h2: { ...typography.h2, color: colors.text },
  container: { padding: spacing(4), gap: spacing(3) },
  card: { backgroundColor: colors.surface, padding: spacing(4), borderRadius: radius.lg, gap: spacing(1), ...shadow.card },
  handle: { ...typography.h3, color: colors.text },
  meta: { ...typography.small, color: colors.textDim, marginBottom: spacing(2) },
  field: { marginTop: spacing(2) },
  label: { ...typography.label, color: colors.textDim },
  value: { ...typography.body, color: colors.text, marginTop: 2 },
  actions: { flexDirection: "row", gap: spacing(2), marginTop: spacing(3) },
});
