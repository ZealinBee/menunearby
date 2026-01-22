import { NextResponse } from 'next/server';
import type { GooglePlacesNearbyResponse } from '@/types/google-places';
import type { NearbyRestaurantsResponse } from '@/types/restaurant';
import { transformGooglePlaceToRestaurant, isWithinFinland } from '@/lib/google-places';
import { placesCache, nearbySearchCacheKey } from '@/lib/cache';
import {
  NEARBY_SEARCH_FIELDS,
  DEFAULT_RADIUS_METERS,
  MAX_RESULTS,
  CACHE_TTL,
} from '@/lib/constants';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { latitude, longitude, radius = DEFAULT_RADIUS_METERS, pageToken } = body;

    // Validate request
    if (typeof latitude !== 'number' || typeof longitude !== 'number') {
      return NextResponse.json(
        { error: 'Invalid coordinates', code: 'INVALID_REQUEST' },
        { status: 400 }
      );
    }

    // Validate Finland bounds
    if (!isWithinFinland(latitude, longitude)) {
      return NextResponse.json(
        { error: 'Location must be within Finland', code: 'OUT_OF_BOUNDS' },
        { status: 400 }
      );
    }

    // Skip cache for paginated requests
    if (!pageToken) {
      const cacheKey = nearbySearchCacheKey(latitude, longitude, radius);
      const cached = placesCache.get<NearbyRestaurantsResponse>(cacheKey);
      if (cached) {
        return NextResponse.json({
          ...cached.data,
          cached: true,
          cacheAge: cached.age,
        });
      }
    }

    // Validate API key
    if (!process.env.GOOGLE_PLACES_API_KEY) {
      console.error('Missing GOOGLE_PLACES_API_KEY');
      return NextResponse.json(
        { error: 'Server configuration error', code: 'INTERNAL_ERROR' },
        { status: 500 }
      );
    }

    // Call Google Places API
    const response = await fetch(
      'https://places.googleapis.com/v1/places:searchNearby',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': process.env.GOOGLE_PLACES_API_KEY,
          'X-Goog-FieldMask': NEARBY_SEARCH_FIELDS,
        },
        body: JSON.stringify({
          includedTypes: ['restaurant', 'cafe', 'bar'],
          excludedTypes: ['gas_station', 'convenience_store'],
          maxResultCount: MAX_RESULTS,
          rankPreference: 'DISTANCE', // Sort by distance, not popularity
          locationRestriction: {
            circle: {
              center: { latitude, longitude },
              radius: radius,
            },
          },
          languageCode: 'en',
          ...(pageToken && { pageToken }),
        }),
      }
    );

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      console.error('Google Places API error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch restaurants', code: 'API_ERROR' },
        { status: response.status }
      );
    }

    const data: GooglePlacesNearbyResponse = await response.json();

    // Transform to app format
    const restaurants = (data.places ?? []).map(transformGooglePlaceToRestaurant);

    const result: NearbyRestaurantsResponse = {
      restaurants,
      nextPageToken: data.nextPageToken,
      cached: false,
    };

    // Only cache the first page of results
    if (!pageToken) {
      const cacheKey = nearbySearchCacheKey(latitude, longitude, radius);
      placesCache.set(cacheKey, result, CACHE_TTL.NEARBY_SEARCH);
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('Nearby search error:', error);
    return NextResponse.json(
      { error: 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}
