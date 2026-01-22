import { NextResponse } from 'next/server';
import type { GooglePlace } from '@/types/google-places';
import type { RestaurantDetailsResponse } from '@/types/restaurant';
import { transformGooglePlaceToRestaurant } from '@/lib/google-places';
import { placesCache, placeDetailsCacheKey } from '@/lib/cache';
import { PLACE_DETAILS_FIELDS, CACHE_TTL } from '@/lib/constants';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ placeId: string }> }
) {
  try {
    const { placeId } = await params;

    if (!placeId) {
      return NextResponse.json(
        { error: 'Place ID is required', code: 'INVALID_REQUEST' },
        { status: 400 }
      );
    }

    // Check cache
    const cacheKey = placeDetailsCacheKey(placeId);
    const cached = placesCache.get<RestaurantDetailsResponse>(cacheKey);
    if (cached) {
      return NextResponse.json({
        ...cached.data,
        cached: true,
        cacheAge: cached.age,
      });
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
      `https://places.googleapis.com/v1/places/${placeId}`,
      {
        headers: {
          'X-Goog-Api-Key': process.env.GOOGLE_PLACES_API_KEY,
          'X-Goog-FieldMask': PLACE_DETAILS_FIELDS,
        },
      }
    );

    if (!response.ok) {
      if (response.status === 404) {
        return NextResponse.json(
          { error: 'Restaurant not found', code: 'NOT_FOUND' },
          { status: 404 }
        );
      }
      const error = await response.json().catch(() => ({}));
      console.error('Google Places API error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch details', code: 'API_ERROR' },
        { status: response.status }
      );
    }

    const place: GooglePlace = await response.json();
    const restaurant = transformGooglePlaceToRestaurant(place);

    const result: RestaurantDetailsResponse = {
      restaurant,
      cached: false,
    };

    // Cache the result
    placesCache.set(cacheKey, result, CACHE_TTL.PLACE_DETAILS);

    return NextResponse.json(result);
  } catch (error) {
    console.error('Place details error:', error);
    return NextResponse.json(
      { error: 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}
