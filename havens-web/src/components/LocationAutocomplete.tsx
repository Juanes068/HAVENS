import React, { useState, useEffect, useRef } from 'react';

export interface LocationResult {
  neighbourhood: string;
  cityName: string;
  latitude: number | null;
  longitude: number | null;
  formattedAddress: string;
}

interface LocationAutocompleteProps {
  onSelectLocation: (location: LocationResult | null) => void;
  placeholder?: string;
  initialValue?: string;
}

export const LocationAutocomplete: React.FC<LocationAutocompleteProps> = ({
  onSelectLocation,
  placeholder = 'Search neighborhood or city (e.g. Milenta, Bogotá)',
  initialValue = '',
}) => {
  const [query, setQuery] = useState(initialValue);
  const [suggestions, setSuggestions] = useState<LocationResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<LocationResult | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const googleApiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch real global location suggestions as user types
  useEffect(() => {
    if (!query || query.trim().length < 2) {
      setSuggestions([]);
      return;
    }

    // If user modified text after selecting a location, reset selection validation
    if (selectedLocation && query !== selectedLocation.formattedAddress) {
      setSelectedLocation(null);
      onSelectLocation(null);
    }

    const timer = setTimeout(async () => {
      setIsLoading(true);
      try {
        if (googleApiKey) {
          // Google Places Autocomplete API query
          const response = await fetch(
            `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(
              query
            )}&types=(cities)&key=${googleApiKey}`
          );
          const data = await response.json();
          if (data.predictions) {
            const googleResults: LocationResult[] = data.predictions.map((p: any) => ({
              neighbourhood: p.structured_formatting?.main_text || p.description,
              cityName: p.structured_formatting?.secondary_text || p.description,
              latitude: null,
              longitude: null,
              formattedAddress: p.description,
            }));
            setSuggestions(googleResults);
            setIsOpen(true);
          }
        } else {
          // Graceful fallback: OpenStreetMap Nominatim Live Global Places API
          const response = await fetch(
            `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
              query
            )}&addressdetails=1&limit=5`
          );
          const data = await response.json();
          if (Array.isArray(data)) {
            const osmResults: LocationResult[] = data.map((item: any) => {
              const name =
                item.address?.suburb ||
                item.address?.neighbourhood ||
                item.address?.quarter ||
                item.name ||
                item.display_name.split(',')[0];
              const city =
                item.address?.city ||
                item.address?.town ||
                item.address?.county ||
                item.address?.state ||
                '';

              return {
                neighbourhood: name,
                cityName: city,
                latitude: item.lat ? parseFloat(item.lat) : null,
                longitude: item.lon ? parseFloat(item.lon) : null,
                formattedAddress: item.display_name,
              };
            });
            setSuggestions(osmResults);
            setIsOpen(true);
          }
        }
      } catch (err) {
        console.warn('[LocationAutocomplete] Error fetching place suggestions:', err);
      } finally {
        setIsLoading(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query, googleApiKey]);

  const handleSelect = (result: LocationResult) => {
    setSelectedLocation(result);
    setQuery(result.formattedAddress);
    setSuggestions([]);
    setIsOpen(false);
    onSelectLocation(result);
  };

  const handleClear = () => {
    setQuery('');
    setSelectedLocation(null);
    setSuggestions([]);
    onSelectLocation(null);
  };

  return (
    <div className="relative w-full" ref={dropdownRef}>
      <div className="relative">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => {
            if (suggestions.length > 0) setIsOpen(true);
          }}
          placeholder={placeholder}
          className={`w-full px-4 py-2.5 rounded-xl bg-white border text-[#2C2C2C] text-sm focus:outline-none transition-colors ${
            selectedLocation
              ? 'border-[#2D5A3D] pr-10'
              : query.length > 2
              ? 'border-amber-400 focus:border-amber-500'
              : 'border-[#E2DBD0] focus:border-[#2D5A3D]'
          }`}
        />

        {selectedLocation ? (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[#2D5A3D] font-bold bg-[#eaf3ed] px-1.5 py-0.5 rounded-md cursor-pointer"
            title="Clear selected location"
          >
            ✓ Verified
          </button>
        ) : isLoading ? (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[#8a8278] animate-spin">
            ⌛
          </span>
        ) : null}
      </div>

      {/* Validation Status Indicator */}
      {query.length > 2 && !selectedLocation && (
        <p className="text-[11px] text-amber-700 mt-1 font-medium flex items-center gap-1">
          ⚠️ Please select a valid location from the suggestions dropdown to enable registration.
        </p>
      )}

      {/* Place Suggestions Dropdown */}
      {isOpen && suggestions.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-[#E2DBD0] rounded-xl shadow-lg max-h-56 overflow-y-auto divide-y divide-[#E2DBD0]/40">
          {suggestions.map((item, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => handleSelect(item)}
              className="w-full px-4 py-2.5 text-left text-xs hover:bg-[#F4EEE2] transition-colors flex items-start gap-2 cursor-pointer"
            >
              <span className="text-sm">📍</span>
              <div>
                <p className="font-semibold text-charcoal">{item.neighbourhood}</p>
                <p className="text-[11px] text-[#8a8278] truncate">{item.formattedAddress}</p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
