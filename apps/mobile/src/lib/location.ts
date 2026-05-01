import * as Location from "expo-location";

const MIN_ACCURACY_M = 50;

export type Coords = { latitude: number; longitude: number; accuracy: number | null };

export async function requestLocationPermission(): Promise<boolean> {
  const res = await Location.requestForegroundPermissionsAsync();
  return res.granted;
}

export async function getCurrentLocation(): Promise<Coords> {
  const fix = await Location.getCurrentPositionAsync({
    accuracy: Location.Accuracy.Balanced,
  });
  return {
    latitude: fix.coords.latitude,
    longitude: fix.coords.longitude,
    accuracy: fix.coords.accuracy,
  };
}

export function isAccurateEnough(c: Coords): boolean {
  return c.accuracy !== null && c.accuracy <= MIN_ACCURACY_M;
}

// Format an absolute distance in metres using the user's locale.
// Switches to "km" above 1000m, one decimal place.
export function formatDistance(metres: number, t: (k: string, v: any) => string): string {
  if (metres < 1000) return t("feed.distance_m", { m: Math.round(metres) });
  return t("feed.distance_km", { km: (metres / 1000).toFixed(1) });
}
