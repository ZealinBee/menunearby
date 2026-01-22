"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Search, MapPin, Loader2, X, Navigation } from "lucide-react";

interface LocationResult {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
  address?: {
    city?: string;
    town?: string;
    village?: string;
    municipality?: string;
    county?: string;
    postcode?: string;
    road?: string;
    house_number?: string;
  };
}

interface LocationSearchProps {
  onLocationSelect?: (location: LocationResult) => void;
  placeholder?: string;
}

// Format location name for display (utility function)
function formatLocationName(location: LocationResult): string {
  const addr = location.address;
  if (!addr) return location.display_name.split(",")[0];

  const city = addr.city || addr.town || addr.village || addr.municipality;
  const parts: string[] = [];

  if (addr.road) {
    parts.push(addr.house_number ? `${addr.road} ${addr.house_number}` : addr.road);
  }
  if (city) parts.push(city);

  return parts.length > 0 ? parts.join(", ") : location.display_name.split(",")[0];
}

// Get subtitle for result item (utility function)
function getLocationSubtitle(location: LocationResult): string {
  const addr = location.address;
  if (!addr) return "Finland";

  const parts: string[] = [];
  if (addr.county) parts.push(addr.county);
  if (addr.postcode) parts.push(addr.postcode);

  return parts.length > 0 ? parts.join(" • ") : "Finland";
}

// Custom debounce hook
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

