import { Image } from "expo-image";
import { StyleSheet, Text, View } from "react-native";
import { DogGlyph } from "@/components/DogGlyph";
import { StatBars } from "@/components/StatBars";
import { SpecialtyBadge } from "@/components/SpecialtyBadge";
import { paletteForDog, poseForDog, pokedexNumber } from "@/lib/dogTheme";
import { STAT_COLORS, STAT_META } from "@/lib/stats";
import { radius, typography } from "@/lib/theme";
import type { StatKey } from "@/lib/api";

interface DogLike {
  id: string;
  name: string;
  name_th?: string | null;
  primary_color: string;
  pattern: string;
  sex?: string | null;
  age_guess?: string | null;
  distinguishing_features?: string | null;
  stat_bork: number | null;
  stat_zoom: number | null;
  stat_floof: number | null;
  stat_chill: number | null;
  stat_guard: number | null;
  specialty_stat: StatKey | null;
}

interface Props {
  dog: DogLike;
  heroPhotoUrl?: string | null;
  photographerHandle?: string | null;
  lastSeen?: string;
  photoCount?: number;
}

// Pokémon trading-card dog profile hero. Spec lives in
// soi-dogs/project/design_handoff_soi_sunset/screens-dog.jsx → DogProfileScreen.
//
// Composition (top to bottom):
//   1. Outer thick coloured frame (4px solid pal.accent)
//   2. Inner card with hairline border + four gold corner notches
//   3. Name banner (display name + name_th + sex/age) with HP on right
//   4. N°XXX side badge in mono
//   5. Photo well — type-tinted, type pills overlaid top-left,
//      photo credit + last-seen on bottom gradient
//   6. Trait line (italic, distinguishing_features)
//   7. Attack moves (2 derived from top-2 stats)
//   8. Field stats — five horizontal bars, each in stat colour
//   9. Specialty banner centred
//   10. Footer: illus./set code/photos rated (mono)
//
// Holographic foil + tilt animation are documented in the prototype but
// deferred — they need react-native-reanimated + sensor-driven rotation
// and are a follow-up.

const MOVE_LIB: Record<StatKey, [{ name: string; flavor: string }, { name: string; flavor: string }]> = {
  bork: [
    { name: "Alley Alarm",    flavor: "Warns the whole soi. Deafening." },
    { name: "Backup Chorus",  flavor: "The rest of the pack joins in." },
  ],
  zoom: [
    { name: "Scooter Chase",  flavor: "Full-tilt sprint after wheels." },
    { name: "Zoomies",        flavor: "Uncontainable 3am energy." },
  ],
  floof: [
    { name: "Fluff Cloud",    flavor: "Doubles in volume when wet." },
    { name: "Coat of Static", flavor: "Absorbs pats. Rebroadcasts joy." },
  ],
  chill: [
    { name: "Nap on 7-11",    flavor: "Immovable until closing time." },
    { name: "Zen Slump",      flavor: "Ignores fireworks. And you." },
  ],
  guard: [
    { name: "Territory Bark", flavor: "Guards the shopfront to the death." },
    { name: "Escort Trot",    flavor: "Walks you home. Then walks you back." },
  ],
};

function deriveMoves(stats: Record<StatKey, number | null>) {
  const ranked = (Object.entries(stats) as [StatKey, number | null][])
    .filter(([, v]) => v != null)
    .sort((a, b) => (b[1] || 0) - (a[1] || 0));
  if (ranked.length === 0) return [];
  const [sigKey, sigVal] = ranked[0];
  const [supKey, supVal] = ranked[1] ?? ranked[0];
  return [
    { stat: sigKey, name: MOVE_LIB[sigKey][0].name, flavor: MOVE_LIB[sigKey][0].flavor, dmg: Math.round((sigVal ?? 0) * 22 / 10) * 10, cost: [sigKey, sigKey] as StatKey[] },
    { stat: supKey, name: MOVE_LIB[supKey][1].name, flavor: MOVE_LIB[supKey][1].flavor, dmg: Math.round((supVal ?? 0) * 14 / 10) * 10, cost: [supKey, "guard"] as StatKey[] },
  ];
}

function deriveHP(stats: Record<StatKey, number | null>): number {
  const total = Object.values(stats).reduce<number>((s, v) => s + (v ?? 0), 0);
  return Math.min(290, 40 + Math.round(total) * 8);
}

