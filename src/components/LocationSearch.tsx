"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Search, MapPin, Loader2, X, Navigation } from "lucide-react";

interface LocationSuggestion {
  placeId: string;
  mainText: string;
  secondaryText: string;
  fullText: string;
}

interface GeocodedLocation {
  lat: number;
  lon: number;
  address: string;
  name: string;
}

export interface SelectedLocation {
  lat: number;
  lon: number;
  name: string;
  address: string;
}

interface LocationSearchProps {
  onLocationSelect?: (location: SelectedLocation) => void;
  placeholder?: string;
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
  const [suggestions, setSuggestions] = useState<LocationSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isGeoLoading, setIsGeoLoading] = useState(false);
  const [geoError, setGeoError] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<SelectedLocation | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const debouncedQuery = useDebounce(query, 300);

  // Reverse geocode coordinates using Nominatim (for current location only)
  const reverseGeocode = useCallback(async (lat: number, lon: number): Promise<SelectedLocation | null> => {
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
      const addr = data.address;
      const city = addr?.city || addr?.town || addr?.village || addr?.municipality;

      return {
        lat,
        lon,
        name: city || "Current Location",
        address: data.display_name?.split(",").slice(0, 3).join(", ") || "",
      };
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

        const location = await reverseGeocode(latitude, longitude);

        if (location) {
          setSelectedLocation(location);
          setQuery(location.name);
          onLocationSelect?.(location);
        } else {
          const basicLocation: SelectedLocation = {
            lat: latitude,
            lon: longitude,
            name: "Current Location",
            address: `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`,
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
        maximumAge: 300000,
      }
    );
  }, [reverseGeocode, onLocationSelect]);

  // Search for locations using Google Places Autocomplete
  const searchLocations = useCallback(async (searchQuery: string) => {
    if (!searchQuery || searchQuery.length < 2) {
      setSuggestions([]);
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch("/api/places/autocomplete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: searchQuery }),
      });

      if (!response.ok) throw new Error("Search failed");

      const data = await response.json();
      setSuggestions(data.suggestions || []);
      setIsOpen((data.suggestions?.length ?? 0) > 0);
    } catch (error) {
      console.error("Location search error:", error);
      setSuggestions([]);
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

  const handleSelect = async (suggestion: LocationSuggestion) => {
    setIsLoading(true);
    setIsOpen(false);
    setQuery(suggestion.mainText);

    try {
      const response = await fetch(`/api/places/geocode/${suggestion.placeId}`);

      if (!response.ok) throw new Error("Geocode failed");

      const data: GeocodedLocation = await response.json();

      const location: SelectedLocation = {
        lat: data.lat,
        lon: data.lon,
        name: data.name || suggestion.mainText,
        address: data.address || suggestion.secondaryText,
      };

      setSelectedLocation(location);
      setSuggestions([]);
      onLocationSelect?.(location);
    } catch (error) {
      console.error("Geocode error:", error);
      setGeoError("Failed to get location details. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleClear = () => {
    setQuery("");
    setSelectedLocation(null);
    setSuggestions([]);
    setIsOpen(false);
    setGeoError(null);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value);
    setSelectedLocation(null);
    setGeoError(null);
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
            onFocus={() => suggestions.length > 0 && setIsOpen(true)}
            placeholder={placeholder}
            className="bg-transparent border-none outline-none text-[var(--color-cream)] placeholder:text-[var(--color-cream)] placeholder:opacity-70 w-full text-base"
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
      {isOpen && suggestions.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-[var(--color-primary-light)] border border-[var(--color-primary-lighter)] z-50 max-h-80 overflow-y-auto">
          {suggestions.map((suggestion) => (
            <button
              key={suggestion.placeId}
              onClick={() => handleSelect(suggestion)}
              className="w-full px-5 py-3 text-left hover:bg-[var(--color-primary-lighter)] transition-colors flex items-start gap-3 border-b border-[var(--color-primary-lighter)] last:border-b-0"
            >
              <MapPin className="w-5 h-5 text-[var(--color-accent)] mt-0.5 flex-shrink-0" strokeWidth={1.5} />
              <div className="min-w-0">
                <p className="text-[var(--color-white)] truncate">
                  {suggestion.mainText}
                </p>
                <p className="text-sm text-[var(--color-cream)] opacity-60 truncate">
                  {suggestion.secondaryText}
                </p>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* No results message */}
      {isOpen && query.length >= 2 && suggestions.length === 0 && !isLoading && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-[var(--color-primary-light)] border border-[var(--color-primary-lighter)] z-50 px-5 py-4">
          <p className="text-[var(--color-cream)] opacity-60 text-center">
            No locations found in Finland
          </p>
        </div>
      )}
    </div>
  );
}
