// Google Places API client and transformation functions

import type { GooglePlace, GooglePhoto, GoogleReview } from '@/types/google-places';
import type { Restaurant, RestaurantPhoto, RestaurantReview } from '@/types/restaurant';
import { FINLAND_BOUNDS } from './constants';

// Transform Google Place to App Restaurant
export function transformGooglePlaceToRestaurant(place: GooglePlace): Restaurant {
  return {
    id: place.id,
    name: place.displayName.text,
    cuisine: extractCuisineType(place.types, place.primaryTypeDisplayName),
    rating: place.rating ?? 0,
    userRatingCount: place.userRatingCount ?? 0,
    priceLevel: transformPriceLevel(place.priceLevel),
    image: place.photos?.[0] ? buildPhotoUrl(place.photos[0].name, 'thumb') : null,
    photos: (place.photos ?? []).map(transformPhoto),
    lat: place.location.latitude,
    lon: place.location.longitude,
    address: place.formattedAddress,
    isOpen: place.currentOpeningHours?.openNow ?? null,
    businessStatus: transformBusinessStatus(place.businessStatus),
    phone: place.nationalPhoneNumber,
    website: place.websiteUri,
    openingHours: place.currentOpeningHours
      ? {
          isOpen: place.currentOpeningHours.openNow ?? false,
          weekdayDescriptions: place.currentOpeningHours.weekdayDescriptions ?? [],
        }
      : undefined,
    reviews: (place.reviews ?? []).map(transformReview),
    features: {
      delivery: place.delivery ?? false,
      dineIn: place.dineIn ?? false,
      takeout: place.takeout ?? false,
      reservable: place.reservable ?? false,
    },
    description: place.editorialSummary?.text,
  };
}

// Transform price level enum to euro symbols
function transformPriceLevel(level?: string): string {
  const mapping: Record<string, string> = {
    PRICE_LEVEL_FREE: '€',
    PRICE_LEVEL_INEXPENSIVE: '€',
    PRICE_LEVEL_MODERATE: '€€',
    PRICE_LEVEL_EXPENSIVE: '€€€',
    PRICE_LEVEL_VERY_EXPENSIVE: '€€€€',
  };
  return mapping[level ?? ''] ?? '€€';
}

// Extract cuisine type from types array
function extractCuisineType(
  types: string[],
  primaryDisplayName?: { text: string; languageCode: string }
): string {
  // Use primary type display name if available
  if (primaryDisplayName?.text) {
    return formatCuisineLabel(primaryDisplayName.text);
  }

  // Fallback to parsing types array
  const cuisineTypes = [
    'italian_restaurant',
    'japanese_restaurant',
    'chinese_restaurant',
    'indian_restaurant',
    'mexican_restaurant',
    'french_restaurant',
    'thai_restaurant',
    'vietnamese_restaurant',
    'korean_restaurant',
    'mediterranean_restaurant',
    'american_restaurant',
    'pizza_restaurant',
    'seafood_restaurant',
    'steak_house',
    'sushi_restaurant',
    'cafe',
    'bakery',
    'bar',
    'fine_dining_restaurant',
    'fast_food_restaurant',
    'brunch_restaurant',
    'breakfast_restaurant',
    'hamburger_restaurant',
    'vegan_restaurant',
    'vegetarian_restaurant',
  ];

  const found = types.find((t) => cuisineTypes.includes(t));
  if (found) {
    return formatCuisineLabel(found);
  }

  // Generic fallback
  if (types.includes('restaurant')) return 'Restaurant';
  if (types.includes('cafe')) return 'Cafe';
  if (types.includes('bar')) return 'Bar';

  return 'Restaurant';
}

// Format cuisine label for display
function formatCuisineLabel(type: string): string {
  return type
    .replace(/_restaurant$/, '')
    .replace(/_/g, ' ')
    .split(' ')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

// Transform business status
function transformBusinessStatus(
  status?: string
): 'open' | 'closed_temporarily' | 'closed_permanently' {
  switch (status) {
    case 'CLOSED_TEMPORARILY':
      return 'closed_temporarily';
    case 'CLOSED_PERMANENTLY':
      return 'closed_permanently';
    default:
      return 'open';
  }
}

// Build proxied photo URL
function buildPhotoUrl(photoName: string, size: 'thumb' | 'full' = 'full'): string {
  const base = `/api/places/photo/${encodeURIComponent(photoName)}`;
  return size === 'thumb' ? `${base}?size=thumb` : base;
}

// Transform Google Photo to app format
function transformPhoto(photo: GooglePhoto): RestaurantPhoto {
  return {
    url: buildPhotoUrl(photo.name),
    width: photo.widthPx,
    height: photo.heightPx,
    attribution: photo.authorAttributions?.[0]?.displayName,
  };
}

// Transform Google Review to app format
function transformReview(review: GoogleReview): RestaurantReview {
  return {
    id: review.name,
    authorName: review.authorAttribution.displayName,
    authorPhoto: review.authorAttribution.photoUri,
    rating: review.rating,
    text: review.text?.text ?? review.originalText?.text ?? '',
    relativeTime: review.relativePublishTimeDescription,
    publishTime: review.publishTime,
  };
}

// Validate if coordinates are within Finland
export function isWithinFinland(lat: number, lon: number): boolean {
  return (
    lat >= FINLAND_BOUNDS.minLat &&
    lat <= FINLAND_BOUNDS.maxLat &&
    lon >= FINLAND_BOUNDS.minLon &&
    lon <= FINLAND_BOUNDS.maxLon
  );
}

// Validate environment
export function validateEnv(): void {
  if (!process.env.GOOGLE_PLACES_API_KEY) {
    throw new Error('Missing required environment variable: GOOGLE_PLACES_API_KEY');
  }
}
