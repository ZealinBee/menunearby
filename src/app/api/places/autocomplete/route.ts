import { NextResponse } from 'next/server';

interface AutocompletePrediction {
  place: string;
  placeId: string;
  text: {
    text: string;
    matches?: Array<{ startOffset: number; endOffset: number }>;
  };
  structuredFormat: {
    mainText: { text: string };
    secondaryText?: { text: string };
  };
}

interface GoogleAutocompleteResponse {
  suggestions?: Array<{
    placePrediction: AutocompletePrediction;
  }>;
}

export interface LocationSuggestion {
  placeId: string;
  mainText: string;
  secondaryText: string;
  fullText: string;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { query } = body;

    if (!query || typeof query !== 'string' || query.length < 2) {
      return NextResponse.json({ suggestions: [] });
    }

    if (!process.env.GOOGLE_PLACES_API_KEY) {
      console.error('Missing GOOGLE_PLACES_API_KEY');
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      );
    }

    const response = await fetch(
      'https://places.googleapis.com/v1/places:autocomplete',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': process.env.GOOGLE_PLACES_API_KEY,
        },
        body: JSON.stringify({
          input: query,
          includedRegionCodes: ['fi'],
          languageCode: 'en',
        }),
      }
    );

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      console.error('Google Places Autocomplete error:', error);
      return NextResponse.json(
        { error: 'Autocomplete failed' },
        { status: response.status }
      );
    }

    const data: GoogleAutocompleteResponse = await response.json();

    const suggestions: LocationSuggestion[] = (data.suggestions ?? []).map(
      (s) => ({
        placeId: s.placePrediction.placeId,
        mainText: s.placePrediction.structuredFormat.mainText.text,
        secondaryText: s.placePrediction.structuredFormat.secondaryText?.text ?? 'Finland',
        fullText: s.placePrediction.text.text,
      })
    );

    return NextResponse.json({ suggestions });
  } catch (error) {
    console.error('Autocomplete error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
