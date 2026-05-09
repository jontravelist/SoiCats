import { Image } from "expo-image";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { paletteForCat, pokedexNumber, poseForCat } from "@/lib/catTheme";
import { CatGlyph } from "@/components/CatGlyph";
import { STAT_META } from "@/lib/stats";
import { colors, radius, shadow, typography } from "@/lib/theme";
import type { StatKey } from "@/lib/api";

interface Props {
  catId: string;
  name: string;
  primaryColor: string;
  pattern: string;
  thumbnailUrl: string | null;
  specialty?: StatKey | null;
  specialtyScore?: number | null;
  onPress?: () => void;
}

// Pokedex-style grid card. Solid coloured background per the cat's primary
// colour, big white name, two type-style chips, thumbnail in the
// bottom-right and a small N°XXX overlay top-right.
export function PokedexCard({ catId, name, primaryColor, pattern, thumbnailUrl, specialty, specialtyScore, onPress }: Props) {
  const p = paletteForCat(primaryColor);
  const specialtyMeta = specialty ? STAT_META[specialty] : null;
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.card, { backgroundColor: p.bg }, pressed && { opacity: 0.92 }]}>
      <Text style={[styles.number, { color: p.textDim }]}>N°{pokedexNumber(catId)}</Text>

      <View style={[styles.typePill, { backgroundColor: p.accent, borderColor: p.bg }]}>
        <Text style={[styles.typePillText, { color: p.bg === p.accent ? p.text : p.light }]}>{pattern}</Text>
      </View>

      <View style={[styles.thumbWrap, { backgroundColor: p.light }]}>
        {thumbnailUrl ? (
          <Image source={thumbnailUrl} style={styles.thumb} contentFit="cover" />
        ) : (
          <CatGlyph color={p.accent} secondary={p.text} size={84} pose={poseForCat(catId)} />
        )}
      </View>

      <View style={[styles.bottomStrip, { backgroundColor: p.accent }]}>
        <Text numberOfLines={1} style={[styles.name, { color: p.bg === p.accent ? p.text : p.light }]}>{name}</Text>
        {specialtyMeta ? (
          <View style={styles.specialtyRow}>
            <Text style={[styles.specialtyEmoji]}>{specialtyMeta.icon}</Text>
            <Text style={[styles.specialtyValue, { color: p.bg === p.accent ? p.text : p.light }]}>
              {specialtyScore != null ? specialtyScore.toFixed(1) : "—"}
            </Text>
          </View>
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    minHeight: 200,
    margin: 6,
    paddingTop: 12,
    borderRadius: radius.xl,
    overflow: "hidden",
    ...shadow.card,
  },
  number: {
    position: "absolute",
    top: 10,
    right: 14,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1,
    fontVariant: ["tabular-nums"],
  },
  typePill: {
    alignSelf: "flex-start",
    marginLeft: 12,
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1.5,
  },
  typePillText: { fontSize: 10, fontWeight: "800", letterSpacing: 1.4, textTransform: "uppercase" },

  thumbWrap: {
    alignSelf: "center",
    marginTop: 10,
    width: 120,
    height: 120,
    borderRadius: radius.lg,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  thumb: { width: "100%", height: "100%" },

  bottomStrip: {
    marginTop: "auto",
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  name: {
    flex: 1,
    fontSize: 18,
    fontWeight: "900",
    letterSpacing: -0.4,
  },
  specialtyRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  specialtyEmoji: { fontSize: 14 },
  specialtyValue: { fontSize: 14, fontWeight: "900", letterSpacing: -0.3 },
});
