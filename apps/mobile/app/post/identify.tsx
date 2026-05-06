import { useEffect, useState } from "react";
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";

import { Screen } from "@/components/Screen";
import { CatCard } from "@/components/CatCard";
import { Button } from "@/components/Button";
import {
  awardPoints,
  computePhotoHash,
  createSighting,
  fetchNearbyCats,
} from "@/lib/api";
import { uploadSightingPhoto } from "@/lib/photo";
import { useUploadStore } from "@/stores/upload";
import { useAuthStore } from "@/stores/auth";
import { colors, spacing, typography } from "@/lib/theme";

// Cat-picker step in the upload flow.
// User has just taken/selected a photo; we show nearby cats and let them
// pick existing, create new, or send to the "not sure" queue.
export default function IdentifyScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const session = useAuthStore((s) => s.session);
  const pending = useUploadStore((s) => s.pending);
  const [caption, setCaption] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const nearbyQ = useQuery({
    queryKey: ["nearby-for-id", pending?.lat, pending?.lng],
    queryFn: () => fetchNearbyCats(pending!.lat!, pending!.lng!),
    enabled: !!pending?.lat && !!pending?.lng,
  });

  // If the user picked a photo while signed out, the upload was skipped.
  // As soon as they sign in (likely from the banner below), kick it off.
  useEffect(() => {
    if (!session || !pending) return;
    if (pending.remoteUrl || pending.uploading) return;
    useUploadStore.getState().patch({ uploading: true });
    uploadSightingPhoto(pending.localUri, session.user.id)
      .then((url) => useUploadStore.getState().patch({ remoteUrl: url, uploading: false }))
      .catch((e) => {
        useUploadStore.getState().patch({ uploading: false });
        Alert.alert("Upload failed", e instanceof Error ? e.message : String(e));
      });
  }, [session, pending?.localUri, pending?.remoteUrl, pending?.uploading]);

  if (!pending) {
    return (
      <Screen style={styles.center}>
        <Text>No pending photo.</Text>
        <Button label={t("common.cancel")} onPress={() => router.back()} variant="ghost" />
      </Screen>
    );
  }

  const submitWithCat = async (catId: string | null, status: "confirmed" | "pending_id") => {
    if (!session) {
      // Don't drop the photo. Push to /auth — Zustand keeps `pending` in
      // memory and the user lands back on this exact screen after sign-in.
      router.push("/auth");
      return;
    }
    if (pending.uploading || !pending.remoteUrl) {
      Alert.alert(t("common.loading"));
      return;
    }
    if (!pending.lat || !pending.lng) {
      Alert.alert(t("post.lowAccuracy"));
      return;
    }
    setSubmitting(true);
    try {
      const sighting = await createSighting({
        cat_id: status === "confirmed" ? catId : null,
        photo_url: pending.remoteUrl,
        lat: pending.lat,
        lng: pending.lng,
        accuracy: pending.accuracy ?? null,
        caption: caption || null,
      });
      // Compute pHash, then award points. Both are best-effort: failures don't
      // surface to the user — the photo is already posted.
      await computePhotoHash(sighting.id, sighting.photo_url);
      if (status === "confirmed") {
        await awardPoints(sighting.id);
      }
      useUploadStore.getState().setPending(null);
      if (catId) {
        router.replace(`/cat/${catId}`);
      } else {
        // 'Not sure' path: photo goes into the community ID queue. Tell the
        // user where it went so it doesn't feel like the photo vanished.
        router.replace("/profile/my-posts");
        Alert.alert(
          "Sent for community ID",
          "Your photo is in the help-identify queue. You'll find it under My posts on the Profile tab.",
        );
      }
    } catch (e) {
      Alert.alert(t("common.error"), e instanceof Error ? e.message : String(e));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={64}
    >
    <Screen scroll>
      <Image source={pending.localUri} style={styles.photo} contentFit="cover" />

      {!session ? (
        <View style={styles.signInBanner}>
          <Text style={styles.signInBannerText}>
            Sign in to post this photo. Your selection is kept.
          </Text>
          <Button label="Sign in" onPress={() => router.push("/auth")} />
        </View>
      ) : null}

      <View style={styles.locBadge}>
        <Text style={styles.locBadgeText}>
          {pending.locationSource === "photo"
            ? "📍 Using location from photo"
            : "📍 Using your current location"}
        </Text>
      </View>

      {pending.uploading ? (
        <View style={styles.uploadingRow}>
          <ActivityIndicator />
          <Text style={styles.uploadingText}>{t("post.posting")}</Text>
        </View>
      ) : null}

      <Text style={styles.h2}>{t("post.whichCat")}</Text>

      {nearbyQ.isLoading ? (
        <ActivityIndicator />
      ) : (nearbyQ.data ?? []).length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyTitle}>No cats spotted here yet</Text>
          <Text style={styles.emptyBody}>
            Be the first — tap "New cat" below to give them a name. Or "Not sure"
            to send the photo to the community ID queue.
          </Text>
        </View>
      ) : (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.cardRow}>
          {(nearbyQ.data ?? []).map((c) => (
            <CatCard
              key={c.id}
              name={c.name}
              thumbnailUrl={c.thumbnail_url}
              subtitle={`${Math.round(c.distance_m)}m · ${c.photo_count} photos`}
              onPress={() => submitWithCat(c.id, "confirmed")}
            />
          ))}
        </ScrollView>
      )}

      <View style={styles.actions}>
        <Button
          label={t("post.newCat")}
          onPress={() => router.push({ pathname: "/post/new-cat" })}
          variant="secondary"
        />
        <Button
          label={t("post.notSure")}
          onPress={() => submitWithCat(null, "pending_id")}
          variant="ghost"
          loading={submitting}
        />
      </View>

      <Text style={styles.label}>{t("post.captionPlaceholder")}</Text>
      <TextInput
        value={caption}
        onChangeText={setCaption}
        maxLength={280}
        multiline
        placeholder={t("post.captionPlaceholder")}
        style={styles.caption}
      />
    </Screen>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  photo: { width: "100%", aspectRatio: 1, backgroundColor: colors.border },
  locBadge: {
    alignSelf: "flex-start",
    margin: spacing(3),
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  locBadgeText: { ...typography.small, color: colors.textDim },
  signInBanner: {
    margin: spacing(3),
    padding: spacing(3),
    borderRadius: 10,
    backgroundColor: "#FFEFD7",
    gap: spacing(2),
  },
  signInBannerText: { ...typography.body, color: colors.text },
  uploadingRow: { flexDirection: "row", alignItems: "center", gap: spacing(2), padding: spacing(3) },
  uploadingText: { ...typography.body, color: colors.textDim },
  h2: { ...typography.h2, padding: spacing(3) },
  cardRow: { paddingHorizontal: spacing(3), paddingBottom: spacing(2) },
  actions: { padding: spacing(3), gap: spacing(2) },
  label: { ...typography.label, color: colors.textDim, paddingHorizontal: spacing(3) },
  caption: {
    margin: spacing(3),
    padding: spacing(3),
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    minHeight: 80,
    ...typography.body,
  },
});
