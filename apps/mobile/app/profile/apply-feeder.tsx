import { useState } from "react";
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";

import { Screen } from "@/components/Screen";
import { Button } from "@/components/Button";
import { fetchMyFeederApplication, submitFeederApplication } from "@/lib/api";
import { useAuthStore } from "@/stores/auth";
import { useProfile } from "@/hooks/useProfile";
import { colors, radius, shadow, spacing, typography } from "@/lib/theme";

export default function ApplyFeeder() {
  const router = useRouter();
  const session = useAuthStore((s) => s.session);
  const profile = useProfile();
  const [area, setArea] = useState("");
  const [bio, setBio] = useState("");
  const [busy, setBusy] = useState(false);

  const existingQ = useQuery({
    queryKey: ["my-feeder-application", session?.user.id],
    queryFn: fetchMyFeederApplication,
    enabled: !!session,
  });

  if (!session) {
    return (
      <Screen style={styles.center}>
        <Text style={styles.body}>Sign in to apply.</Text>
        <Button label="Sign in" onPress={() => router.push("/auth")} />
      </Screen>
    );
  }

  if (profile.data?.role === "feeder" || profile.data?.role === "app_admin") {
    return (
      <Screen style={styles.center}>
        <Text style={styles.bigEmoji}>🍚</Text>
        <Text style={styles.h2}>You're already a Verified Feeder.</Text>
        <Button label="Back" variant="secondary" onPress={() => router.back()} />
      </Screen>
    );
  }

  const existing = existingQ.data;
  const hasOpen = existing?.status === "open";

  const submit = async () => {
    if (!area.trim() || !bio.trim()) {
      Alert.alert("Fill in both fields", "Tell us where you feed and a little about yourself.");
      return;
    }
    setBusy(true);
    try {
      await submitFeederApplication({ area: area.trim(), bio: bio.trim() });
      Alert.alert(
        "Application submitted",
        "Thanks. An admin will review and let you know.",
      );
      router.back();
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (/duplicate key/i.test(msg)) {
        Alert.alert("Already applied", "You've got an open application waiting on review.");
      } else {
        Alert.alert("Couldn't submit", msg);
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={64}
    >
      <Screen scroll>
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
          <Text style={styles.h1}>Verified Feeder</Text>
          <Text style={styles.intro}>
            Verified Feeders can log feeds, and their welfare flags trigger
            community alerts immediately. We approve people who actually
            feed dogs in the area, regularly.
          </Text>

          {existing && existing.status === "rejected" ? (
            <View style={styles.rejectBox}>
              <Text style={styles.rejectTitle}>Last application: rejected</Text>
              {existing.reject_reason ? (
                <Text style={styles.rejectText}>{existing.reject_reason}</Text>
              ) : null}
              <Text style={styles.rejectHint}>You can apply again below.</Text>
            </View>
          ) : null}

          {hasOpen ? (
            <View style={styles.pendingBox}>
              <Text style={styles.pendingTitle}>Application pending</Text>
              <Text style={styles.pendingText}>
                Submitted {new Date(existing!.created_at).toLocaleDateString()}.
                We'll let you know when an admin reviews it.
              </Text>
              <Button label="Back" variant="secondary" onPress={() => router.back()} />
            </View>
          ) : (
            <>
              <Text style={styles.label}>Where do you feed?</Text>
              <TextInput
                value={area}
                onChangeText={setArea}
                placeholder="e.g. Sukhumvit 33, Asok BTS, Soi Cowboy"
                placeholderTextColor={colors.textDim}
                maxLength={200}
                style={styles.input}
              />

              <Text style={styles.label}>Tell us about yourself</Text>
              <TextInput
                value={bio}
                onChangeText={setBio}
                placeholder="How long have you been feeding? Roughly how many dogs? Anything else we should know?"
                placeholderTextColor={colors.textDim}
                multiline
                maxLength={1000}
                style={[styles.input, { minHeight: 140, textAlignVertical: "top", paddingVertical: 14 }]}
              />

              <Button label="Submit application" onPress={submit} loading={busy} style={{ marginTop: spacing(4) }} />
              <Button label="Cancel" variant="ghost" onPress={() => router.back()} />
            </>
          )}
        </ScrollView>
      </Screen>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { padding: spacing(5), gap: spacing(2) },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: spacing(6), gap: spacing(3) },
  bigEmoji: { fontSize: 72 },
  h1: { ...typography.h1, color: colors.text },
  h2: { ...typography.h2, color: colors.text, textAlign: "center" },
  intro: { ...typography.body, color: colors.textDim, marginBottom: spacing(2) },
  body: { ...typography.body, color: colors.text, textAlign: "center" },
  label: { ...typography.label, color: colors.text, marginTop: spacing(3) },
  input: {
    minHeight: 56,
    paddingHorizontal: 16,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    fontSize: 16,
    color: colors.text,
    ...shadow.card,
  },
  pendingBox: {
    backgroundColor: colors.accentSoft,
    padding: spacing(4),
    borderRadius: radius.lg,
    gap: spacing(2),
  },
  pendingTitle: { ...typography.h3, color: colors.text },
  pendingText: { ...typography.body, color: colors.text },
  rejectBox: {
    backgroundColor: "#FEE5E2",
    padding: spacing(3),
    borderRadius: radius.md,
    marginBottom: spacing(2),
  },
  rejectTitle: { ...typography.h3, color: colors.danger },
  rejectText: { ...typography.body, color: colors.text, marginTop: 4 },
  rejectHint: { ...typography.small, color: colors.textDim, marginTop: 4 },
});
