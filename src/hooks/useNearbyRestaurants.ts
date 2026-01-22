'use client';

import { useState, useEffect, useCallback } from 'react';
import type { Restaurant, NearbyRestaurantsResponse, ApiErrorResponse } from '@/types/restaurant';

interface UseNearbyRestaurantsResult {
  restaurants: Restaurant[];
  isLoading: boolean;
  isLoadingMore: boolean;
  error: string | null;
  cached: boolean;
  hasMore: boolean;
  refetch: () => Promise<void>;
  loadMore: () => Promise<void>;
}

export function useNearbyRestaurants(
  lat: number | null,
  lon: number | null,
  radius: number = 1500
): UseNearbyRestaurantsResult {
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cached, setCached] = useState(false);
  const [nextPageToken, setNextPageToken] = useState<string | null>(null);

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
        setNextPageToken(null);
      } else {
        setRestaurants(data.restaurants);
        setCached(data.cached);
        setNextPageToken(data.nextPageToken || null);
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

  const loadMore = useCallback(async () => {
    if (!nextPageToken || isLoadingMore || lat === null || lon === null) {
      return;
    }

    setIsLoadingMore(true);

    try {
      const response = await fetch('/api/places/nearby', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ latitude: lat, longitude: lon, radius, pageToken: nextPageToken }),
      });

      const result = await response.json();

      if (!response.ok) {
        const errorResponse = result as ApiErrorResponse;
        throw new Error(errorResponse.error || 'Failed to load more restaurants');
      }

      const data = result as NearbyRestaurantsResponse;
      setRestaurants((prev) => [...prev, ...data.restaurants]);
      setNextPageToken(data.nextPageToken || null);
    } catch (err) {
      console.error('Load more error:', err);
    } finally {
      setIsLoadingMore(false);
    }
  }, [nextPageToken, isLoadingMore, lat, lon, radius]);

  return {
    restaurants,
    isLoading,
    isLoadingMore,
    error,
    cached,
    hasMore: Boolean(nextPageToken),
    refetch: fetchRestaurants,
    loadMore,
  };
}
