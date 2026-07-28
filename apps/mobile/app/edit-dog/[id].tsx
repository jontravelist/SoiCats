import { useEffect, useState } from "react";
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { Screen } from "@/components/Screen";
import { Button } from "@/components/Button";
import { Chip } from "@/components/Chip";
import { fetchDog, updateDog } from "@/lib/api";
import { useAuthStore } from "@/stores/auth";
import { AGE_GUESSES, SEXES } from "@shared/dog-names";
import { useTranslation } from "react-i18next";
import { colors, radius, shadow, spacing, typography } from "@/lib/theme";

export default function EditCat() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const session = useAuthStore((s) => s.session);
  const qc = useQueryClient();
  const { t } = useTranslation();

  const dogQ = useQuery({ queryKey: ["dog", id], queryFn: () => fetchDog(id!), enabled: !!id });

  const [name, setName] = useState("");
  const [nameTh, setNameTh] = useState("");
  const [features, setFeatures] = useState("");
  const [age, setAge] = useState<string | null>(null);
  const [sex, setSex] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!dogQ.data) return;
    setName(dogQ.data.name ?? "");
    setNameTh(dogQ.data.name_th ?? "");
    setFeatures(dogQ.data.distinguishing_features ?? "");
    setAge(dogQ.data.age_guess ?? null);
    setSex(dogQ.data.sex ?? "unknown");
  }, [dogQ.data]);

  if (!dogQ.data) {
    return <Screen><Text style={styles.loading}>Loading…</Text></Screen>;
  }

  const isDiscoverer = session?.user.id && session.user.id === dogQ.data.discovered_by_user_id;
  if (!isDiscoverer) {
    return (
      <Screen style={styles.center}>
        <Text style={styles.body}>Only the person who discovered this dog can edit it.</Text>
        <Button label="Back" variant="secondary" onPress={() => router.back()} />
      </Screen>
    );
  }

  const save = async () => {
    if (!name.trim()) {
      Alert.alert("Name required", "Give the dog a name.");
      return;
    }
    setBusy(true);
    try {
      await updateDog(id!, {
        name: name.trim(),
        name_th: nameTh.trim() || null,
        distinguishing_features: features.trim() || null,
        age_guess: age,
        sex,
      });
      await qc.invalidateQueries({ queryKey: ["dog", id] });
      router.back();
    } catch (e) {
      Alert.alert("Couldn't save", e instanceof Error ? e.message : String(e));
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
          <Text style={styles.h1}>Edit dog</Text>

          <Text style={styles.label}>Name</Text>
          <TextInput value={name} onChangeText={setName} style={styles.input} maxLength={40} />

          <Text style={styles.label}>Thai name (optional)</Text>
          <TextInput value={nameTh} onChangeText={setNameTh} style={styles.input} maxLength={40} />

          <Text style={styles.label}>Distinguishing features</Text>
          <TextInput value={features} onChangeText={setFeatures} style={styles.input} multiline />

          <Text style={styles.label}>Age</Text>
          <View style={styles.chipWrap}>
            {AGE_GUESSES.map((a) => (
              <Chip key={a} label={t(`ages.${a}`)} selected={age === a} onPress={() => setAge(a)} />
            ))}
          </View>

          <Text style={styles.label}>Sex</Text>
          <View style={styles.chipWrap}>
            {SEXES.map((s) => (
              <Chip key={s} label={t(`sexes.${s}`)} selected={sex === s} onPress={() => setSex(s)} />
            ))}
          </View>

          <Button label="Save" onPress={save} loading={busy} style={{ marginTop: spacing(4) }} />
          <Button label="Cancel" variant="ghost" onPress={() => router.back()} />
        </ScrollView>
      </Screen>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { padding: spacing(5), gap: spacing(2) },
  loading: { padding: spacing(6), color: colors.textDim },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: spacing(6), gap: spacing(3) },
  h1: { ...typography.h1, color: colors.text, marginBottom: spacing(2) },
  body: { ...typography.body, color: colors.text, textAlign: "center" },
  label: { ...typography.label, color: colors.text, marginTop: spacing(2) },
  input: {
    minHeight: 56,
    paddingHorizontal: 16,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    fontSize: 16,
    color: colors.text,
    ...shadow.card,
  },
  chipWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
});
