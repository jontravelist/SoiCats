// Reads GPS coordinates out of the EXIF blob expo-image-picker returns.
//
// EXIF GPS shape varies a lot between platforms and image sources:
//  - iOS sometimes nests under {GPS: {...}}, sometimes flattens it.
//  - Android tends to flatten everything.
//  - Older photos might use rational arrays for lat/lng instead of decimals.
//
// We accept any shape we recognise and return decimal degrees, applying the
// hemisphere refs (N/S, E/W) so the sign is right for our PostGIS schema.

type Maybe<T> = T | null | undefined;
type ExifLike = Record<string, unknown> | null | undefined;

export function extractGpsFromExif(exif: ExifLike): { lat: number; lng: number } | null {
  if (!exif) return null;

  const gps = ((exif as Record<string, unknown>).GPS as Record<string, unknown>) ?? exif;

  const rawLat = (gps.GPSLatitude ?? (gps as Record<string, unknown>).Latitude) as Maybe<number | number[]>;
  const rawLng = (gps.GPSLongitude ?? (gps as Record<string, unknown>).Longitude) as Maybe<number | number[]>;
  const latRef = (gps.GPSLatitudeRef ?? (gps as Record<string, unknown>).LatitudeRef) as Maybe<string>;
  const lngRef = (gps.GPSLongitudeRef ?? (gps as Record<string, unknown>).LongitudeRef) as Maybe<string>;

  const lat = toDecimal(rawLat);
  const lng = toDecimal(rawLng);
  if (lat === null || lng === null) return null;
  // 0,0 is the EXIF sentinel for "no location" on some devices.
  if (lat === 0 && lng === 0) return null;

  const signedLat = latRef && /^s/i.test(latRef) ? -Math.abs(lat) : Math.abs(lat);
  const signedLng = lngRef && /^w/i.test(lngRef) ? -Math.abs(lng) : Math.abs(lng);

  // Sanity check — anything outside Earth's bounds means we read it wrong.
  if (Math.abs(signedLat) > 90 || Math.abs(signedLng) > 180) return null;

  return { lat: signedLat, lng: signedLng };
}

function toDecimal(value: Maybe<number | number[]>): number | null {
  if (typeof value === "number" && isFinite(value)) return value;
  // Older EXIF stores [degrees, minutes, seconds] as rationals.
  if (Array.isArray(value) && value.length >= 3) {
    const [d, m, s] = value;
    if ([d, m, s].every((n) => typeof n === "number" && isFinite(n))) {
      return d + m / 60 + s / 3600;
    }
  }
  return null;
}
