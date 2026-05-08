import { captureRef } from "react-native-view-shot";
import * as Sharing from "expo-sharing";
import * as MediaLibrary from "expo-media-library";
import { Alert, Linking } from "react-native";
import type { RefObject } from "react";
import type { View } from "react-native";

// Capture a View at 3x its on-screen size to land on the BRIEF-spec
// 1080x1080 PNG, then hand to native share sheet. Used by the cat share
// card screen.
export async function captureAndShareCard(ref: RefObject<View>, filenameHint = "soicats-card") {
  if (!ref.current) throw new Error("Card not mounted");
  const uri = await captureRef(ref.current, {
    format: "png",
    quality: 1,
    result: "tmpfile",
    width: 1080,
    height: 1080,
  });
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri, { dialogTitle: filenameHint, mimeType: "image/png" });
    return;
  }
  Alert.alert("Sharing isn't available on this device.");
}

export async function captureAndSaveCard(ref: RefObject<View>) {
  if (!ref.current) throw new Error("Card not mounted");
  const perm = await MediaLibrary.requestPermissionsAsync();
  if (!perm.granted) {
    Alert.alert(
      "Photos permission needed",
      "Open Settings → Expo Go → Photos to save share cards.",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Open Settings", onPress: () => Linking.openSettings() },
      ],
    );
    return;
  }
  const uri = await captureRef(ref.current, {
    format: "png",
    quality: 1,
    result: "tmpfile",
    width: 1080,
    height: 1080,
  });
  await MediaLibrary.saveToLibraryAsync(uri);
  Alert.alert("Saved to camera roll");
}
