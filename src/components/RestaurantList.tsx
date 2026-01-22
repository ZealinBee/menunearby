"use client";

import { MapPin, Star, ChevronRight } from "lucide-react";

interface Restaurant {
  id: string;
  name: string;
  cuisine: string;
  rating: number;
  priceLevel: string;
  image: string;
  lat: number;
  lon: number;
}

interface RestaurantListProps {
  userLat: number;
  userLon: number;
  onViewDetails: (restaurantId: string) => void;
}

// Mock restaurant data (in production this would come from an API)
const mockRestaurants: Restaurant[] = [
  {
    id: "1",
    name: "Le Jardin Noir",
    cuisine: "French Contemporary",
    rating: 4.9,
    priceLevel: "€€€€",
    image: "https://images.unsplash.com/photo-1559339352-11d035aa65de?w=600&q=80",
    lat: 60.1699,
    lon: 24.9384,
  },
  {
    id: "2",
    name: "Ember & Oak",
    cuisine: "Modern American",
    rating: 4.8,
    priceLevel: "€€€",
    image: "https://images.unsplash.com/photo-1544025162-d76694265947?w=600&q=80",
    lat: 60.1656,
    lon: 24.9316,
  },
  {
    id: "3",
    name: "Sake House",
    cuisine: "Japanese",
    rating: 4.7,
    priceLevel: "€€€",
    image: "https://images.unsplash.com/photo-1579027989536-b7b1f875659b?w=600&q=80",
    lat: 60.1733,
    lon: 24.9410,
  },
  {
    id: "4",
    name: "Trattoria Milano",
    cuisine: "Italian",
    rating: 4.6,
    priceLevel: "€€",
    image: "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=600&q=80",
    lat: 60.1612,
    lon: 24.9458,
  },
  {
    id: "5",
    name: "Nordic Table",
    cuisine: "Scandinavian",
    rating: 4.8,
    priceLevel: "€€€€",
    image: "https://images.unsplash.com/photo-1466978913421-dad2ebd01d17?w=600&q=80",
    lat: 60.1689,
    lon: 24.9522,
  },
  {
    id: "6",
    name: "Spice Garden",
    cuisine: "Indian",
    rating: 4.5,
    priceLevel: "€€",
    image: "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=600&q=80",
    lat: 60.1745,
    lon: 24.9295,
  },
];

// Calculate distance between two coordinates using Haversine formula
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's radius in kilometers
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(deg: number): number {
  return deg * (Math.PI / 180);
}

function formatDistance(km: number): string {
  if (km < 1) {
    return `${Math.round(km * 1000)} m`;
  }
  return `${km.toFixed(1)} km`;
}

export default function RestaurantList({ userLat, userLon, onViewDetails }: RestaurantListProps) {
  // Calculate distances and sort by nearest
  const restaurantsWithDistance = mockRestaurants
    .map((restaurant) => ({
      ...restaurant,
      distance: calculateDistance(userLat, userLon, restaurant.lat, restaurant.lon),
    }))
    .sort((a, b) => a.distance - b.distance);

  return (
    <div className="min-h-screen bg-[var(--color-primary)]">
      {/* Header */}
      <header className="border-b border-[var(--color-primary-lighter)] py-6">
        <div className="max-w-6xl mx-auto px-8">
          <span className="text-label text-[var(--color-accent)] mb-2 block">
            {restaurantsWithDistance.length} Restaurants Found
          </span>
          <h1 className="text-2xl text-[var(--color-white)]">Nearby Restaurants</h1>
        </div>
      </header>

      {/* Restaurant Grid */}
      <section className="max-w-6xl mx-auto px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {restaurantsWithDistance.map((restaurant) => (
            <div
              key={restaurant.id}
              className="card group cursor-pointer transition-all duration-[var(--transition-base)] hover:border-[var(--color-accent)]"
            >
              {/* Restaurant Image */}
              <div
                className="h-48 -mx-6 -mt-6 mb-4 relative overflow-hidden"
                style={{
                  backgroundImage: `url("${restaurant.image}")`,
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                }}
              >
                <div className="absolute inset-0 bg-[var(--color-primary)] opacity-20 group-hover:opacity-10 transition-opacity" />
                <div className="absolute top-3 right-3 bg-[var(--color-primary)] px-2 py-1 flex items-center gap-1">
                  <Star
                    className="w-3.5 h-3.5 text-[var(--color-gold)] fill-[var(--color-gold)]"
                    strokeWidth={1.5}
                  />
                  <span className="text-[var(--color-white)] text-sm font-medium">
                    {restaurant.rating}
                  </span>
                </div>
              </div>

              {/* Restaurant Info */}
              <div className="space-y-3">
                <div>
                  <span className="text-label text-[var(--color-accent)] text-xs">
                    {restaurant.cuisine}
                  </span>
                  <h3 className="mt-1 text-lg group-hover:text-[var(--color-accent)] transition-colors">
                    {restaurant.name}
                  </h3>
                </div>

                <div className="flex items-center justify-between text-sm text-[var(--color-cream)] opacity-60">
                  <span className="flex items-center gap-1.5">
                    <MapPin className="w-4 h-4" strokeWidth={1.5} />
                    {formatDistance(restaurant.distance)}
                  </span>
                  <span>{restaurant.priceLevel}</span>
                </div>

                {/* View Details Button */}
                <button
                  onClick={() => onViewDetails(restaurant.id)}
                  className="w-full btn btn-secondary mt-4 justify-center"
                >
                  View Details
                  <ChevronRight className="w-4 h-4" strokeWidth={2} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
