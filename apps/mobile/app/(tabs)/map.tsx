import { useRef, useState } from "react";
import { useRouter } from "expo-router";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import MapView, { Marker } from "react-native-maps";
import Svg, { Path } from "react-native-svg";
import { useQuery } from "@tanstack/react-query";

import { Screen } from "@/components/Screen";
import { DogGlyph } from "@/components/DogGlyph";
import { useLocation } from "@/hooks/useLocation";
import { fetchDogsInRadius } from "@/lib/api";
import { paletteForDog, poseForDog } from "@/lib/dogTheme";
import { colors, radius, shadow } from "@/lib/theme";

const DEFAULT = { latitude: 13.7384, longitude: 100.5697, latitudeDelta: 0.04, longitudeDelta: 0.04 };

// Custom Marker contents — teardrop with a DogGlyph face inside, tinted
// per the dog's type palette. Spec lives in the Soi Sunset README:
//   "Pins are DogGlyph heads inside a teardrop with paletteForDog bg."
function PinTeardrop({ dogId, primaryColor }: { dogId: string; primaryColor: string }) {
  const pal = paletteForDog(primaryColor);
  const w = 44;
  const h = 55;
  return (
    <View style={{ alignItems: "center", justifyContent: "center", width: w, height: h }}>
      <Svg width={w} height={h} viewBox="0 0 40 50" style={{ position: "absolute", top: 0, left: 0 }}>
        <Path
          d="M20 0 C8.95 0 0 8.95 0 20 C0 32 12 40 20 50 C28 40 40 32 40 20 C40 8.95 31.05 0 20 0 Z"
          fill={pal.bg}
          stroke={pal.accent}
          strokeWidth={2.5}
        />
      </Svg>
      <View style={{ position: "absolute", top: 6, alignItems: "center", justifyContent: "center", width: w, height: 32 }}>
        <DogGlyph
          color={pal.accent}
          secondary={pal.bg === pal.accent ? pal.text : pal.bg}
          size={28}
          pose={poseForDog(dogId)}
        />
      </View>
    </View>
  );
}

export default function MapTab() {
  const router = useRouter();
  const { coords } = useLocation();
  const mapRef = useRef<MapView>(null);
  const [search, setSearch] = useState("");

  const origin = coords
    ? { lat: coords.latitude, lng: coords.longitude }
    : { lat: DEFAULT.latitude, lng: DEFAULT.longitude };

  const { data: dogs } = useQuery({
    queryKey: ["map-dogs-radius", origin.lat, origin.lng],
    queryFn: () => fetchDogsInRadius(origin.lat, origin.lng, 20_000_000, 1000),
  });

  const region = coords
    ? { latitude: coords.latitude, longitude: coords.longitude, latitudeDelta: 0.02, longitudeDelta: 0.02 }
    : DEFAULT;

  const filtered = (dogs ?? []).filter((c) =>
    !search.trim() ? true : c.name.toLowerCase().includes(search.trim().toLowerCase()),
  );

  const goToMyLocation = () => {
    if (!coords) return;
    mapRef.current?.animateToRegion(
      { latitude: coords.latitude, longitude: coords.longitude, latitudeDelta: 0.01, longitudeDelta: 0.01 },
      450,
    );
  };

  const fitAllCats = () => {
    if (!filtered || filtered.length === 0) return;
    const points = filtered.map((c) => ({ latitude: c.centroid_lat, longitude: c.centroid_lng }));
    if (coords) points.push({ latitude: coords.latitude, longitude: coords.longitude });
    mapRef.current?.fitToCoordinates(points, {
      edgePadding: { top: 100, left: 40, right: 40, bottom: 80 },
      animated: true,
    });
  };

  return (
    <Screen>
      <MapView ref={mapRef} style={styles.map} initialRegion={region} showsUserLocation showsMyLocationButton={false}>
        {filtered.map((c) => (
          <Marker
            key={c.id}
            coordinate={{ latitude: c.centroid_lat, longitude: c.centroid_lng }}
            title={c.name}
            description={`${c.primary_color} · ${c.pattern}`}
            anchor={{ x: 0.5, y: 1 }}
            onCalloutPress={() => router.push(`/dog/${c.id}`)}
          >
            <PinTeardrop dogId={c.id} primaryColor={c.primary_color} />
          </Marker>
        ))}
      </MapView>

      {/* Floating top — search pill + filter/count chip per the design spec */}
      <View style={styles.topRow}>
        <View style={styles.searchPill}>
          <Text style={styles.searchEmoji}>🔍</Text>
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="District, name…"
            placeholderTextColor={colors.textDim}
            style={styles.searchInput}
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>
        <Pressable
          onPress={fitAllCats}
          style={({ pressed }) => [styles.filterChip, pressed && { opacity: 0.85 }]}
        >
          <Text style={styles.filterChipText}>{filtered.length}</Text>
        </Pressable>
      </View>

      {coords ? (
        <Pressable
          onPress={goToMyLocation}
          style={({ pressed }) => [styles.fab, pressed && styles.fabPressed]}
          accessibilityLabel="Centre map on my location"
        >
          <Text style={styles.fabIcon}>📍</Text>
        </Pressable>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  map: { flex: 1 },

  topRow: {
    position: "absolute",
    top: 16,
    left: 16,
    right: 16,
    flexDirection: "row",
    gap: 10,
  },
  searchPill: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: colors.surface,
    borderRadius: radius.pill,
    ...shadow.card,
  },
  searchEmoji: { fontSize: 14 },
  searchInput: { flex: 1, fontSize: 15, color: colors.text, padding: 0 },
  filterChip: {
    minWidth: 48,
    paddingHorizontal: 14,
    height: 44,
    backgroundColor: colors.accent,
    borderRadius: radius.pill,
    alignItems: "center",
    justifyContent: "center",
    ...shadow.button,
  },
  filterChipText: { color: colors.text, fontWeight: "900", fontSize: 15, fontVariant: ["tabular-nums"] },

  fab: {
    position: "absolute",
    bottom: 24,
    right: 16,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
    ...shadow.card,
  },
  fabPressed: { transform: [{ scale: 0.94 }] },
  fabIcon: { fontSize: 24 },
});
