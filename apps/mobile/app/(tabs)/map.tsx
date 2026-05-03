import { useRef } from "react";
import { useRouter } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import MapView, { Marker } from "react-native-maps";
import { useQuery } from "@tanstack/react-query";

import { Screen } from "@/components/Screen";
import { useLocation } from "@/hooks/useLocation";
import { fetchCatsInRadius } from "@/lib/api";
import { colors, radius, shadow, typography } from "@/lib/theme";

// Bangkok default centre (Asok / Sukhumvit) when no GPS yet.
const DEFAULT = { latitude: 13.7384, longitude: 100.5697, latitudeDelta: 0.04, longitudeDelta: 0.04 };

export default function MapTab() {
  const router = useRouter();
  const { coords } = useLocation();
  const mapRef = useRef<MapView>(null);

  // Pull cats with real centroid lng/lat across a wide radius. Falls back to
  // the Bangkok default when GPS isn't available.
  const origin = coords
    ? { lat: coords.latitude, lng: coords.longitude }
    : { lat: DEFAULT.latitude, lng: DEFAULT.longitude };

  // Earth circumference is ~40,000 km, so this radius effectively means
  // 'all cats anywhere'. At MVP scale we have hundreds, not millions, so
  // pulling them all is fine — and it means seeded Bangkok cats show on
  // the map even when you're testing from Europe.
  const { data: cats } = useQuery({
    queryKey: ["map-cats-radius", origin.lat, origin.lng],
    queryFn: () => fetchCatsInRadius(origin.lat, origin.lng, 20_000_000, 1000),
  });

  const region = coords
    ? { latitude: coords.latitude, longitude: coords.longitude, latitudeDelta: 0.02, longitudeDelta: 0.02 }
    : DEFAULT;

  const goToMyLocation = () => {
    if (!coords) return;
    mapRef.current?.animateToRegion(
      { latitude: coords.latitude, longitude: coords.longitude, latitudeDelta: 0.01, longitudeDelta: 0.01 },
      450,
    );
  };

  return (
    <Screen>
      <MapView
        ref={mapRef}
        style={styles.map}
        initialRegion={region}
        showsUserLocation
        showsMyLocationButton={false}
      >
        {(cats ?? []).map((c) => (
          <Marker
            key={c.id}
            coordinate={{ latitude: c.centroid_lat, longitude: c.centroid_lng }}
            title={c.name}
            description={`${c.primary_color} · ${c.pattern}`}
            pinColor={c.status === "injured" || c.status === "missing" ? colors.danger : colors.primary}
            onCalloutPress={() => router.push(`/cat/${c.id}`)}
          />
        ))}
      </MapView>

      <View style={styles.attribution}>
        <Text style={styles.attrText}>{(cats ?? []).length} cats nearby</Text>
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
  attribution: {
    position: "absolute",
    top: 16,
    left: 16,
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: colors.surface,
    borderRadius: radius.pill,
    ...shadow.card,
  },
  attrText: { ...typography.small, color: colors.text, fontWeight: "600" },
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
