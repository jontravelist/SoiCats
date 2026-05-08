import { forwardRef } from "react";
import { Image } from "expo-image";
import { StyleSheet, Text, View } from "react-native";
import type { ViewProps } from "react-native";

import { StatRadar } from "@/components/StatRadar";
import { paletteForCat, pokedexNumber } from "@/lib/catTheme";
import type { StatKey } from "@/lib/api";

interface Props extends ViewProps {
  cat: {
    id: string;
    name: string;
    primary_color: string;
    pattern: string;
    stat_chonk: number | null;
    stat_spice: number | null;
    stat_floof: number | null;
    stat_slink: number | null;
    stat_vibes: number | null;
    specialty_stat: StatKey | null;
  };
  districtName?: string | null;
  heroPhotoUrl?: string | null;
  photographerHandle?: string | null;
}

const SPECIALTY_TITLE: Record<StatKey, string> = {
  chonk: "PEAK CHONK",
  spice: "MAXIMUM SPICE",
  floof: "TOTAL FLOOF",
  slink: "PURE SLINK",
  vibes: "BEST VIBES",
};

// 1080x1080 share card. Rendered at 360dp on screen; the captureRef call
// uses a 3x pixel ratio to produce a 1080x1080 PNG, the size BRIEF section
// 11.1 specifies for cat stat cards.
export const CatShareCard = forwardRef<View, Props>(function CatShareCard(
  { cat, districtName, heroPhotoUrl, photographerHandle, ...rest },
  ref,
) {
  const pal = paletteForCat(cat.primary_color);
  const stats: Record<StatKey, number | null> = {
    chonk: cat.stat_chonk,
    spice: cat.stat_spice,
    floof: cat.stat_floof,
    slink: cat.stat_slink,
    vibes: cat.stat_vibes,
  };
  const specialty = cat.specialty_stat;
  const specialtyScore = specialty ? stats[specialty] : null;

  return (
    <View ref={ref} {...rest} collapsable={false} style={[styles.card, { backgroundColor: pal.bg }]}>
      {/* Hero photo as desaturated background */}
      {heroPhotoUrl ? (
        <Image source={heroPhotoUrl} style={styles.heroBg} contentFit="cover" />
      ) : null}
      <View style={styles.heroOverlay} />

      {/* Top row */}
      <View style={styles.topRow}>
        <View>
          <Text style={[styles.brand, { color: pal.text }]}>เติมแมว</Text>
          <Text style={[styles.subtitle, { color: pal.textDim }]}>N°{pokedexNumber(cat.id)}</Text>
        </View>
        {photographerHandle ? (
          <Text style={[styles.credit, { color: pal.text }]}>📷 @{photographerHandle}</Text>
        ) : null}
      </View>

      {/* Title block */}
      <View style={styles.titleBlock}>
        <Text style={[styles.name, { color: pal.text }]} numberOfLines={1}>{cat.name}</Text>
        {districtName ? (
          <Text style={[styles.district, { color: pal.textDim }]}>{districtName}</Text>
        ) : null}
        <View style={styles.typesRow}>
          <View style={[styles.typePill, { backgroundColor: pal.light }]}>
            <Text style={[styles.typeText, { color: pal.text }]}>{cat.primary_color}</Text>
          </View>
          <View style={[styles.typePill, { backgroundColor: pal.light }]}>
            <Text style={[styles.typeText, { color: pal.text }]}>{cat.pattern}</Text>
          </View>
        </View>
      </View>

      {/* Stats area: radar left, list right */}
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

      {/* Specialty badge */}
      {specialty && specialtyScore != null ? (
        <View style={[styles.specialty, { backgroundColor: pal.accent }]}>
          <Text style={styles.specialtyTitle}>{SPECIALTY_TITLE[specialty]}</Text>
          <Text style={styles.specialtyScore}>{specialtyScore.toFixed(1)} / 5</Text>
        </View>
      ) : null}

      {/* Footer */}
      <View style={styles.footer}>
        <Text style={[styles.footerText, { color: pal.textDim }]}>soicats.app</Text>
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