export default function LocationSearch({
  onLocationSelect,
  placeholder = "Search for a location in Finland..."
}: LocationSearchProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<LocationResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isGeoLoading, setIsGeoLoading] = useState(false);
  const [geoError, setGeoError] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<LocationResult | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const debouncedQuery = useDebounce(query, 300);

  // Reverse geocode coordinates to get address
  const reverseGeocode = useCallback(async (lat: number, lon: number): Promise<LocationResult | null> => {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?` +
        new URLSearchParams({
          lat: lat.toString(),
          lon: lon.toString(),
          format: "json",
          addressdetails: "1",
        }),
        {
          headers: {
            "Accept-Language": "en",
          },
        }
      );

      if (!response.ok) throw new Error("Reverse geocode failed");

      const data = await response.json();
      return data as LocationResult;
    } catch (error) {
      console.error("Reverse geocode error:", error);
      return null;
    }
  }, []);

  // Get user's current location
  const getUserLocation = useCallback(async () => {
    if (!navigator.geolocation) {
      setGeoError("Geolocation is not supported by your browser");
      return;
    }

    setIsGeoLoading(true);
    setGeoError(null);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;

        // Reverse geocode to get address
        const location = await reverseGeocode(latitude, longitude);

        if (location) {
          setSelectedLocation(location);
          setQuery(formatLocationName(location));
          onLocationSelect?.(location);
        } else {
          // If reverse geocode fails, create a basic location object
          const basicLocation: LocationResult = {
            place_id: Date.now(),
            display_name: `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`,
            lat: latitude.toString(),
            lon: longitude.toString(),
          };
          setSelectedLocation(basicLocation);
          setQuery("Current Location");
          onLocationSelect?.(basicLocation);
        }

        setIsGeoLoading(false);
      },
      (error) => {
        setIsGeoLoading(false);
        switch (error.code) {
          case error.PERMISSION_DENIED:
            setGeoError("Location access denied. Please enable location permissions.");
            break;
          case error.POSITION_UNAVAILABLE:
            setGeoError("Location information unavailable.");
            break;
          case error.TIMEOUT:
            setGeoError("Location request timed out.");
            break;
          default:
            setGeoError("An error occurred getting your location.");
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 300000, // Cache for 5 minutes
      }
    );
  }, [reverseGeocode, onLocationSelect]);

  // Search for locations using Nominatim API
  const searchLocations = useCallback(async (searchQuery: string) => {
    if (!searchQuery || searchQuery.length < 2) {
      setResults([]);
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?` +
        new URLSearchParams({
          q: searchQuery,
          format: "json",
          addressdetails: "1",
          limit: "6",
          countrycodes: "fi", // Restrict to Finland
        }),
        {
          headers: {
            "Accept-Language": "en",
          },
        }
      );

      if (!response.ok) throw new Error("Search failed");

      const data: LocationResult[] = await response.json();
      setResults(data);
      setIsOpen(data.length > 0);
    } catch (error) {
      console.error("Location search error:", error);
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Trigger search when debounced query changes
  useEffect(() => {
    if (debouncedQuery && !selectedLocation) {
      searchLocations(debouncedQuery);
    }
  }, [debouncedQuery, searchLocations, selectedLocation]);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = (location: LocationResult) => {
    setSelectedLocation(location);
    setQuery(formatLocationName(location));
    setIsOpen(false);
    setResults([]);
    onLocationSelect?.(location);
  };

  const handleClear = () => {
    setQuery("");
    setSelectedLocation(null);
    setResults([]);
    setIsOpen(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value);
    setSelectedLocation(null);
    if (e.target.value.length >= 2) {
      setIsOpen(true);
    }
  };

  return (
    <div ref={wrapperRef} className="relative w-full max-w-xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center bg-[var(--color-primary-light)] border border-[var(--color-primary-lighter)]">
        <div className="flex items-center gap-3 px-4 sm:px-5 py-3 sm:py-4 flex-1">
          {isLoading ? (
            <Loader2 className="w-5 h-5 text-[var(--color-accent)] animate-spin flex-shrink-0" strokeWidth={1.5} />
          ) : (
            <Search className="w-5 h-5 text-[var(--color-primary-lighter)] flex-shrink-0" strokeWidth={1.5} />
          )}
          <input
            type="text"
            value={query}
            onChange={handleInputChange}
            onFocus={() => results.length > 0 && setIsOpen(true)}
            placeholder={placeholder}
            className="bg-transparent border-none outline-none text-[var(--color-cream)] placeholder:text-[var(--color-cream)] placeholder:opacity-50 w-full text-base"
            autoComplete="off"
          />
          {query && (
            <button
              onClick={handleClear}
              className="p-1 hover:bg-[var(--color-primary-lighter)] transition-colors flex-shrink-0"
              aria-label="Clear search"
            >
              <X className="w-4 h-4 text-[var(--color-primary-lighter)]" strokeWidth={1.5} />
            </button>
          )}
        </div>
        <button
          className="btn btn-primary w-full sm:w-auto px-6 sm:px-8 py-3 sm:py-4 sm:mr-3"
          onClick={() => selectedLocation && onLocationSelect?.(selectedLocation)}
        >
          Search
        </button>
      </div>

      {/* Use My Location Button */}
      <button
        onClick={getUserLocation}
        disabled={isGeoLoading}
        className="flex items-center justify-center gap-2 mt-3 mx-auto text-sm text-[var(--color-cream)] opacity-70 hover:opacity-100 hover:text-[var(--color-accent)] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isGeoLoading ? (
          <Loader2 className="w-4 h-4 animate-spin" strokeWidth={1.5} />
        ) : (
          <Navigation className="w-4 h-4" strokeWidth={1.5} />
        )}
        {isGeoLoading ? "Getting location..." : "Use my current location"}
      </button>

      {/* Geolocation Error */}
      {geoError && (
        <p className="text-sm text-red-400 text-center mt-2">
          {geoError}
        </p>
      )}

      {/* Dropdown Results */}
      {isOpen && results.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-[var(--color-primary-light)] border border-[var(--color-primary-lighter)] z-50 max-h-80 overflow-y-auto">
          {results.map((result) => (
            <button
              key={result.place_id}
              onClick={() => handleSelect(result)}
              className="w-full px-5 py-3 text-left hover:bg-[var(--color-primary-lighter)] transition-colors flex items-start gap-3 border-b border-[var(--color-primary-lighter)] last:border-b-0"
            >
              <MapPin className="w-5 h-5 text-[var(--color-accent)] mt-0.5 flex-shrink-0" strokeWidth={1.5} />
              <div className="min-w-0">
                <p className="text-[var(--color-white)] truncate">
                  {formatLocationName(result)}
                </p>
                <p className="text-sm text-[var(--color-cream)] opacity-60 truncate">
                  {getLocationSubtitle(result)}
                </p>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* No results message */}
      {isOpen && query.length >= 2 && results.length === 0 && !isLoading && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-[var(--color-primary-light)] border border-[var(--color-primary-lighter)] z-50 px-5 py-4">
          <p className="text-[var(--color-cream)] opacity-60 text-center">
            No locations found in Finland
          </p>
        </div>
      )}
    </div>
  );
}
