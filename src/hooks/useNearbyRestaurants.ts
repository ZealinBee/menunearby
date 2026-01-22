'use client';

import { useState, useEffect, useCallback } from 'react';
import type { Restaurant, NearbyRestaurantsResponse, ApiErrorResponse } from '@/types/restaurant';

interface UseNearbyRestaurantsResult {
  restaurants: Restaurant[];
  isLoading: boolean;
  error: string | null;
  cached: boolean;
  refetch: () => Promise<void>;
}

export function useNearbyRestaurants(
  lat: number | null,
  lon: number | null,
  radius: number = 1500
): UseNearbyRestaurantsResult {
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cached, setCached] = useState(false);

  const fetchRestaurants = useCallback(async () => {
    if (lat === null || lon === null) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/places/nearby', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ latitude: lat, longitude: lon, radius }),
      });

      const result = await response.json();

      if (!response.ok) {
        const errorResponse = result as ApiErrorResponse;
        throw new Error(errorResponse.error || 'Failed to fetch restaurants');
      }

      const data = result as NearbyRestaurantsResponse;

      if (data.restaurants.length === 0) {
        setError('No restaurants found nearby. Try a different location or increase the search radius.');
        setRestaurants([]);
      } else {
        setRestaurants(data.restaurants);
        setCached(data.cached);
      }
    } catch (err) {
      if (err instanceof Error) {
        if (err.message.includes('fetch') || err.name === 'TypeError') {
          setError('Network error. Please check your connection and try again.');
        } else {
          setError(err.message);
        }
      } else {
        setError('An unexpected error occurred');
      }
      setRestaurants([]);
    } finally {
      setIsLoading(false);
    }
  }, [lat, lon, radius]);

  useEffect(() => {
    if (lat !== null && lon !== null) {
      fetchRestaurants();
    }
  }, [lat, lon, fetchRestaurants]);

  return {
    restaurants,
    isLoading,
    error,
    cached,
    refetch: fetchRestaurants,
  };
}
