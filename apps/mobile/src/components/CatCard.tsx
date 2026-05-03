import { Image } from "expo-image";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { colors, radius, shadow, typography } from "@/lib/theme";

interface Props {
  name: string;
  thumbnailUrl: string | null;
  subtitle?: string;
  onPress?: () => void;
  selected?: boolean;
}

export function CatCard({ name, thumbnailUrl, subtitle, onPress, selected }: Props) {
  return (
    <Pressable onPress={onPress} style={[styles.card, selected && styles.selected]}>
      <View style={styles.thumbWrap}>
        {thumbnailUrl ? (
          <Image source={thumbnailUrl} style={styles.thumb} contentFit="cover" />
        ) : (
          <View style={[styles.thumb, styles.placeholder]}>
            <Text style={styles.placeholderText}>🐈</Text>
          </View>
        )}
      </View>
      <Text numberOfLines={1} style={styles.name}>{name}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { width: 116, marginRight: 12 },
  selected: { transform: [{ scale: 1.04 }] },
  thumbWrap: {
    width: 116,
    height: 116,
    borderRadius: radius.lg,
    overflow: "hidden",
    backgroundColor: colors.surface,
    ...shadow.card,
  },
  thumb: { width: "100%", height: "100%" },
  placeholder: { alignItems: "center", justifyContent: "center", backgroundColor: colors.accentSoft },
  placeholderText: { fontSize: 44 },
  name: { ...typography.body, fontWeight: "700", color: colors.text, marginTop: 8 },
  subtitle: { ...typography.small, color: colors.textDim },
});
