import { useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import * as ImagePicker from "expo-image-picker";

import { Screen } from "@/components/Screen";
import { Button } from "@/components/Button";
import { useAuthStore } from "@/stores/auth";
import { useUploadStore } from "@/stores/upload";
import { preparePhoto, uploadSightingPhoto } from "@/lib/photo";
import { useLocation } from "@/hooks/useLocation";
import { colors, spacing, typography } from "@/lib/theme";

// Post tab acts as a launcher for the camera or library.
// Auth is gated here: anonymous users see a sign-in prompt instead.
export default function PostTab() {
  const { t } = useTranslation();
  const router = useRouter();
  const session = useAuthStore((s) => s.session);
  const { coords, error: locError } = useLocation();
  const setPending = useUploadStore((s) => s.setPending);
  const [busy, setBusy] = useState(false);

  if (!session) {
    return (
      <Screen style={styles.center}>
        <Text style={styles.title}>{t("auth.signIn")}</Text>
        <Text style={styles.tagline}>{t("app.tagline")}</Text>
        <Button label={t("auth.signIn")} onPress={() => router.push("/auth")} />
      </Screen>
    );
  }

  const start = async (mode: "camera" | "library") => {
    setBusy(true);
    try {
      const result = mode === "camera"
        ? await ImagePicker.launchCameraAsync({ quality: 0.9, exif: false })
        : await ImagePicker.launchImageLibraryAsync({ quality: 0.9, exif: false, mediaTypes: ImagePicker.MediaTypeOptions.Images });

      if (result.canceled) return;
      const asset = result.assets[0];
      const prepared = await preparePhoto(asset.uri);

      setPending({
        localUri: prepared.uri,
        uploading: true,
        lat: coords?.latitude,
        lng: coords?.longitude,
        accuracy: coords?.accuracy ?? null,
      });

      // Push to cat-picker immediately. Upload runs in the background and the
      // picker waits for `remoteUrl` before submitting.
      router.push("/post/identify");

      const url = await uploadSightingPhoto(prepared.uri, session.user.id);
      useUploadStore.getState().patch({ remoteUrl: url, uploading: false });
    } catch (e) {
      console.error(e);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen>
      <View style={styles.center}>
        <Text style={styles.title}>{t("post.title")}</Text>
        {locError ? <Text style={styles.warning}>{t("post.lowAccuracy")}</Text> : null}
        {!coords ? <ActivityIndicator /> : null}
        <View style={styles.buttons}>
          <Button label={t("post.openCamera")} onPress={() => start("camera")} loading={busy} />
          <Button label={t("post.openLibrary")} onPress={() => start("library")} variant="secondary" />
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: spacing(4), gap: spacing(3) },
  title: { ...typography.h1 },
  tagline: { ...typography.body, color: colors.textDim, textAlign: "center" },
  buttons: { width: "100%", gap: spacing(2), marginTop: spacing(4) },
  warning: { ...typography.body, color: colors.warning, textAlign: "center" },
});
