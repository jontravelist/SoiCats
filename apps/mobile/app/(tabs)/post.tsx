import { useState } from "react";
import { ActivityIndicator, Alert, Linking, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import * as ImagePicker from "expo-image-picker";

import { Screen } from "@/components/Screen";
import { Button } from "@/components/Button";
import { useAuthStore } from "@/stores/auth";
import { useUploadStore } from "@/stores/upload";
import { preparePhoto, uploadSightingPhoto } from "@/lib/photo";
import { extractGpsFromExif } from "@/lib/exif";
import { useLocation } from "@/hooks/useLocation";
import { colors, spacing, typography } from "@/lib/theme";

// Asks for camera or photo-library permission and, if denied, surfaces a
// clear modal with a button that jumps straight to the iOS Settings app.
// Default expo-image-picker behaviour is a confusing CodedError, which is
// what users see if they tapped Don't Allow on a previous prompt.
async function ensurePermission(mode: "camera" | "library"): Promise<boolean> {
  const req = mode === "camera"
    ? await ImagePicker.requestCameraPermissionsAsync()
    : await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (req.granted) return true;

  const what = mode === "camera" ? "Camera" : "Photos";
  Alert.alert(
    `${what} permission needed`,
    `Soi Dogs needs ${what} access to add photos. Open Settings → Expo Go and turn ${what} on.`,
    [
      { text: "Cancel", style: "cancel" },
      { text: "Open Settings", onPress: () => Linking.openSettings() },
    ],
  );
  return false;
}

// Post tab acts as a launcher for the camera or library.
// Auth is gated here: anonymous users see a sign-in prompt instead.
export default function PostTab() {
  const { t } = useTranslation();
  const router = useRouter();
  // Deliberately not gating on auth here. Letting people pick a photo
  // first (and reach the dog-picker) makes sign-in feel like a small
  // step rather than a wall. The actual post requires auth — that
  // prompt sits on the next screen so the photo isn't lost.
  const session = useAuthStore((s) => s.session);
  const { coords, error: locError } = useLocation();
  const setPending = useUploadStore((s) => s.setPending);
  const [busy, setBusy] = useState(false);

  const start = async (mode: "camera" | "library") => {
    setBusy(true);
    try {
      if (!(await ensurePermission(mode))) return;

      // Ask for EXIF so we can read GPS off library photos that already have it.
      const result = mode === "camera"
        ? await ImagePicker.launchCameraAsync({ quality: 0.9, exif: true })
        : await ImagePicker.launchImageLibraryAsync({ quality: 0.9, exif: true, mediaTypes: ["images"] });

      if (result.canceled) return;
      const asset = result.assets[0];

      // Prefer the photo's own GPS metadata (e.g. a library photo of a dog
      // taken at the right place yesterday). Fall back to the user's current
      // GPS for camera shots and for library photos with no embedded location.
      const exifGps = extractGpsFromExif(asset.exif as Record<string, unknown> | undefined);
      const haveExif = !!exifGps;
      const lat = exifGps?.lat ?? coords?.latitude;
      const lng = exifGps?.lng ?? coords?.longitude;

      const prepared = await preparePhoto(asset.uri);

      setPending({
        localUri: prepared.uri,
        uploading: true,
        lat,
        lng,
        // EXIF doesn't carry an accuracy field, so we leave it null when using
        // photo-embedded coords. The 50m accuracy gate doesn't apply in that case.
        accuracy: haveExif ? null : (coords?.accuracy ?? null),
        locationSource: haveExif ? "photo" : "device",
      });

      // Push to dog-picker immediately. Upload runs in the background and the
      // picker waits for `remoteUrl` before submitting.
      router.push("/post/identify");

      // The upload itself only works if signed in (storage RLS). If they're
      // not signed in we skip it; the dog-picker shows a sign-in banner and
      // re-attempts the upload after auth via the same store-based flow.
      if (session) {
        const url = await uploadSightingPhoto(prepared.uri, session.user.id);
        useUploadStore.getState().patch({ remoteUrl: url, uploading: false });
      } else {
        useUploadStore.getState().patch({ uploading: false });
      }
    } catch (e) {
      Alert.alert("Could not add photo", e instanceof Error ? e.message : String(e));
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
