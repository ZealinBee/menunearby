'use client';

import { useEffect } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import { useRestaurantDetails } from '@/hooks/useRestaurantDetails';
import { useMenuScrape } from '@/hooks/useMenuScrape';
import { MenuSection } from '@/components/menu/MenuSection';
import {
  ArrowLeft,
  Star,
  MapPin,
  Phone,
  Globe,
  Clock,
  ExternalLink,
  UtensilsCrossed,
  Loader2,
} from 'lucide-react';

function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
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

export default function RestaurantDetailsPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const placeId = params.id as string;

  const userLat = searchParams.get('lat') ? parseFloat(searchParams.get('lat')!) : null;
  const userLon = searchParams.get('lon') ? parseFloat(searchParams.get('lon')!) : null;

  const { restaurant, isLoading, error } = useRestaurantDetails(placeId);
  const {
    menu,
    isLoading: menuLoading,
    error: menuError,
    sourceUrl,
    cached,
    fetchMenu,
    refetch
  } = useMenuScrape(placeId, restaurant?.website);

  const distance =
    restaurant && userLat && userLon
      ? calculateDistance(userLat, userLon, restaurant.lat, restaurant.lon)
      : null;

  const handleBack = () => {
    router.back();
  };

  const hasWebsite = Boolean(restaurant?.website);
  const menuRequested = menu || menuLoading || menuError;

  // Automatically fetch menu when restaurant details load
  useEffect(() => {
    if (restaurant?.website && !menu && !menuLoading && !menuError) {
      fetchMenu();
    }
  }, [restaurant?.website, menu, menuLoading, menuError, fetchMenu]);

  if (isLoading) {
    return <LoadingSkeleton />;
  }

  if (error || !restaurant) {
    return (
      <div className="min-h-screen bg-[var(--color-primary)] flex items-center justify-center">
        <div className="text-center">
          <p className="text-[var(--color-cream)] mb-4">{error || 'Restaurant not found'}</p>
          <button onClick={handleBack} className="btn btn-secondary">
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--color-primary)]">
      {/* Back Button Header */}
      <header className="border-b border-[var(--color-primary-lighter)]">
        <div className="max-w-6xl mx-auto px-4 sm:px-8 py-4">
          <button
            onClick={handleBack}
            className="flex items-center gap-2 text-[var(--color-cream)] hover:text-[var(--color-accent)] transition-colors"
          >
            <ArrowLeft className="w-5 h-5" strokeWidth={1.5} />
            <span>Back to results</span>
          </button>
        </div>
      </header>


      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 sm:px-8 py-8 sm:py-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 lg:gap-12">
          {/* Left Column - Main Info */}
          <div className="lg:col-span-2 space-y-8">
            {/* Title Section */}
            <div>
              <div className="flex flex-wrap items-center gap-3 mb-3">
                <span className="text-label text-[var(--color-accent)]">
                  {restaurant.cuisine}
                </span>
                {restaurant.isOpen !== null && (
                  <span
                    className={`px-2 py-0.5 flex items-center gap-1 text-xs ${
                      restaurant.isOpen
                        ? 'bg-green-900/90 text-green-300'
                        : 'bg-red-900/90 text-red-300'
                    }`}
                  >
                    <Clock className="w-3 h-3" strokeWidth={2} />
                    {restaurant.isOpen ? 'Open' : 'Closed'}
                  </span>
                )}
              </div>
              <h1 className="text-2xl sm:text-3xl lg:text-4xl text-[var(--color-white)] mb-3">
                {restaurant.name}
              </h1>
              <div className="flex flex-wrap items-center gap-4 text-[var(--color-cream)] opacity-70">
                {restaurant.rating > 0 && (
                  <span className="flex items-center gap-1.5">
                    <Star
                      className="w-4 h-4 text-[var(--color-gold)] fill-[var(--color-gold)]"
                      strokeWidth={1.5}
                    />
                    <span className="text-[var(--color-white)] font-medium">
                      {restaurant.rating.toFixed(1)}
                    </span>
                    {restaurant.userRatingCount > 0 && (
                      <span className="text-[var(--color-cream)] opacity-70">
                        ({restaurant.userRatingCount.toLocaleString()})
                      </span>
                    )}
                  </span>
                )}
                {distance && (
                  <span className="flex items-center gap-1.5">
                    <MapPin className="w-4 h-4" strokeWidth={1.5} />
                    {formatDistance(distance)} away
                  </span>
                )}
                {restaurant.priceLevel && (
                  <span className="text-[var(--color-gold)]">{restaurant.priceLevel}</span>
                )}
              </div>
            </div>

            {/* Description */}
            {restaurant.description && (
              <div>
                <h2 className="text-lg text-[var(--color-white)] mb-3">About</h2>
                <p className="text-[var(--color-cream)] opacity-80 leading-relaxed">
                  {restaurant.description}
                </p>
              </div>
            )}

            {/* Menu Section */}
            {hasWebsite && (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg text-[var(--color-white)]">Menu</h2>
                  {menu && (
                    <button
                      onClick={refetch}
                      disabled={menuLoading}
                      className="text-sm text-[var(--color-accent)] hover:text-[var(--color-accent-light)] transition-colors"
                    >
                      Refresh
                    </button>
                  )}
                </div>

                {!menuRequested ? (
                  <button
                    onClick={fetchMenu}
                    className="flex items-center gap-2 px-4 py-3 bg-[var(--color-accent)] text-white font-medium hover:bg-[var(--color-accent)]/90 transition-colors"
                  >
                    <UtensilsCrossed className="w-4 h-4" strokeWidth={2} />
                    Fetch Menu
                  </button>
                ) : menuLoading ? (
                  <div className="bg-[var(--color-primary-light)] p-6">
                    <div className="flex items-center gap-3 text-[var(--color-cream)] opacity-60">
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>Fetching menu from website...</span>
                    </div>
                  </div>
                ) : menuError ? (
                  <div className="bg-[var(--color-primary-light)] p-6">
                    <p className="text-[var(--color-cream)] opacity-60 mb-4">{menuError}</p>
                    <div className="flex flex-wrap gap-3">
                      <button
                        onClick={fetchMenu}
                        className="px-4 py-2 bg-[var(--color-accent)] text-white text-sm font-medium hover:bg-[var(--color-accent)]/90 transition-colors"
                      >
                        Try Again
                      </button>
                      <a
                        href={restaurant.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-4 py-2 bg-[var(--color-primary-lighter)] text-[var(--color-cream)] text-sm font-medium hover:bg-[var(--color-primary-lighter)]/80 transition-colors"
                      >
                        Visit Website
                      </a>
                    </div>
                  </div>
                ) : menu ? (
                  <div className="bg-[var(--color-primary-light)] p-6">
                    {menu.sections.length > 0 ? (
                      <div className="space-y-6">
                        {menu.sections.map((section, index) => (
                          <MenuSection key={`${section.title}-${index}`} section={section} />
                        ))}
                      </div>
                    ) : menu.rawText ? (
                      <pre className="whitespace-pre-wrap text-sm text-[var(--color-cream)] opacity-80 font-sans">
                        {menu.rawText}
                      </pre>
                    ) : null}

                    {/* Menu footer */}
                    <div className="mt-6 pt-4 border-t border-[var(--color-primary-lighter)]">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-sm text-[var(--color-cream)] opacity-50">
                        <div className="flex items-center gap-2">
                          {cached && <span className="text-xs">(cached)</span>}
                          <span>
                            Updated: {new Date(menu.scrapedAt).toLocaleDateString()}
                          </span>
                        </div>
                        {sourceUrl && (
                          <a
                            href={sourceUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[var(--color-accent)] hover:text-[var(--color-accent-light)] transition-colors"
                          >
                            View Original
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                ) : null}
              </div>
            )}
          </div>

          {/* Right Column - Contact & Hours */}
          <div className="space-y-6">
            {/* Contact Card */}
            <div className="card font-readable">
              <h3 className="text-lg text-[var(--color-white)] mb-4">Contact & Location</h3>
              <div className="space-y-4">
                {/* Address */}
                <div className="flex items-start gap-3">
                  <MapPin
                    className="w-5 h-5 text-[var(--color-accent)] flex-shrink-0 mt-0.5"
                    strokeWidth={1.5}
                  />
                  <div>
                    <p className="text-[var(--color-cream)]">{restaurant.address}</p>
                    <a
                      href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(restaurant.address)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[var(--color-accent)] text-sm hover:text-[var(--color-accent-light)] inline-flex items-center gap-1 mt-1"
                    >
                      Open in Maps
                      <ExternalLink className="w-3.5 h-3.5" strokeWidth={2} />
                    </a>
                  </div>
                </div>

                {/* Phone */}
                {restaurant.phone && (
                  <div className="flex items-center gap-3">
                    <Phone
                      className="w-5 h-5 text-[var(--color-accent)] flex-shrink-0"
                      strokeWidth={1.5}
                    />
                    <a
                      href={`tel:${restaurant.phone}`}
                      className="text-[var(--color-cream)] hover:text-[var(--color-accent)] transition-colors"
                    >
                      {restaurant.phone}
                    </a>
                  </div>
                )}

                {/* Website */}
                {restaurant.website && (
                  <div className="flex items-center gap-3">
                    <Globe
                      className="w-5 h-5 text-[var(--color-accent)] flex-shrink-0"
                      strokeWidth={1.5}
                    />
                    <a
                      href={restaurant.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[var(--color-cream)] hover:text-[var(--color-accent)] transition-colors truncate"
                    >
                      {new URL(restaurant.website).hostname}
                    </a>
                  </div>
                )}
              </div>
            </div>

            {/* Opening Hours */}
            {restaurant.openingHours && restaurant.openingHours.weekdayDescriptions.length > 0 && (
              <div className="card font-readable">
                <h3 className="text-lg text-[var(--color-white)] mb-4">Opening Hours</h3>
                <div className="space-y-2">
                  {restaurant.openingHours.weekdayDescriptions.map((day, index) => {
                    const [dayName, ...hours] = day.split(': ');
                    const hoursText = hours.join(': ');
                    const today = new Date().getDay();
                    // Google returns Monday first, JS Date returns Sunday first
                    const isToday = (index + 1) % 7 === today;

                    return (
                      <div
                        key={index}
                        className={`flex justify-between text-sm py-1 ${
                          isToday
                            ? 'text-[var(--color-accent)] font-medium'
                            : 'text-[var(--color-cream)] opacity-70'
                        }`}
                      >
                        <span>{dayName}</span>
                        <span className="text-right">{hoursText || 'Closed'}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

        </div>
      </main>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="min-h-screen bg-[var(--color-primary)]">
      {/* Header skeleton */}
      <header className="border-b border-[var(--color-primary-lighter)]">
        <div className="max-w-6xl mx-auto px-4 sm:px-8 py-4">
          <div className="w-32 h-6 bg-[var(--color-primary-lighter)] animate-pulse" />
        </div>
      </header>


      {/* Content skeleton */}
      <main className="max-w-6xl mx-auto px-4 sm:px-8 py-8 sm:py-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 lg:gap-12">
          <div className="lg:col-span-2 space-y-6">
            <div className="space-y-3">
              <div className="w-24 h-4 bg-[var(--color-primary-lighter)] animate-pulse" />
              <div className="w-64 h-8 bg-[var(--color-primary-lighter)] animate-pulse" />
              <div className="w-40 h-4 bg-[var(--color-primary-lighter)] animate-pulse" />
            </div>
            <div className="space-y-2">
              <div className="w-full h-4 bg-[var(--color-primary-lighter)] animate-pulse" />
              <div className="w-3/4 h-4 bg-[var(--color-primary-lighter)] animate-pulse" />
            </div>
          </div>
          <div className="space-y-6">
            <div className="card">
              <div className="space-y-4">
                <div className="w-32 h-6 bg-[var(--color-primary-lighter)] animate-pulse" />
                <div className="w-full h-4 bg-[var(--color-primary-lighter)] animate-pulse" />
                <div className="w-2/3 h-4 bg-[var(--color-primary-lighter)] animate-pulse" />
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
