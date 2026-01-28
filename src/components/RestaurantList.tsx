'use client';

import { MapPin, Star, ChevronRight, Clock, Target, Filter } from 'lucide-react';
import { useNearbyRestaurants } from '@/hooks/useNearbyRestaurants';
import { useDebounce } from '@/hooks/useDebounce';
import { RestaurantListSkeleton, ErrorState, EmptyState } from './LoadingStates';
import type { Restaurant } from '@/types/restaurant';
import { useState, useCallback, useMemo } from 'react';

interface RestaurantListProps {
  userLat: number;
  userLon: number;
  onViewDetails: (restaurantId: string) => void;
}

const RADIUS_OPTIONS = [
  { value: 500, label: '500m' },
  { value: 1000, label: '1 km' },
  { value: 2000, label: '2 km' },
  { value: 3000, label: '3 km' },
  { value: 5000, label: '5 km' },
  { value: 10000, label: '10 km' },
];

const PRICE_OPTIONS = [
  { value: 'all', label: 'All' },
  { value: '€', label: '€' },
  { value: '€€', label: '€€' },
  { value: '€€€', label: '€€€' },
  { value: '€€€€', label: '€€€€' },
];

type OpenFilter = 'all' | 'open';

const DEFAULT_RADIUS = 2000; // 2km default

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

function formatRadius(meters: number): string {
  if (meters < 1000) {
    return `${meters}m`;
  }
  return `${meters / 1000} km`;
}

