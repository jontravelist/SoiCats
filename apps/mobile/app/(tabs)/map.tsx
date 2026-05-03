import { useRef } from "react";
import { useRouter } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import MapView, { Marker } from "react-native-maps";
import { useQuery } from "@tanstack/react-query";

import { Screen } from "@/components/Screen";
import { useLocation } from "@/hooks/useLocation";
import { fetchNearbyCats } from "@/lib/api";
import { colors, radius, shadow, typography } from "@/lib/theme";

// Bangkok default centre (Asok / Sukhumvit) when no GPS yet.
const DEFAULT = { latitude: 13.7384, longitude: 100.5697, latitudeDelta: 0.02, longitudeDelta: 0.02 };

export default function MapTab() {
  const router = useRouter();
  const { coords } = useLocation();
  const mapRef = useRef<MapView>(null);

  const { data: cats } = useQuery({
    queryKey: ["map-cats", coords?.latitude, coords?.longitude],
    queryFn: () => fetchNearbyCats(coords!.latitude, coords!.longitude, 1500),
    enabled: !!coords,
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
        {(cats ?? []).map((c) => {
          // TODO: nearby_cats RPC needs to return centroid lng/lat. For now we
          // pin them at the user's location which is wrong but keeps the marker
          // count visible. Will be fixed when the RPC is extended.
          if (!coords) return null;
          return (
            <Marker
              key={c.id}
              coordinate={{ latitude: coords.latitude, longitude: coords.longitude }}
              title={c.name}
              description={c.pattern}
              onCalloutPress={() => router.push(`/cat/${c.id}`)}
            />
          );
        })}
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
