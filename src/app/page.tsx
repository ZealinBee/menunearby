"use client";

import { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { MapPin, ArrowLeft } from "lucide-react";
import LocationSearch from "@/components/LocationSearch";
import RestaurantList from "@/components/RestaurantList";

interface SelectedLocation {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
}

function HomeContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Read location from URL params
  const lat = searchParams.get("lat");
  const lon = searchParams.get("lon");
  const displayName = searchParams.get("location");

  const selectedLocation: SelectedLocation | null =
    lat && lon && displayName
      ? { place_id: 0, display_name: displayName, lat, lon }
      : null;

  const handleLocationSelect = (location: SelectedLocation) => {
    // Store location in URL params so it persists on navigation
    router.push(
      `/?lat=${location.lat}&lon=${location.lon}&location=${encodeURIComponent(location.display_name)}`
    );
  };

  const handleViewDetails = (restaurantId: string) => {
    if (selectedLocation) {
      router.push(
        `/restaurant/${encodeURIComponent(restaurantId)}?lat=${selectedLocation.lat}&lon=${selectedLocation.lon}`
      );
    }
  };

  const handleBackToSearch = () => {
    router.push("/");
  };

  // Show restaurant list when location is selected
  if (selectedLocation) {
    return (
      <div className="min-h-screen bg-[var(--color-primary)]">
        {/* Back Button Header */}
        <header className="border-b border-[var(--color-primary-lighter)]">
          <div className="max-w-6xl mx-auto px-4 sm:px-8 py-4">
            <button
              onClick={handleBackToSearch}
              className="flex items-center gap-2 text-[var(--color-cream)] hover:text-[var(--color-accent)] transition-colors"
            >
              <ArrowLeft className="w-5 h-5" strokeWidth={1.5} />
              <span>Back to search</span>
            </button>
          </div>
        </header>

        {/* Location Info */}
        <div className="bg-[var(--color-primary-light)] border-b border-[var(--color-primary-lighter)]">
          <div className="max-w-6xl mx-auto px-4 sm:px-8 py-4">
            <div className="flex items-center gap-2 text-sm text-[var(--color-cream)] opacity-70">
              <MapPin className="w-4 h-4" strokeWidth={1.5} />
              <span>{selectedLocation.display_name.split(",").slice(0, 2).join(", ")}</span>
            </div>
          </div>
        </div>

        <RestaurantList
          userLat={parseFloat(selectedLocation.lat)}
          userLon={parseFloat(selectedLocation.lon)}
          onViewDetails={handleViewDetails}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--color-primary)]">
      {/* Hero Section with Background Image Overlay */}
      <section
        className="relative min-h-screen flex items-center justify-center"
        style={{
          backgroundImage: 'url("https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=1920&q=80")',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        {/* Dark overlay */}
        <div className="absolute inset-0 bg-[var(--color-primary)] opacity-90" />

        {/* Content */}
        <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-8 text-center">
          <span className="text-label text-[var(--color-accent)] mb-4 block">
            Mood to eat out?
          </span>
          <h1 className="text-display text-[var(--color-white)] mb-6">
            Find Nearby Restaurants & Their Menus
          </h1>
          <p className="font-accent text-base sm:text-lg text-[var(--color-cream)] opacity-80 max-w-2xl mx-auto mb-8 sm:mb-10">
            Discover what&apos;s cooking around you. Browse menus, check prices, and pick your next meal. Finland only.
          </p>

          {/* Location Search Bar */}
          <LocationSearch onLocationSelect={handleLocationSelect} />
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[var(--color-primary-lighter)] py-8 sm:py-12">
        <div className="max-w-6xl mx-auto px-4 sm:px-8 text-center">
          <p className="text-[var(--color-cream)] opacity-60 text-sm mb-2">
            All restaurant data powered by Google Maps
          </p>
          <p className="text-[var(--color-cream)] opacity-40 text-sm">
            © {new Date().getFullYear()} Zhiyuan Liu. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}

export default function Home() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[var(--color-primary)] flex items-center justify-center">
        <div className="text-[var(--color-cream)]">Loading...</div>
      </div>
    }>
      <HomeContent />
    </Suspense>
  );
}
