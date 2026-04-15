import { useState, useEffect } from 'react';
import * as Location from 'expo-location';

export interface UserLocation {
  latitude: number;
  longitude: number;
}

// Ankara merkezi — San Francisco'dan daha mantıklı bir Türkiye default'u
const DEFAULT_LOCATION: UserLocation = { latitude: 39.9334, longitude: 32.8597 };

export function useLocation() {
  const [location, setLocation] = useState<UserLocation>(DEFAULT_LOCATION);
  const [isRealLocation, setIsRealLocation] = useState(false);
  const [permissionGranted, setPermissionGranted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function requestLocation() {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (!mounted) return;

        if (status !== 'granted') {
          setPermissionGranted(false);
          setIsLoading(false);
          return;
        }

        setPermissionGranted(true);

        const pos = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });

        if (mounted) {
          setLocation({
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
          });
          setIsRealLocation(true);
        }
      } catch (e) {
        if (mounted) setError('Konum alınamadı');
      } finally {
        if (mounted) setIsLoading(false);
      }
    }

    requestLocation();
    return () => { mounted = false; };
  }, []);

  return { location, isRealLocation, permissionGranted, isLoading, error };
}
