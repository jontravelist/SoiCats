import { useState } from "react";
import { Alert, KeyboardAvoidingView, Linking, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { Image } from "expo-image";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as ImagePicker from "expo-image-picker";

import { Screen } from "@/components/Screen";
import { Button } from "@/components/Button";
import { fetchDog, logFeed } from "@/lib/api";
import { preparePhoto, uploadSightingPhoto } from "@/lib/photo";
import { useAuthStore } from "@/stores/auth";
import { useLocation } from "@/hooks/useLocation";
import { useProfile } from "@/hooks/useProfile";
import { useQuery } from "@tanstack/react-query";
import { colors, radius, shadow, spacing, typography } from "@/lib/theme";

export default function LogFeed() {
  const { dogId } = useLocalSearchParams<{ dogId: string }>();
  const router = useRouter();
  const session = useAuthStore((s) => s.session);
  const profile = useProfile();
  const { coords } = useLocation();
  const [notes, setNotes] = useState("");
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const dogQ = useQuery({ queryKey: ["dog", dogId], queryFn: () => fetchDog(dogId!), enabled: !!dogId });

  if (!session || !profile.data) {
    return <Screen style={styles.center}><Text style={styles.body}>Loading…</Text></Screen>;
  }

  const isFeeder = profile.data.role === "feeder" || profile.data.role === "app_admin";
  if (!isFeeder) {
    return (
      <Screen style={styles.center}>
        <Text style={styles.bigEmoji}>🍚</Text>
        <Text style={styles.h2}>Verified Feeders only</Text>
        <Text style={styles.body}>Apply on your Profile to log feeds.</Text>
        <Button label="Apply" variant="primary" onPress={() => router.replace("/profile/apply-feeder")} />
        <Button label="Back" variant="ghost" onPress={() => router.back()} />
      </Screen>
    );
  }

  const pickPhoto = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert(
        "Photos permission",
        "Open Settings → Expo Go → Photos to attach a photo.",
        [
          { text: "Cancel", style: "cancel" },
          { text: "Settings", onPress: () => Linking.openSettings() },
        ],
      );
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 0.85 });
    if (!result.canceled) setPhotoUri(result.assets[0].uri);
  };

  const submit = async () => {
    if (!dogId) return;
    setBusy(true);
    try {
      let photoUrl: string | null = null;
      if (photoUri) {
        const prepared = await preparePhoto(photoUri);
        photoUrl = await uploadSightingPhoto(prepared.uri, session.user.id);
      }
      await logFeed({
        dogId,
        notes: notes.trim() || null,
        photoUrl,
        lat: coords?.latitude,
        lng: coords?.longitude,
      });
      router.back();
    } catch (e) {
      Alert.alert("Couldn't log feed", e instanceof Error ? e.message : String(e));
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
          <Text style={styles.h1}>Log feed</Text>
          {dogQ.data ? <Text style={styles.subtitle}>For {dogQ.data.name}</Text> : null}
          <Text style={styles.intro}>
            We'll record the time as now ({new Date().toLocaleTimeString()}) and your current location
            (if you've granted GPS).
          </Text>

          <Text style={styles.label}>Notes (optional)</Text>
          <TextInput
            value={notes}
            onChangeText={setNotes}
            placeholder="What did you feed? Anything to flag for next feeder?"
            placeholderTextColor={colors.textDim}
            multiline
            maxLength={500}
            style={[styles.input, { minHeight: 100, textAlignVertical: "top", paddingVertical: 14 }]}
          />

          <Text style={styles.label}>Photo (optional)</Text>
          {photoUri ? (
            <View style={styles.photoRow}>
              <Image source={photoUri} style={styles.photoThumb} contentFit="cover" />
              <Pressable onPress={() => setPhotoUri(null)}>
                <Text style={styles.removeLink}>Remove</Text>
              </Pressable>
            </View>
          ) : (
            <Button label="Add a photo" variant="secondary" onPress={pickPhoto} />
          )}

          <Button label="Log feed" onPress={submit} loading={busy} style={{ marginTop: spacing(4) }} />
          <Button label="Cancel" variant="ghost" onPress={() => router.back()} />
        </ScrollView>
      </Screen>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { padding: spacing(5), gap: spacing(2) },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: spacing(6), gap: spacing(3) },
  bigEmoji: { fontSize: 64 },
  h1: { ...typography.h1, color: colors.text },
  h2: { ...typography.h2, color: colors.text, textAlign: "center" },
  subtitle: { ...typography.body, color: colors.textDim, marginBottom: spacing(2) },
  intro: { ...typography.small, color: colors.textDim, marginBottom: spacing(2) },
  body: { ...typography.body, color: colors.textDim, textAlign: "center" },
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
  photoRow: { flexDirection: "row", alignItems: "center", gap: spacing(3) },
  photoThumb: { width: 80, height: 80, borderRadius: radius.md, backgroundColor: colors.surfaceAlt },
  removeLink: { ...typography.body, color: colors.danger, fontWeight: "700" },
});
