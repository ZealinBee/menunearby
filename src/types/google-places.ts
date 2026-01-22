// Google Places API (New) Response Types

export interface GooglePlacesNearbyResponse {
  places: GooglePlace[];
  nextPageToken?: string;
}

export interface GooglePlace {
  id: string;
  displayName: {
    text: string;
    languageCode: string;
  };
  formattedAddress: string;
  addressComponents?: AddressComponent[];
  location: {
    latitude: number;
    longitude: number;
  };
  types: string[];
  primaryType?: string;
  primaryTypeDisplayName?: {
    text: string;
    languageCode: string;
  };

  // Business status
  businessStatus?: 'OPERATIONAL' | 'CLOSED_TEMPORARILY' | 'CLOSED_PERMANENTLY';

  // Contact info
  nationalPhoneNumber?: string;
  internationalPhoneNumber?: string;
  websiteUri?: string;

  // Opening hours
  currentOpeningHours?: OpeningHours;
  regularOpeningHours?: OpeningHours;

  // Ratings & reviews
  rating?: number;
  userRatingCount?: number;
  reviews?: GoogleReview[];

  // Price level (0-4, where 0=free, 4=very expensive)
  priceLevel?:
    | 'PRICE_LEVEL_FREE'
    | 'PRICE_LEVEL_INEXPENSIVE'
    | 'PRICE_LEVEL_MODERATE'
    | 'PRICE_LEVEL_EXPENSIVE'
    | 'PRICE_LEVEL_VERY_EXPENSIVE';

  // Photos
  photos?: GooglePhoto[];

  // Editorial summary
  editorialSummary?: {
    text: string;
    languageCode: string;
  };

  // Reservations
  reservable?: boolean;

  // Delivery & takeout
  delivery?: boolean;
  dineIn?: boolean;
  takeout?: boolean;

  // Accessibility
  accessibilityOptions?: {
    wheelchairAccessibleEntrance?: boolean;
    wheelchairAccessibleParking?: boolean;
    wheelchairAccessibleRestroom?: boolean;
    wheelchairAccessibleSeating?: boolean;
  };
}

export interface AddressComponent {
  longText: string;
  shortText: string;
  types: string[];
  languageCode: string;
}

export interface OpeningHours {
  openNow?: boolean;
  periods?: OpeningPeriod[];
  weekdayDescriptions?: string[];
  specialDays?: SpecialDay[];
}

export interface OpeningPeriod {
  open: {
    day: number;
    hour: number;
    minute: number;
    date?: { year: number; month: number; day: number };
  };
  close?: {
    day: number;
    hour: number;
    minute: number;
    date?: { year: number; month: number; day: number };
  };
}

export interface SpecialDay {
  date: { year: number; month: number; day: number };
}

export interface GoogleReview {
  name: string;
  relativePublishTimeDescription: string;
  rating: number;
  text?: {
    text: string;
    languageCode: string;
  };
  originalText?: {
    text: string;
    languageCode: string;
  };
  authorAttribution: {
    displayName: string;
    uri?: string;
    photoUri?: string;
  };
  publishTime: string;
}

export interface GooglePhoto {
  name: string;
  widthPx: number;
  heightPx: number;
  authorAttributions: {
    displayName: string;
    uri?: string;
    photoUri?: string;
  }[];
}

// Request types
export interface NearbySearchRequest {
  latitude: number;
  longitude: number;
  radius?: number;
  maxResultCount?: number;
}

export interface PlaceDetailsRequest {
  placeId: string;
  fields?: string[];
}
