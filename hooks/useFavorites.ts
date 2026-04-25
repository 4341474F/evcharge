import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Alert } from 'react-native';
import { supabase } from '../lib/supabase/client';
import { useAuthStore } from '../stores/authStore';
import type { ChargingStation } from '../types/station';

interface FavoriteRow {
  id: string;
  station_ocm_id: string;
  station_name: string;
  network: string | null;
  city: string | null;
  latitude: number | null;
  longitude: number | null;
  added_at: string;
}

export function useFavorites() {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();

  // Favorileri çek
  const { data: favorites = [], isLoading } = useQuery({
    queryKey: ['favorites', user?.id],
    queryFn: async (): Promise<FavoriteRow[]> => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('favorites')
        .select('id, station_ocm_id, station_name, network, city, latitude, longitude, added_at')
        .order('added_at', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!user,
  });

  // Favori mi kontrolü
  function isFavorite(stationId: string): boolean {
    return favorites.some((f) => f.station_ocm_id === stationId);
  }

  // Favori ekle mutation
  const addMutation = useMutation({
    mutationFn: async (station: ChargingStation) => {
      if (!user) throw new Error('Giriş yapılmamış');
      const { error } = await supabase.from('favorites').insert({
        user_id: user.id,
        station_ocm_id: station.id,
        station_name: station.name,
        network: station.network,
        city: station.city,
        latitude: station.latitude,
        longitude: station.longitude,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['favorites', user?.id] });
    },
    onError: (err: Error) => {
      Alert.alert('Hata', err.message ?? 'Favoriye eklenemedi.');
    },
  });

  // Favori kaldır mutation
  const removeMutation = useMutation({
    mutationFn: async (stationId: string) => {
      if (!user) throw new Error('Giriş yapılmamış');
      const { error } = await supabase
        .from('favorites')
        .delete()
        .eq('station_ocm_id', stationId)
        .eq('user_id', user.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['favorites', user?.id] });
    },
    onError: () => {
      Alert.alert('Hata', 'Favoriden kaldırılamadı.');
    },
  });

  // Toggle: ekliyse kaldır, yoksa ekle
  function toggleFavorite(station: ChargingStation) {
    if (!user) {
      Alert.alert('Giriş Gerekli', 'Favorilere eklemek için giriş yapın.');
      return;
    }
    if (isFavorite(station.id)) {
      removeMutation.mutate(station.id);
    } else {
      addMutation.mutate(station);
    }
  }

  return {
    favorites,
    isLoading,
    isFavorite,
    toggleFavorite,
    isToggling: addMutation.isPending || removeMutation.isPending,
  };
}
