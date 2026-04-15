import { useState, useEffect } from 'react';
import * as Location from 'expo-location';

export interface UserLocation {
  latitude: number;
  longitude: number;
}

// Default: İstanbul merkezi
const DEFAULT_LOCATION: UserLocation = { latitude: 41.0082, longitude: 28.9784 };

export function useLocation() {
  const [location, setLocation] = useState<UserLocation>(DEFAULT_LOCATION);
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
          setLocation({ latitude: pos.coords.latitude, longitude: pos.coords.longitude });
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

  return { location, permissionGranted, isLoading, error };
}
