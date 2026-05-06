import { useState } from "react";
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";

import { Screen } from "@/components/Screen";
import { Button } from "@/components/Button";
import { Chip } from "@/components/Chip";
import {
  awardPoints,
  computePhotoHash,
  createCat,
  createSighting,
  fetchDuplicateCandidates,
} from "@/lib/api";
import { CatCard } from "@/components/CatCard";
import { useUploadStore } from "@/stores/upload";
import { useAuthStore } from "@/stores/auth";
import { colors, spacing, typography } from "@/lib/theme";
import { AGE_GUESSES, PATTERNS, PRIMARY_COLOURS, SEXES, SUGGESTED_CAT_NAMES } from "@shared/cat-names";

type Duplicate = { id: string; name: string; distance_m: number; thumbnail_url: string | null };

export default function NewCatScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const session = useAuthStore((s) => s.session);
  const pending = useUploadStore((s) => s.pending);

  const [name, setName] = useState("");
  const [pattern, setPattern] = useState<string | null>(null);
  const [color, setColor] = useState<string | null>(null);
  const [age, setAge] = useState<string | null>(null);
  const [sex, setSex] = useState<string | null>(null);
  const [features, setFeatures] = useState("");
  const [duplicates, setDuplicates] = useState<Duplicate[] | null>(null);
  const [busy, setBusy] = useState(false);

  if (!pending || !pending.lat || !pending.lng) {
    return <Screen><Text>No pending photo</Text></Screen>;
  }

  const trySave = async () => {
    if (!session) {
      router.push("/auth");
      return;
    }
    if (!name.trim() || !pattern || !color) {
      Alert.alert(t("common.error"), "Name, pattern and colour are required");
      return;
    }

    if (duplicates === null) {
      // First attempt: check the duplicate candidates list. If any, show the
      // interstitial. Section 8.5 of BRIEF.md.
      const cands = await fetchDuplicateCandidates(pending.lat!, pending.lng!, color, pattern);
      if (cands.length > 0) {
        setDuplicates(cands);
        return;
      }
    }
    await save();
  };

  const save = async () => {
    if (!session) {
      router.push("/auth");
      return;
    }
    if (!pending?.remoteUrl || !pending.lat || !pending.lng) return;
    setBusy(true);
    try {
      const cat = await createCat({
        name: name.trim(),
        primary_color: color!,
        pattern: pattern!,
        age_guess: age,
        sex,
        distinguishing_features: features || null,
        lat: pending.lat,
        lng: pending.lng,
      });
      const sighting = await createSighting({
        cat_id: cat.id,
        photo_url: pending.remoteUrl,
        lat: pending.lat,
        lng: pending.lng,
        accuracy: pending.accuracy ?? null,
      });
      await computePhotoHash(sighting.id, sighting.photo_url);
      await awardPoints(sighting.id);
      useUploadStore.getState().setPending(null);
      router.replace(`/cat/${cat.id}`);
    } catch (e) {
      Alert.alert(t("common.error"), e instanceof Error ? e.message : String(e));
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
      <View style={styles.container}>
        <Text style={styles.h1}>{t("newCat.title")}</Text>

        <Text style={styles.label}>{t("newCat.namePlaceholder")}</Text>
        <TextInput value={name} onChangeText={setName} style={styles.input} maxLength={40} />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
          {SUGGESTED_CAT_NAMES.map((n) => (
            <Chip key={n} label={n} selected={name === n} onPress={() => setName(n)} />
          ))}
        </ScrollView>

        <Text style={styles.label}>{t("newCat.patternLabel")}</Text>
        <View style={styles.chipWrap}>
          {PATTERNS.map((p) => (
            <Chip key={p} label={t(`patterns.${p}`)} selected={pattern === p} onPress={() => setPattern(p)} />
          ))}
        </View>

        <Text style={styles.label}>{t("newCat.colorLabel")}</Text>
        <View style={styles.chipWrap}>
          {PRIMARY_COLOURS.map((c) => (
            <Chip key={c} label={c} selected={color === c} onPress={() => setColor(c)} />
          ))}
        </View>

        <Text style={styles.label}>{t("newCat.ageLabel")}</Text>
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

        <Text style={styles.label}>{t("newCat.featuresLabel")}</Text>
        <TextInput value={features} onChangeText={setFeatures} style={styles.input} multiline />

        {duplicates && duplicates.length > 0 ? (
          <View style={styles.duplicates}>
            <Text style={styles.warn}>{t("post.duplicateInterstitial")}</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
              {duplicates.map((d) => (
                <CatCard
                  key={d.id}
                  name={d.name}
                  thumbnailUrl={d.thumbnail_url}
                  subtitle={`${Math.round(d.distance_m)}m`}
                  onPress={() => router.replace({ pathname: "/post/identify" })}
                />
              ))}
            </ScrollView>
            <Button label={t("post.stillNew")} onPress={save} loading={busy} />
          </View>
        ) : (
          <Button label={t("newCat.save")} onPress={trySave} loading={busy} style={{ marginTop: spacing(3) }} />
        )}
      </View>
    </Screen>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { padding: spacing(4), gap: spacing(2) },
  h1: { ...typography.h1, marginBottom: spacing(2) },
  label: { ...typography.label, color: colors.textDim, marginTop: spacing(2) },
  input: {
    minHeight: 44,
    paddingHorizontal: 12, paddingVertical: 8,
    borderWidth: 1, borderColor: colors.border, borderRadius: 10,
    backgroundColor: colors.surface,
    ...typography.body,
  },
  chipRow: { gap: 8, paddingVertical: 4 },
  chipWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  duplicates: { marginTop: spacing(4), padding: spacing(3), borderRadius: 10, backgroundColor: "#FFEFD7" },
  warn: { ...typography.body, color: colors.warning, marginBottom: spacing(2), fontWeight: "600" },
});
