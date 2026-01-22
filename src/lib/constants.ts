// Field masks for different use cases

// List view - fields for restaurant cards
export const NEARBY_SEARCH_FIELDS = [
  'places.id',
  'places.displayName',
  'places.location',
  'places.formattedAddress',
  'places.types',
  'places.primaryType',
  'places.primaryTypeDisplayName',
  'places.businessStatus',
  'places.rating',
  'places.userRatingCount',
  'places.priceLevel',
  'places.photos',
  'places.currentOpeningHours.openNow',
].join(',');

// Detail view - full information
export const PLACE_DETAILS_FIELDS = [
  'id',
  'displayName',
  'location',
  'formattedAddress',
  'addressComponents',
  'types',
  'primaryType',
  'primaryTypeDisplayName',
  'businessStatus',
  'nationalPhoneNumber',
  'internationalPhoneNumber',
  'websiteUri',
  'rating',
  'userRatingCount',
  'priceLevel',
  'photos',
  'currentOpeningHours',
  'regularOpeningHours',
  'reviews',
  'editorialSummary',
  'delivery',
  'dineIn',
  'takeout',
  'reservable',
  'accessibilityOptions',
].join(',');

// Photo settings - full size for detail view
export const PHOTO_MAX_WIDTH = 800;
export const PHOTO_MAX_HEIGHT = 600;

// Thumbnail settings - smaller for list view (reduces API costs)
export const PHOTO_THUMB_WIDTH = 400;
export const PHOTO_THUMB_HEIGHT = 300;

// Search settings
export const DEFAULT_RADIUS_METERS = 2000; // 2km default
export const MAX_RESULTS = 20;

// Finland bounding box for validation
export const FINLAND_BOUNDS = {
  minLat: 59.5,
  maxLat: 70.1,
  minLon: 19.0,
  maxLon: 31.6,
};

// Cache TTL constants (in milliseconds)
export const CACHE_TTL = {
  NEARBY_SEARCH: 15 * 60 * 1000, // 15 minutes (restaurants don't change often)
  PLACE_DETAILS: 60 * 60 * 1000, // 1 hour
  PHOTO: 7 * 24 * 60 * 60 * 1000, // 7 days (photos rarely change)
};

// Error codes
export const ERROR_CODES = {
  OUT_OF_BOUNDS: 'Location must be within Finland',
  API_ERROR: 'Failed to communicate with Google Places API',
  RATE_LIMITED: 'Too many requests, please try again later',
  NOT_FOUND: 'Restaurant not found',
  INVALID_REQUEST: 'Invalid request parameters',
  INTERNAL_ERROR: 'An unexpected error occurred',
  NETWORK_ERROR: 'Network connection failed',
  NO_RESULTS: 'No restaurants found in this area',
} as const;

export type ErrorCode = keyof typeof ERROR_CODES;
