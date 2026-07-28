import { useState } from "react";
import { Alert, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";

import { Screen } from "@/components/Screen";
import { Button } from "@/components/Button";
import { Chip } from "@/components/Chip";
import { fetchDog, flagDog } from "@/lib/api";
import { useAuthStore } from "@/stores/auth";
import { colors, radius, shadow, spacing, typography } from "@/lib/theme";

type FlagType = "injured" | "missing" | "deceased";
const TYPES: FlagType[] = ["injured", "missing", "deceased"];
const LABELS: Record<FlagType, string> = {
  injured: "Injured",
  missing: "Missing",
  deceased: "Deceased",
};

export default function FlagCat() {
  const { dogId } = useLocalSearchParams<{ dogId: string }>();
  const router = useRouter();
  const session = useAuthStore((s) => s.session);
  const [type, setType] = useState<FlagType | null>(null);
  const [description, setDescription] = useState("");
  const [busy, setBusy] = useState(false);

  const dogQ = useQuery({
    queryKey: ["dog", dogId],
    queryFn: () => fetchDog(dogId!),
    enabled: !!dogId,
  });

  if (!session) {
    return (
      <Screen style={styles.center}>
        <Text style={styles.body}>Sign in to report a welfare issue.</Text>
        <Button label="Sign in" onPress={() => router.push("/auth")} />
      </Screen>
    );
  }

  const submit = async () => {
    if (!dogId || !type) {
      Alert.alert("Pick a type", "Tap Injured, Missing, or Deceased before reporting.");
      return;
    }
    if (!description.trim()) {
      Alert.alert("Describe what you saw", "A short note helps the community confirm the report.");
      return;
    }
    setBusy(true);
    try {
      await flagDog({ dogId, flagType: type, description: description.trim() });
      Alert.alert(
        "Report submitted",
        "Thanks. If another person also reports it (or a Verified Feeder confirms), the dog will be marked needing help and shown on the Feed.",
      );
      router.back();
    } catch (e) {
      Alert.alert("Couldn't submit", e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen scroll>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <Text style={styles.h1}>Report a welfare issue</Text>
        {dogQ.data ? <Text style={styles.subtitle}>For {dogQ.data.name}</Text> : null}

        <Text style={styles.label}>What's the issue?</Text>
        <View style={styles.chipWrap}>
          {TYPES.map((t) => (
            <Chip key={t} label={LABELS[t]} selected={type === t} onPress={() => setType(t)} />
          ))}
        </View>

        <Text style={styles.label}>Description</Text>
        <TextInput
          value={description}
          onChangeText={setDescription}
          placeholder="What did you see? Where? How recently?"
          placeholderTextColor={colors.textDim}
          multiline
          maxLength={500}
          style={styles.input}
        />

        <View style={styles.note}>
          <Text style={styles.noteText}>
            Verified Feeder reports trigger an alert immediately. Standard reports
            need either a second report or admin review before becoming visible
            to the community.
          </Text>
        </View>

        <Button label="Submit report" onPress={submit} loading={busy} variant="danger" />
        <Button label="Cancel" variant="ghost" onPress={() => router.back()} />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: { padding: spacing(5), gap: spacing(2) },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: spacing(6), gap: spacing(3) },
  h1: { ...typography.h1, color: colors.text },
  subtitle: { ...typography.body, color: colors.textDim, marginBottom: spacing(2) },
  label: { ...typography.label, color: colors.text, marginTop: spacing(3) },
  chipWrap: { flexDirection: "row", gap: spacing(2), marginTop: spacing(1) },
  input: {
    minHeight: 120,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    fontSize: 16,
    color: colors.text,
    textAlignVertical: "top",
    ...shadow.card,
  },
  note: {
    backgroundColor: colors.accentSoft,
    padding: spacing(3),
    borderRadius: radius.md,
    marginTop: spacing(3),
  },
  noteText: { ...typography.small, color: colors.text },
  body: { ...typography.body, color: colors.text, textAlign: "center" },
});
