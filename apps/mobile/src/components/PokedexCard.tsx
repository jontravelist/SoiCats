import { Image } from "expo-image";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { paletteForCat, pokedexNumber, poseForCat } from "@/lib/catTheme";
import { CatGlyph } from "@/components/CatGlyph";
import { colors, radius, shadow, typography } from "@/lib/theme";

interface Props {
  catId: string;
  name: string;
  primaryColor: string;
  pattern: string;
  thumbnailUrl: string | null;
  onPress?: () => void;
}

// Pokedex-style grid card. Solid coloured background per the cat's primary
// colour, big white name, two type-style chips, thumbnail in the
// bottom-right and a small N°XXX overlay top-right.
export function PokedexCard({ catId, name, primaryColor, pattern, thumbnailUrl, onPress }: Props) {
  const p = paletteForCat(primaryColor);
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.card, { backgroundColor: p.bg }, pressed && { opacity: 0.92 }]}>
      <Text style={[styles.number, { color: p.textDim }]}>N°{pokedexNumber(catId)}</Text>

      <Text numberOfLines={1} style={[styles.name, { color: p.text }]}>{name}</Text>

      <View style={styles.chips}>
        <View style={[styles.chip, { backgroundColor: p.light }]}>
          <Text style={[styles.chipText, { color: p.text }]}>{primaryColor}</Text>
        </View>
        <View style={[styles.chip, { backgroundColor: p.light }]}>
          <Text style={[styles.chipText, { color: p.text }]}>{pattern}</Text>
        </View>
      </View>

      <View style={[styles.thumbWrap, { backgroundColor: p.light }]}>
        {thumbnailUrl ? (
          <Image source={thumbnailUrl} style={styles.thumb} contentFit="cover" />
        ) : (
          <CatGlyph color={p.accent} secondary={p.text} size={72} pose={poseForCat(catId)} />
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    minHeight: 168,
    margin: 6,
    padding: 14,
    borderRadius: radius.xl,
    overflow: "hidden",
    ...shadow.card,
  },
  number: {
    position: "absolute",
    top: 12,
    right: 16,
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  name: {
    fontSize: 22,
    fontWeight: "900",
    letterSpacing: -0.5,
  },
  chips: { flexDirection: "row", gap: 6, marginTop: 8, flexWrap: "wrap" },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.pill,
  },
  chipText: { ...typography.small, fontWeight: "700", textTransform: "capitalize" },
  thumbWrap: {
    position: "absolute",
    bottom: -10,
    right: -10,
    width: 96,
    height: 96,
    borderRadius: 48,
    overflow: "hidden",
    backgroundColor: colors.surface,
    borderWidth: 3,
    borderColor: "rgba(255,255,255,0.4)",
    alignItems: "center",
    justifyContent: "center",
  },
  thumb: { width: "100%", height: "100%" },
  thumbEmoji: { fontSize: 44 },
});
