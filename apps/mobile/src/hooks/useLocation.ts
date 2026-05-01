import { useEffect, useState } from "react";
import { Coords, getCurrentLocation, requestLocationPermission } from "@/lib/location";

export function useLocation() {
  const [coords, setCoords] = useState<Coords | null>(null);
  const [error, setError]   = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const ok = await requestLocationPermission();
        if (!ok) throw new Error("permission_denied");
        const c = await getCurrentLocation();
        if (!cancelled) setCoords(c);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "unknown");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  return { coords, error, loading };
}