export function TradingCard({ dog, heroPhotoUrl, photographerHandle, lastSeen, photoCount }: Props) {
  const pal = paletteForDog(dog.primary_color);
  const stats: Record<StatKey, number | null> = {
    bork:  dog.stat_bork,
    zoom:  dog.stat_zoom,
    floof: dog.stat_floof,
    chill: dog.stat_chill,
    guard: dog.stat_guard,
  };
  const hp = deriveHP(stats);
  const moves = deriveMoves(stats);
  const onFrame = pal.bg === pal.text ? pal.light : pal.text;

  return (
    <View style={[styles.outer, { backgroundColor: pal.bg, borderColor: pal.accent }]}>
      {/* Gold corner notches */}
      <View style={[styles.notch, styles.notchTL, { borderColor: onFrame }]} />
      <View style={[styles.notch, styles.notchTR, { borderColor: onFrame }]} />
      <View style={[styles.notch, styles.notchBL, { borderColor: onFrame }]} />
      <View style={[styles.notch, styles.notchBR, { borderColor: onFrame }]} />

      <View style={[styles.inner, { borderColor: onFrame }]}>
        {/* Top strip: name banner + HP, plus N°XXX side badge */}
        <View style={styles.topRow}>
          <View style={[styles.nameBanner, { backgroundColor: pal.accent, borderColor: pal.bg }]}>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text numberOfLines={1} style={[styles.name, { color: pal.bg === pal.accent ? pal.text : pal.light }]}>
                {dog.name}
              </Text>
              <Text style={[styles.nameMeta, { color: pal.bg === pal.accent ? pal.text : pal.light }]}>
                {[dog.name_th, dog.sex && dog.sex !== "unknown" ? dog.sex : null, dog.age_guess].filter(Boolean).join(" · ")}
              </Text>
            </View>
            <View style={styles.hpBlock}>
              <Text style={[styles.hpLabel, { color: pal.bg === pal.accent ? pal.text : pal.light }]}>HP</Text>
              <Text style={[styles.hpValue, { color: pal.bg === pal.accent ? pal.text : pal.light }]}>{hp}</Text>
            </View>
          </View>
          <View style={[styles.dexBadge, { backgroundColor: onFrame, borderColor: pal.accent }]}>
            <Text style={[styles.dexLabel, { color: pal.bg }]}>N°</Text>
            <Text style={[styles.dexValue, { color: pal.bg }]}>{pokedexNumber(dog.id)}</Text>
          </View>
        </View>

        {/* Photo well */}
        <View style={[styles.photoWell, { borderColor: onFrame, backgroundColor: pal.light }]}>
          {heroPhotoUrl ? (
            <Image source={heroPhotoUrl} style={styles.photo} contentFit="cover" />
          ) : (
            <View style={styles.photoPlaceholder}>
              <DogGlyph color={pal.accent} secondary={pal.text} size={170} pose={poseForDog(dog.id)} />
            </View>
          )}

          <View style={styles.typeRow}>
            <View style={[styles.typePill, { backgroundColor: pal.accent, borderColor: pal.bg }]}>
              <Text style={[styles.typePillText, { color: pal.bg === pal.accent ? pal.text : pal.light }]}>{dog.pattern}</Text>
            </View>
            <View style={[styles.typePill, { backgroundColor: pal.accent, borderColor: pal.bg }]}>
              <Text style={[styles.typePillText, { color: pal.bg === pal.accent ? pal.text : pal.light }]}>{dog.primary_color}</Text>
            </View>
          </View>

          <View style={styles.photoFooter}>
            <Text style={styles.photoFooterText}>
              {photographerHandle ? `📷 @${photographerHandle}` : "📷 community"}
            </Text>
            <Text style={styles.photoFooterText}>
              {lastSeen ? `last seen ${lastSeen}` : ""}
            </Text>
          </View>
        </View>

        {/* Trait line */}
        {dog.distinguishing_features ? (
          <View style={[styles.trait, { borderColor: pal.accent + "88" }]}>
            <Text style={[styles.traitLabel, { color: pal.text }]}>TRAIT</Text>
            <Text style={[styles.traitText, { color: pal.text }]}>{dog.distinguishing_features}</Text>
          </View>
        ) : null}

        {/* Attack moves */}
        {moves.length > 0 ? (
          <View style={styles.moves}>
            {moves.map((m, i) => (
              <View key={`${m.stat}-${i}`} style={[styles.moveRow, i === 0 ? { borderTopColor: pal.accent + "55", borderTopWidth: 1.5 } : { borderTopColor: pal.accent + "55", borderTopWidth: 1, borderStyle: "dashed" }]}>
                <View style={styles.moveCost}>
                  {m.cost.map((c, j) => (
                    <View key={j} style={[styles.energyOrb, { backgroundColor: STAT_COLORS[c] }]}>
                      <Text style={styles.energyEmoji}>{STAT_META[c].icon}</Text>
                    </View>
                  ))}
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={[styles.moveName, { color: pal.text }]}>{m.name}</Text>
                  <Text style={[styles.moveFlavor, { color: pal.text }]} numberOfLines={1}>{m.flavor}</Text>
                </View>
                <Text style={[styles.moveDmg, { color: pal.text }]}>{m.dmg}</Text>
              </View>
            ))}
          </View>
        ) : null}

        {/* Field stats */}
        <View style={[styles.statsBlock, { borderColor: pal.accent + "88" }]}>
          <View style={styles.statsHeader}>
            <Text style={[styles.statsLabel, { color: pal.text }]}>FIELD STATS</Text>
            <Text style={[styles.statsCount, { color: pal.text }]}>{photoCount != null ? `${photoCount} photos` : ""}</Text>
          </View>
          <StatBars values={stats} trackColor={pal.text + "22"} textColor={pal.text} />
        </View>

        {/* Specialty banner */}
        {dog.specialty_stat ? (
          <View style={styles.specialtyWrap}>
            <SpecialtyBadge stat={dog.specialty_stat} score={stats[dog.specialty_stat] ?? undefined} />
          </View>
        ) : null}

        {/* Footer */}
        <View style={[styles.footer, { borderTopColor: pal.accent + "55" }]}>
          <Text style={[styles.footerText, { color: pal.text }]}>illus. {photographerHandle ?? "—"}</Text>
          <Text style={[styles.footerText, { color: pal.text }]}>SOI · {pokedexNumber(dog.id)}</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  outer: {
    margin: 16,
    borderRadius: radius.xl,
    borderWidth: 4,
    padding: 4,
    position: "relative",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.18,
    shadowRadius: 18,
    elevation: 8,
  },
  inner: {
    borderRadius: radius.xl - 4,
    borderWidth: 1.5,
    padding: 10,
    gap: 8,
  },
  notch: {
    position: "absolute",
    width: 14,
    height: 14,
    borderWidth: 2,
    opacity: 0.65,
    zIndex: 3,
  },
  notchTL: { top: -2, left: -2, borderRightWidth: 0, borderBottomWidth: 0 },
  notchTR: { top: -2, right: -2, borderLeftWidth: 0, borderBottomWidth: 0 },
  notchBL: { bottom: -2, left: -2, borderRightWidth: 0, borderTopWidth: 0 },
  notchBR: { bottom: -2, right: -2, borderLeftWidth: 0, borderTopWidth: 0 },

  topRow: { flexDirection: "row", alignItems: "stretch", gap: 8 },
  nameBanner: {
    flex: 1,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1.5,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  name: { fontSize: 24, fontWeight: "900", letterSpacing: -0.4 },
  nameMeta: { ...typography.small, fontWeight: "700", opacity: 0.85, marginTop: 2, textTransform: "capitalize" },
  hpBlock: { alignItems: "flex-end" },
  hpLabel: { fontSize: 9.5, fontWeight: "800", letterSpacing: 1, opacity: 0.85 },
  hpValue: { fontSize: 26, fontWeight: "900", lineHeight: 26, letterSpacing: -1 },

  dexBadge: {
    paddingHorizontal: 8,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
    minWidth: 50,
  },
  dexLabel: { fontSize: 8, fontWeight: "800", opacity: 0.85, letterSpacing: 1 },
  dexValue: { fontSize: 16, fontWeight: "900", lineHeight: 16 },

  photoWell: {
    height: 240,
    borderRadius: 14,
    borderWidth: 2,
    overflow: "hidden",
    position: "relative",
  },
  photo: { width: "100%", height: "100%" },
  photoPlaceholder: { width: "100%", height: "100%", alignItems: "center", justifyContent: "center" },
  typeRow: { position: "absolute", top: 10, left: 10, flexDirection: "row", gap: 6 },
  typePill: {
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1.5,
  },
  typePillText: { fontSize: 10.5, fontWeight: "800", letterSpacing: 1.5, textTransform: "uppercase" },
  photoFooter: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: "rgba(0,0,0,0.55)",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  photoFooterText: { color: "#fff", fontSize: 10, letterSpacing: 0.4, fontWeight: "700" },

  trait: {
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 6,
    borderWidth: 1,
    borderStyle: "dashed",
  },
  traitLabel: { ...typography.label, fontSize: 9, opacity: 0.7, marginBottom: 2 },
  traitText: { ...typography.small, fontStyle: "italic", lineHeight: 17 },

  moves: { paddingHorizontal: 4 },
  moveRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 8,
  },
  moveCost: { flexDirection: "row", gap: 3 },
  energyOrb: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.18)",
  },
  energyEmoji: { fontSize: 12, color: "#fff" },
  moveName: { fontSize: 15, fontWeight: "800", letterSpacing: -0.2 },
  moveFlavor: { fontSize: 10.5, opacity: 0.75, marginTop: 1 },
  moveDmg: { fontSize: 24, fontWeight: "900", letterSpacing: -1 },

  statsBlock: {
    padding: 10,
    borderRadius: 10,
    borderWidth: 1.5,
  },
  statsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  statsLabel: { ...typography.label, fontSize: 9.5, opacity: 0.75 },
  statsCount: { fontSize: 9, opacity: 0.65, fontWeight: "700", letterSpacing: 0.5 },

  specialtyWrap: { alignItems: "center", marginTop: 4 },

  footer: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingTop: 6,
    borderTopWidth: 1,
  },
  footerText: { fontSize: 9, fontWeight: "700", letterSpacing: 0.5, opacity: 0.7 },
});
