// Application-level restaurant types (transformed from Google Places)

export interface Restaurant {
  id: string;
  name: string;
  cuisine: string;
  rating: number;
  userRatingCount: number;
  priceLevel: string;
  image: string | null;
  photos: RestaurantPhoto[];
  lat: number;
  lon: number;

  // Extended info
  address: string;
  distance?: number;

  // Status
  isOpen: boolean | null;
  businessStatus: 'open' | 'closed_temporarily' | 'closed_permanently';

  // Contact
  phone?: string;
  website?: string;

  // Hours
  openingHours?: {
    isOpen: boolean;
    weekdayDescriptions: string[];
  };

  // Reviews
  reviews?: RestaurantReview[];

  // Features
  features: {
    delivery: boolean;
    dineIn: boolean;
    takeout: boolean;
    reservable: boolean;
  };

  // Description
  description?: string;
}

export interface RestaurantPhoto {
  url: string;
  width: number;
  height: number;
  attribution?: string;
}

export interface RestaurantReview {
  id: string;
  authorName: string;
  authorPhoto?: string;
  rating: number;
  text: string;
  relativeTime: string;
  publishTime: string;
}

// API response types for our endpoints
export interface NearbyRestaurantsResponse {
  restaurants: Restaurant[];
  nextPageToken?: string;
  cached: boolean;
  cacheAge?: number;
}

export interface RestaurantDetailsResponse {
  restaurant: Restaurant;
  cached: boolean;
}

// Error response
export interface ApiErrorResponse {
  error: string;
  code: string;
  details?: string;
}
