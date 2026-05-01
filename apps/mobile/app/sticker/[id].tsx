import { ActivityIndicator, Alert, StyleSheet, Text, View } from "react-native";
import { Image } from "expo-image";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import * as MediaLibrary from "expo-media-library";
import * as FileSystem from "expo-file-system";
import * as Sharing from "expo-sharing";

import { Screen } from "@/components/Screen";
import { Button } from "@/components/Button";
import { supabase } from "@/lib/supabase";
import { colors, spacing, typography } from "@/lib/theme";

export default function StickerDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useTranslation();
  const router = useRouter();

  const stickerQ = useQuery({
    queryKey: ["sticker", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("stickers")
        .select("*, sticker_packs(name, artist_name, artist_credit_url)")
        .eq("id", id!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  if (stickerQ.isLoading || !stickerQ.data) {
    return <Screen><ActivityIndicator style={{ flex: 1 }} /></Screen>;
  }
  const s = stickerQ.data;

  const downloadLocal = async (): Promise<string> => {
    const dest = `${FileSystem.cacheDirectory}sticker-${s.id}.png`;
    const { uri } = await FileSystem.downloadAsync(s.image_url, dest);
    return uri;
  };

  const saveToLibrary = async () => {
    const perm = await MediaLibrary.requestPermissionsAsync();
    if (!perm.granted) {
      Alert.alert(t("common.error"), "Photos permission denied");
      return;
    }
    const local = await downloadLocal();
    await MediaLibrary.saveToLibraryAsync(local);
    Alert.alert(t("stickers.savedToLibrary"));
  };

  const share = async () => {
    const local = await downloadLocal();
    if (!(await Sharing.isAvailableAsync())) return;
    await Sharing.shareAsync(local, { dialogTitle: s.name });
  };

  return (
    <Screen>
      <View style={styles.body}>
        <Image source={s.image_url} style={styles.image} contentFit="contain" />
        <Text style={styles.name}>{s.name}</Text>
        <Text style={styles.meta}>{t("stickers.by", { artist: s.sticker_packs?.artist_name })}</Text>
        <View style={styles.buttons}>
          <Button label={t("stickers.saveToLibrary")} onPress={saveToLibrary} />
          <Button label={t("stickers.share")} variant="secondary" onPress={share} />
          <Button label={t("common.cancel")} variant="ghost" onPress={() => router.back()} />
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: { flex: 1, padding: spacing(5), gap: spacing(3) },
  image: { width: "100%", aspectRatio: 1, backgroundColor: colors.surface, borderRadius: 16 },
  name: { ...typography.h2, textAlign: "center" },
  meta: { ...typography.small, color: colors.textDim, textAlign: "center" },
  buttons: { gap: spacing(2), marginTop: spacing(2) },
});