export default function RestaurantList({ userLat, userLon, onViewDetails }: RestaurantListProps) {
  const [radius, setRadius] = useState(DEFAULT_RADIUS);
  const [openFilter, setOpenFilter] = useState<OpenFilter>('all');
  const [priceFilter, setPriceFilter] = useState<string>('all');
  const debouncedRadius = useDebounce(radius, 500); // 500ms debounce

  const { restaurants, isLoading, isLoadingMore, error, hasMore, refetch, loadMore } = useNearbyRestaurants(
    userLat,
    userLon,
    debouncedRadius
  );
  const [imageErrors, setImageErrors] = useState<Set<string>>(new Set());

  // Calculate distances, apply filters, and sort by nearest
  const restaurantsWithDistance = useMemo(() => {
    return restaurants
      .map((restaurant) => ({
        ...restaurant,
        distance: calculateDistance(userLat, userLon, restaurant.lat, restaurant.lon),
      }))
      .filter((restaurant) => {
        // Open filter
        if (openFilter === 'open' && restaurant.isOpen !== true) return false;

        // Price filter
        if (priceFilter !== 'all' && restaurant.priceLevel !== priceFilter) return false;

        return true;
      })
      .sort((a, b) => a.distance - b.distance);
  }, [restaurants, userLat, userLon, openFilter, priceFilter]);

  const handleImageError = useCallback((id: string) => {
    setImageErrors((prev) => new Set(prev).add(id));
  }, []);

  // Find the current step index for the slider
  const currentStepIndex = RADIUS_OPTIONS.findIndex((opt) => opt.value === radius);
  const progressPercent = (currentStepIndex / (RADIUS_OPTIONS.length - 1)) * 100;

  // Count for filter feedback
  const totalCount = restaurants.length;
  const filteredCount = restaurantsWithDistance.length;
  const hasActiveFilters = openFilter !== 'all' || priceFilter !== 'all';

  return (
    <div className="min-h-screen bg-[var(--color-primary)]">
      {/* Header */}
      <header className="border-b border-[var(--color-primary-lighter)] py-4 sm:py-6">
        <div className="max-w-6xl mx-auto px-4 sm:px-8">
          {/* Title row */}
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 sm:gap-8 mb-6">
            <div>
              <span className="text-label text-[var(--color-accent)] mb-2 block">
                {isLoading
                  ? 'Searching...'
                  : hasActiveFilters
                    ? `Showing ${filteredCount} of ${totalCount} loaded`
                    : 'Browse restaurants near you'}
              </span>
              <h1 className="text-xl sm:text-2xl text-[var(--color-white)]">Nearby Restaurants</h1>
            </div>
          </div>

          {/* Filters row */}
          <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 sm:items-end">
            {/* Radius Slider */}
            <div className="flex-1 sm:max-w-[240px]">
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs text-[var(--color-cream)] opacity-60 flex items-center gap-1.5">
                  <Target className="w-3.5 h-3.5" strokeWidth={1.5} />
                  Radius
                </label>
                <span className="text-sm font-medium text-[var(--color-accent)] font-sans tabular-nums">
                  {formatRadius(radius)}
                </span>
              </div>

              <div className="relative">
                {/* Track background */}
                <div className="absolute top-1/2 -translate-y-1/2 left-0 right-0 h-1 bg-[var(--color-primary-lighter)] rounded-full" />

                {/* Progress fill */}
                <div
                  className="absolute top-1/2 -translate-y-1/2 left-0 h-1 bg-gradient-to-r from-[var(--color-accent)] to-[var(--color-gold)] rounded-full transition-all duration-150"
                  style={{ width: `${progressPercent}%` }}
                />

                {/* Step markers */}
                <div className="absolute top-1/2 -translate-y-1/2 left-0 right-0 flex justify-between px-0">
                  {RADIUS_OPTIONS.map((opt, i) => {
                    const isActive = i <= currentStepIndex;
                    const isCurrent = i === currentStepIndex;
                    return (
                      <button
                        key={opt.value}
                        onClick={() => setRadius(opt.value)}
                        className={`w-2.5 h-2.5 rounded-full transition-all duration-200 ${
                          isCurrent
                            ? 'bg-[var(--color-accent)] scale-150 ring-2 ring-[var(--color-accent)]/30'
                            : isActive
                              ? 'bg-[var(--color-gold)]'
                              : 'bg-[var(--color-primary-lighter)] hover:bg-[var(--color-cream)]/40'
                        }`}
                        aria-label={`Set radius to ${opt.label}`}
                      />
                    );
                  })}
                </div>

                {/* Hidden range input for accessibility and smooth dragging */}
                <input
                  type="range"
                  min={0}
                  max={RADIUS_OPTIONS.length - 1}
                  step={1}
                  value={currentStepIndex}
                  onChange={(e) => setRadius(RADIUS_OPTIONS[parseInt(e.target.value)].value)}
                  className="absolute inset-0 w-full h-6 opacity-0 cursor-pointer"
                  aria-label="Search radius"
                />
              </div>

              {/* Labels */}
              <div className="flex justify-between mt-1.5">
                <span className="text-[10px] text-[var(--color-cream)] opacity-40 font-sans">500m</span>
                <span className="text-[10px] text-[var(--color-cream)] opacity-40 font-sans">10km</span>
              </div>
            </div>

            {/* Open/Closed Filter */}
            <div className="sm:w-auto">
              <label className="text-xs text-[var(--color-cream)] opacity-60 flex items-center gap-1.5 mb-2">
                <Clock className="w-3.5 h-3.5" strokeWidth={1.5} />
                Status
              </label>
              <div className="flex gap-1">
                {(['all', 'open'] as const).map((status) => (
                  <button
                    key={status}
                    onClick={() => setOpenFilter(status)}
                    className={`px-3 py-1.5 text-xs font-medium transition-all duration-200 ${
                      openFilter === status
                        ? 'bg-[var(--color-accent)] text-white'
                        : 'bg-[var(--color-primary-lighter)] text-[var(--color-cream)] opacity-70 hover:opacity-100'
                    }`}
                  >
                    {status === 'all' ? 'All' : 'Open'}
                  </button>
                ))}
              </div>
            </div>

            {/* Price Filter */}
            <div className="sm:w-auto">
              <label className="text-xs text-[var(--color-cream)] opacity-60 flex items-center gap-1.5 mb-2">
                <Filter className="w-3.5 h-3.5" strokeWidth={1.5} />
                Price
              </label>
              <div className="flex gap-1">
                {PRICE_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => setPriceFilter(option.value)}
                    className={`px-3 py-1.5 text-xs font-medium font-sans transition-all duration-200 ${
                      priceFilter === option.value
                        ? 'bg-[var(--color-accent)] text-white'
                        : 'bg-[var(--color-primary-lighter)] text-[var(--color-cream)] opacity-70 hover:opacity-100'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Clear filters button */}
            {hasActiveFilters && (
              <button
                onClick={() => {
                  setOpenFilter('all');
                  setPriceFilter('all');
                }}
                className="text-xs text-[var(--color-accent)] hover:text-[var(--color-gold)] transition-colors self-end pb-1.5"
              >
                Clear filters
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Restaurant Grid */}
      <section className="max-w-6xl mx-auto px-4 sm:px-8 py-8 sm:py-12">
        {isLoading ? (
          <RestaurantListSkeleton count={6} />
        ) : error ? (
          <ErrorState message={error} onRetry={refetch} />
        ) : restaurantsWithDistance.length === 0 ? (
          <EmptyState />
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              {restaurantsWithDistance.map((restaurant) => (
                <RestaurantCard
                  key={restaurant.id}
                  restaurant={restaurant}
                  distance={restaurant.distance}
                  onViewDetails={onViewDetails}
                  hasImageError={imageErrors.has(restaurant.id)}
                  onImageError={() => handleImageError(restaurant.id)}
                />
              ))}
            </div>

            {/* Load More Button */}
            {hasMore && (
              <div className="flex justify-center mt-8">
                <button
                  onClick={loadMore}
                  disabled={isLoadingMore}
                  className="btn btn-secondary px-8 py-3 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoadingMore ? 'Loading...' : 'Load More Restaurants'}
                </button>
              </div>
            )}

            {/* End of results message */}
            {!hasMore && totalCount > 0 && (
              <p className="text-center text-sm text-[var(--color-cream)] opacity-50 mt-8">
                {totalCount >= 60
                  ? `Showing all ${totalCount} results. Adjust the radius to explore a different area.`
                  : `End of results (${totalCount} restaurant${totalCount !== 1 ? 's' : ''})`}
              </p>
            )}
          </>
        )}
      </section>
    </div>
  );
}

interface RestaurantCardProps {
  restaurant: Restaurant;
  distance: number;
  onViewDetails: (id: string) => void;
  hasImageError: boolean;
  onImageError: () => void;
}

function RestaurantCard({
  restaurant,
  distance,
  onViewDetails,
  hasImageError,
  onImageError,
}: RestaurantCardProps) {
  const imageUrl = hasImageError || !restaurant.image ? null : restaurant.image;

  return (
    <div className="card group cursor-pointer transition-all duration-[var(--transition-base)] hover:border-[var(--color-accent)]">
      {/* Restaurant Image */}
      <div className="h-40 sm:h-48 -mx-6 -mt-6 mb-4 relative overflow-hidden bg-[var(--color-primary-lighter)]">
        {imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={imageUrl}
            alt={restaurant.name}
            className="w-full h-full object-cover"
            loading="lazy"
            onError={onImageError}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <span className="text-[var(--color-cream)] opacity-40 text-sm">No image</span>
          </div>
        )}
        <div className="absolute inset-0 bg-[var(--color-primary)] opacity-20 group-hover:opacity-10 transition-opacity" />

        {/* Rating badge */}
        {restaurant.rating > 0 && (
          <div className="absolute top-3 right-3 bg-[var(--color-primary)] px-2 py-1 flex items-center gap-1">
            <Star
              className="w-3.5 h-3.5 text-[var(--color-gold)] fill-[var(--color-gold)]"
              strokeWidth={1.5}
            />
            <span className="text-[var(--color-white)] text-sm font-medium font-sans">
              {restaurant.rating.toFixed(1)}
            </span>
            {restaurant.userRatingCount > 0 && (
              <span className="text-[var(--color-cream)] text-xs opacity-60 font-sans">
                ({restaurant.userRatingCount})
              </span>
            )}
          </div>
        )}

        {/* Open/Closed badge */}
        {restaurant.isOpen !== null && (
          <div
            className={`absolute top-3 left-3 px-2 py-1 flex items-center gap-1 text-xs ${
              restaurant.isOpen
                ? 'bg-green-900/80 text-green-300'
                : 'bg-red-900/80 text-red-300'
            }`}
          >
            <Clock className="w-3 h-3" strokeWidth={2} />
            {restaurant.isOpen ? 'Open' : 'Closed'}
          </div>
        )}
      </div>

      {/* Restaurant Info */}
      <div className="space-y-3">
        <div>
          <span className="text-label text-[var(--color-accent)] text-xs">{restaurant.cuisine}</span>
          <h3 className="mt-1 text-lg group-hover:text-[var(--color-accent)] transition-colors">
            {restaurant.name}
          </h3>
        </div>

        <div className="flex items-center justify-between text-sm text-[var(--color-cream)] opacity-60">
          <span className="flex items-center gap-1.5">
            <MapPin className="w-4 h-4" strokeWidth={1.5} />
            {formatDistance(distance)}
          </span>
          <span>{restaurant.priceLevel}</span>
        </div>

        {/* Features */}
        {(restaurant.features.delivery || restaurant.features.takeout || restaurant.features.dineIn) && (
          <div className="flex gap-2 flex-wrap">
            {restaurant.features.dineIn && (
              <span className="text-xs px-2 py-0.5 bg-[var(--color-primary-lighter)] text-[var(--color-cream)] opacity-80">
                Dine-in
              </span>
            )}
            {restaurant.features.takeout && (
              <span className="text-xs px-2 py-0.5 bg-[var(--color-primary-lighter)] text-[var(--color-cream)] opacity-80">
                Takeout
              </span>
            )}
            {restaurant.features.delivery && (
              <span className="text-xs px-2 py-0.5 bg-[var(--color-primary-lighter)] text-[var(--color-cream)] opacity-80">
                Delivery
              </span>
            )}
          </div>
        )}

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
  );
}
