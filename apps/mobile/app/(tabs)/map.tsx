import { useRouter } from "expo-router";
import { StyleSheet, Text, View } from "react-native";
import MapView, { Marker, PROVIDER_GOOGLE } from "react-native-maps";
import { useQuery } from "@tanstack/react-query";

import { Screen } from "@/components/Screen";
import { useLocation } from "@/hooks/useLocation";
import { fetchNearbyCats } from "@/lib/api";
import { colors, typography } from "@/lib/theme";

// Bangkok default centre (Asok / Sukhumvit) when no GPS yet.
const DEFAULT = { latitude: 13.7384, longitude: 100.5697, latitudeDelta: 0.02, longitudeDelta: 0.02 };

export default function MapTab() {
  const router = useRouter();
  const { coords } = useLocation();

  const { data: cats } = useQuery({
    queryKey: ["map-cats", coords?.latitude, coords?.longitude],
    queryFn: () => fetchNearbyCats(coords!.latitude, coords!.longitude, 1500),
    enabled: !!coords,
  });

  const region = coords
    ? { latitude: coords.latitude, longitude: coords.longitude, latitudeDelta: 0.02, longitudeDelta: 0.02 }
    : DEFAULT;

  return (
    <Screen>
      <MapView
        provider={PROVIDER_GOOGLE}
        style={styles.map}
        initialRegion={region}
        showsUserLocation
      >
        {(cats ?? []).map((c) => {
          // The RPC currently returns distance + name but not coords. For the marker,
          // we offset slightly from the user; for the real map a follow-up RPC should
          // return territory_centroid as lng/lat. Marked as TODO so it's not silently wrong.
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
        <Text style={typography.small}>{(cats ?? []).length} cats nearby</Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  map: { flex: 1 },
  attribution: { position: "absolute", bottom: 16, left: 16, padding: 8, backgroundColor: colors.surface, borderRadius: 8 },
});
