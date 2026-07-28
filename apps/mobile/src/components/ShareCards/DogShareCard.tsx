import { forwardRef } from "react";
import { Image } from "expo-image";
import { StyleSheet, Text, View } from "react-native";
import type { ViewProps } from "react-native";

import { StatRadar } from "@/components/StatRadar";
import { paletteForDog, pokedexNumber } from "@/lib/dogTheme";
import type { StatKey } from "@/lib/api";

interface Props extends ViewProps {
  dog: {
    id: string;
    name: string;
    primary_color: string;
    pattern: string;
    stat_bork: number | null;
    stat_zoom: number | null;
    stat_floof: number | null;
    stat_chill: number | null;
    stat_guard: number | null;
    specialty_stat: StatKey | null;
  };
  districtName?: string | null;
  heroPhotoUrl?: string | null;
  photographerHandle?: string | null;
}

const SPECIALTY_TITLE: Record<StatKey, string> = {
  bork:  "MAX BORK",
  zoom:  "PEAK ZOOM",
  floof: "TOTAL FLOOF",
  chill: "PURE CHILL",
  guard: "BEST GUARD",
};

// 1080x1080 share card. Rendered at 360dp on screen; the captureRef call
// uses a 3x pixel ratio to produce a 1080x1080 PNG, the size BRIEF section
// 11.1 specifies for dog stat cards.
export const DogShareCard = forwardRef<View, Props>(function DogShareCard(
  { dog, districtName, heroPhotoUrl, photographerHandle, ...rest },
  ref,
) {
  const pal = paletteForDog(dog.primary_color);
  const stats: Record<StatKey, number | null> = {
    bork:  dog.stat_bork,
    zoom:  dog.stat_zoom,
    floof: dog.stat_floof,
    chill: dog.stat_chill,
    guard: dog.stat_guard,
  };
  const specialty = dog.specialty_stat;
  const specialtyScore = specialty ? stats[specialty] : null;

  return (
    <View ref={ref} {...rest} collapsable={false} style={[styles.card, { backgroundColor: pal.bg }]}>
      {heroPhotoUrl ? (
        <Image source={heroPhotoUrl} style={styles.heroBg} contentFit="cover" />
      ) : null}
      <View style={styles.heroOverlay} />

      <View style={styles.topRow}>
        <View>
          <Text style={[styles.brand, { color: pal.text }]}>หมาซอย</Text>
          <Text style={[styles.subtitle, { color: pal.textDim }]}>N°{pokedexNumber(dog.id)}</Text>
        </View>
        {photographerHandle ? (
          <Text style={[styles.credit, { color: pal.text }]}>📷 @{photographerHandle}</Text>
        ) : null}
      </View>

      <View style={styles.titleBlock}>
        <Text style={[styles.name, { color: pal.text }]} numberOfLines={1}>{dog.name}</Text>
        {districtName ? (
          <Text style={[styles.district, { color: pal.textDim }]}>{districtName}</Text>
        ) : null}
        <View style={styles.typesRow}>
          <View style={[styles.typePill, { backgroundColor: pal.light }]}>
            <Text style={[styles.typeText, { color: pal.text }]}>{dog.primary_color}</Text>
          </View>
          <View style={[styles.typePill, { backgroundColor: pal.light }]}>
            <Text style={[styles.typeText, { color: pal.text }]}>{dog.pattern}</Text>
          </View>
        </View>
      </View>

      <View style={styles.statsArea}>
        <View style={styles.radarSlot}>
          <StatRadar
            values={stats}
            size={170}
            strokeColor={pal.accent}
            fillColor={pal.accent}
          />
        </View>
        <View style={styles.statListSlot}>
          {(Object.keys(stats) as StatKey[]).map((k) => (
            <View key={k} style={styles.statRow}>
              <Text style={[styles.statName, { color: pal.text }]}>{capitalise(k)}</Text>
              <Text style={[styles.statScore, { color: pal.text }]}>{stats[k]?.toFixed(1) ?? "—"}</Text>
            </View>
          ))}
        </View>
      </View>

      {specialty && specialtyScore != null ? (
        <View style={[styles.specialty, { backgroundColor: pal.accent }]}>
          <Text style={styles.specialtyTitle}>{SPECIALTY_TITLE[specialty]}</Text>
          <Text style={styles.specialtyScore}>{specialtyScore.toFixed(1)} / 5</Text>
        </View>
      ) : null}

      <View style={styles.footer}>
        <Text style={[styles.footerText, { color: pal.textDim }]}>soidogs.app</Text>
      </View>
    </View>
  );
});

function capitalise(s: string) { return s[0].toUpperCase() + s.slice(1); }

const SIZE = 360;

const styles = StyleSheet.create({
  card: {
    width: SIZE,
    height: SIZE,
    padding: 18,
    overflow: "hidden",
    position: "relative",
  },
  heroBg: { ...StyleSheet.absoluteFillObject, opacity: 0.32 },
  heroOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.18)",
  },
  topRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  brand: { fontSize: 14, fontWeight: "900", letterSpacing: 0.5 },
  subtitle: { fontSize: 11, fontWeight: "700", letterSpacing: 0.5, marginTop: 2 },
  credit: { fontSize: 11, fontWeight: "700" },
  titleBlock: { marginTop: 12, gap: 4 },
  name: { fontSize: 38, fontWeight: "900", letterSpacing: -0.8 },
  district: { fontSize: 12, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.6 },
  typesRow: { flexDirection: "row", gap: 6, marginTop: 4 },
  typePill: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 999 },
  typeText: { fontSize: 11, fontWeight: "700", textTransform: "capitalize" },

  statsArea: { flexDirection: "row", marginTop: 14, alignItems: "center", gap: 12 },
  radarSlot: { width: 170, height: 170 },
  statListSlot: { flex: 1, gap: 4 },
  statRow: { flexDirection: "row", justifyContent: "space-between" },
  statName: { fontSize: 13, fontWeight: "700" },
  statScore: { fontSize: 13, fontWeight: "900" },

  specialty: {
    position: "absolute",
    bottom: 36,
    right: 18,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 14,
    alignItems: "flex-end",
  },
  specialtyTitle: { color: "#fff", fontSize: 13, fontWeight: "900", letterSpacing: 0.5 },
  specialtyScore: { color: "#fff", fontSize: 12, fontWeight: "700", marginTop: 2, opacity: 0.95 },

  footer: { position: "absolute", bottom: 12, alignSelf: "center", left: 0, right: 0, alignItems: "center" },
  footerText: { fontSize: 11, fontWeight: "700", letterSpacing: 0.5 },
});
