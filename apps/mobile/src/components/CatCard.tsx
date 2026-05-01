import { Image } from "expo-image";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { colors, radius, typography } from "@/lib/theme";

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
  card: { width: 110, marginRight: 10 },
  selected: { transform: [{ scale: 1.02 }] },
  thumbWrap: { width: 110, height: 110, borderRadius: radius.lg, overflow: "hidden", backgroundColor: colors.border },
  thumb: { width: "100%", height: "100%" },
  placeholder: { alignItems: "center", justifyContent: "center" },
  placeholderText: { fontSize: 36 },
  name: { ...typography.body, fontWeight: "600", marginTop: 6 },
  subtitle: { ...typography.small, color: colors.textDim },
});
