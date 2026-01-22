'use client';

import { useState, useEffect } from 'react';
import type { Restaurant, RestaurantDetailsResponse, ApiErrorResponse } from '@/types/restaurant';

interface UseRestaurantDetailsResult {
  restaurant: Restaurant | null;
  isLoading: boolean;
  error: string | null;
  cached: boolean;
}

export function useRestaurantDetails(placeId: string | null): UseRestaurantDetailsResult {
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cached, setCached] = useState(false);

  useEffect(() => {
    if (!placeId) {
      setRestaurant(null);
      setError(null);
      return;
    }

    const fetchDetails = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch(`/api/places/details/${encodeURIComponent(placeId)}`);
        const data = await response.json();

        if (!response.ok) {
          const errorData = data as ApiErrorResponse;
          throw new Error(errorData.error || 'Failed to fetch restaurant details');
        }

        const result = data as RestaurantDetailsResponse;
        setRestaurant(result.restaurant);
        setCached(result.cached);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An unexpected error occurred');
        setRestaurant(null);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDetails();
  }, [placeId]);

  return { restaurant, isLoading, error, cached };
}
