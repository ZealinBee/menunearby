import { NextResponse } from 'next/server';
import { isWithinFinland } from '@/lib/google-places';

interface GooglePlaceLocation {
  location: {
    latitude: number;
    longitude: number;
  };
  formattedAddress?: string;
  displayName?: {
    text: string;
  };
}

export interface GeocodedLocation {
  lat: number;
  lon: number;
  address: string;
  name: string;
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ placeId: string }> }
) {
  try {
    const { placeId } = await params;

    if (!placeId) {
      return NextResponse.json(
        { error: 'Place ID is required' },
        { status: 400 }
      );
    }

    if (!process.env.GOOGLE_PLACES_API_KEY) {
      console.error('Missing GOOGLE_PLACES_API_KEY');
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      );
    }

    const response = await fetch(
      `https://places.googleapis.com/v1/places/${placeId}`,
      {
        headers: {
          'X-Goog-Api-Key': process.env.GOOGLE_PLACES_API_KEY,
          'X-Goog-FieldMask': 'location,formattedAddress,displayName',
        },
      }
    );

    if (!response.ok) {
      if (response.status === 404) {
        return NextResponse.json(
          { error: 'Place not found' },
          { status: 404 }
        );
      }
      const error = await response.json().catch(() => ({}));
      console.error('Google Places API error:', error);
      return NextResponse.json(
        { error: 'Geocode failed' },
        { status: response.status }
      );
    }

    const place: GooglePlaceLocation = await response.json();

    if (!isWithinFinland(place.location.latitude, place.location.longitude)) {
      return NextResponse.json(
        { error: 'Location must be within Finland' },
        { status: 400 }
      );
    }

    const result: GeocodedLocation = {
      lat: place.location.latitude,
      lon: place.location.longitude,
      address: place.formattedAddress ?? '',
      name: place.displayName?.text ?? '',
    };

    return NextResponse.json(result);
  } catch (error) {
    console.error('Geocode error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
