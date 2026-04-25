import { useState, useEffect, useRef } from "react";
import * as Location from "expo-location";

export interface UserLocation {
  latitude: number;
  longitude: number;
}

// Ankara merkezi — San Francisco yerine Türkiye default'u
const DEFAULT_LOCATION: UserLocation = {
  latitude: 39.9334,
  longitude: 32.8597,
};

export function useLocation() {
  const [location, setLocation] = useState<UserLocation>(DEFAULT_LOCATION);
  const [isRealLocation, setIsRealLocation] = useState(false);
  const [permissionGranted, setPermissionGranted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const mountedRef = useRef(true);

  function retry() {
    setIsLoading(true);
    setError(null);
    setRetryCount((c) => c + 1);
  }

  useEffect(() => {
    mountedRef.current = true;

    async function requestLocation() {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (!mountedRef.current) return;

        if (status !== "granted") {
          setPermissionGranted(false);
          setError("Konum izni verilmedi");
          setIsLoading(false);
          return;
        }

        setPermissionGranted(true);

        // 1. Adım: Önce son bilinen konumu hızlıca al (anlık gösterim için)
        try {
          const last = await Location.getLastKnownPositionAsync({
            maxAge: 5 * 60 * 1000, // 5 dakikadan eski olmasın
            requiredAccuracy: 200, // 200m hassasiyet yeterli
          });
          if (last && mountedRef.current) {
            setLocation({
              latitude: last.coords.latitude,
              longitude: last.coords.longitude,
            });
            setIsRealLocation(true);
            setIsLoading(false); // Kullanıcıya hemen göster
          }
        } catch {
          // Son konum yoksa sessizce devam et
        }

        // 2. Adım: Daha kesin konumu al ve güncelle
        const pos = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });

        if (mountedRef.current) {
          setLocation({
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
          });
          setIsRealLocation(true);
          setIsLoading(false);
        }
      } catch (e) {
        if (mountedRef.current) {
          setError("Konum alınamadı");
          setIsLoading(false);
        }
      }
    }

    requestLocation();

    return () => {
      mountedRef.current = false;
    };
  }, [retryCount]);

  return {
    location,
    isRealLocation,
    permissionGranted,
    isLoading,
    error,
    retry,
  };
}
