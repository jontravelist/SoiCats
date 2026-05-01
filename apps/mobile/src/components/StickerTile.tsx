import { Image } from "expo-image";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { colors, radius, typography } from "@/lib/theme";

interface Props {
  imageUrl: string;
  name: string;
  locked?: boolean;
  onPress?: () => void;
}

export function StickerTile({ imageUrl, name, locked, onPress }: Props) {
  return (
    <Pressable onPress={onPress} style={styles.tile}>
      <View style={[styles.imageWrap, locked && styles.locked]}>
        <Image
          source={imageUrl}
          style={[styles.image, locked && styles.lockedImage]}
          contentFit="contain"
        />
      </View>
      <Text numberOfLines={1} style={[styles.name, locked && styles.lockedName]}>
        {name}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  tile: { width: "33.33%", padding: 6, alignItems: "center" },
  imageWrap: {
    width: "100%",
    aspectRatio: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
    padding: 8,
  },
  image: { width: "100%", height: "100%" },
  locked: { backgroundColor: colors.border },
  lockedImage: { opacity: 0.15 },
  name: { ...typography.small, marginTop: 4, color: colors.text },
  lockedName: { color: colors.textDim },
});
