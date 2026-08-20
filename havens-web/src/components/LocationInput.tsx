import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useLoadScript } from '@react-google-maps/api';

export interface LocationData {
  formatted_address: string;
  lat: number;
  lng: number;
  cityName?: string;
  neighbourhood?: string;
  // Aliases for seamless compatibility across forms
  formattedAddress?: string;
  latitude?: number;
  longitude?: number;
  address?: string;
  name?: string;
}

export interface LocationInputProps {
  onSelectLocation?: (location: LocationData | null) => void;
  onLocationSelect?: (location: LocationData | null) => void;
  placeholder?: string;
  initialValue?: string;
  initialLocation?: LocationData | string | null;
  className?: string;
  required?: boolean;
}

interface PlacePrediction {
  place_id?: string;
  description: string;
  main_text: string;
  secondary_text?: string;
  lat?: number;
  lng?: number;
}

export const LocationInput: React.FC<LocationInputProps> = ({
  onSelectLocation,
  onLocationSelect,
  placeholder = 'Search address, neighbourhood or city (e.g. Kitsilano Beach, Vancouver)',
  initialValue = '',
  initialLocation = null,
  className = '',
  required = false,
}) => {
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';

  const { isLoaded } = useLoadScript({
    googleMapsApiKey: apiKey,
  });

  const getInitialString = () => {
    if (initialValue) return initialValue;
    if (typeof initialLocation === 'string') return initialLocation;
    if (initialLocation && typeof initialLocation === 'object') {
      return initialLocation.formatted_address || initialLocation.address || initialLocation.name || '';
    }
    return '';
  };

  const getInitialData = (): LocationData | null => {
    const initStr = getInitialString();
    if (!initStr) return null;

    if (initialLocation && typeof initialLocation === 'object') {
      const lat = initialLocation.lat ?? initialLocation.latitude ?? 0;
      const lng = initialLocation.lng ?? initialLocation.longitude ?? 0;
      return {
        formatted_address: initStr,
        formattedAddress: initStr,
        address: initStr,
        name: initialLocation.name || initStr,
        lat,
        lng,
        latitude: lat,
        longitude: lng,
        cityName: initialLocation.cityName,
        neighbourhood: initialLocation.neighbourhood,
      };
    }

    return {
      formatted_address: initStr,
      formattedAddress: initStr,
      address: initStr,
      lat: 0,
      lng: 0,
      latitude: 0,
      longitude: 0,
    };
  };

  const [inputValue, setInputValue] = useState(getInitialString());
  const [selectedLocation, setSelectedLocation] = useState<LocationData | null>(getInitialData());
  const [predictions, setPredictions] = useState<PlacePrediction[]>([]);
  const [isLoadingPredictions, setIsLoadingPredictions] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);

  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const geocoderRef = useRef<google.maps.Geocoder | null>(null);

  const notifySelectLocation = useCallback(
    (loc: LocationData | null) => {
      if (typeof onSelectLocation === 'function') {
        onSelectLocation(loc);
      }
      if (typeof onLocationSelect === 'function') {
        onLocationSelect(loc);
      }
    },
    [onSelectLocation, onLocationSelect]
  );

  // Sync initialValue / initialLocation changes
  useEffect(() => {
    const initStr = getInitialString();
    if (initStr && initStr !== inputValue) {
      setInputValue(initStr);
      setSelectedLocation(getInitialData());
    }
  }, [initialValue, initialLocation]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Initialize Geocoder once Google Maps JS is loaded
  useEffect(() => {
    if (isLoaded && window.google?.maps?.Geocoder) {
      geocoderRef.current = new window.google.maps.Geocoder();
    }
  }, [isLoaded]);

  // Safe modern asynchronous prediction fetcher (Photon / OpenStreetMap Geocoding API)
  const fetchPredictions = useCallback(async (query: string) => {
    if (!query || query.trim().length < 2) {
      setPredictions([]);
      setIsDropdownOpen(false);
      setIsLoadingPredictions(false);
      return;
    }

    setIsLoadingPredictions(true);

    try {
      const res = await fetch(
        `https://photon.komoot.io/api/?q=${encodeURIComponent(query)}&limit=6`
      );
      if (res.ok) {
        const data = await res.json();
        if (data && data.features && data.features.length > 0) {
          const list: PlacePrediction[] = data.features.map((f: any) => {
            const props = f.properties || {};
            const name = props.name || props.street || '';
            const city = props.city || props.town || props.state || '';
            const country = props.country || '';
            const sub = [city, country].filter(Boolean).join(', ');
            const full = [name, sub].filter(Boolean).join(', ');

            return {
              place_id: String(props.osm_id || Math.random()),
              description: full || query,
              main_text: name || city || query,
              secondary_text: sub,
              lat: f.geometry?.coordinates ? f.geometry.coordinates[1] : undefined,
              lng: f.geometry?.coordinates ? f.geometry.coordinates[0] : undefined,
            };
          });

          setPredictions(list);
          setIsDropdownOpen(true);
          setHighlightedIndex(-1);
          setIsLoadingPredictions(false);
          return;
        }
      }

      // Fallback: Google Maps Geocoder if available
      if (geocoderRef.current) {
        geocoderRef.current.geocode({ address: query }, (results, status) => {
          setIsLoadingPredictions(false);
          if (status === 'OK' && results && results.length > 0) {
            const list: PlacePrediction[] = results.slice(0, 5).map((r) => ({
              place_id: r.place_id,
              description: r.formatted_address,
              main_text: r.formatted_address.split(',')[0],
              secondary_text: r.formatted_address.split(',').slice(1).join(',').trim(),
              lat: r.geometry.location.lat(),
              lng: r.geometry.location.lng(),
            }));
            setPredictions(list);
            setIsDropdownOpen(true);
            setHighlightedIndex(-1);
          } else {
            setPredictions([]);
          }
        });
      } else {
        setPredictions([]);
        setIsLoadingPredictions(false);
      }
    } catch {
      // Fallback to Google Geocoder on network error
      if (geocoderRef.current) {
        geocoderRef.current.geocode({ address: query }, (results, status) => {
          setIsLoadingPredictions(false);
          if (status === 'OK' && results && results.length > 0) {
            const list: PlacePrediction[] = results.slice(0, 5).map((r) => ({
              place_id: r.place_id,
              description: r.formatted_address,
              main_text: r.formatted_address.split(',')[0],
              secondary_text: r.formatted_address.split(',').slice(1).join(',').trim(),
              lat: r.geometry.location.lat(),
              lng: r.geometry.location.lng(),
            }));
            setPredictions(list);
            setIsDropdownOpen(true);
            setHighlightedIndex(-1);
          } else {
            setPredictions([]);
          }
        });
      } else {
        setPredictions([]);
        setIsLoadingPredictions(false);
      }
    }
  }, []);

  // Debounce query inputs by 250ms
  useEffect(() => {
    if (selectedLocation && inputValue === selectedLocation.formatted_address) {
      return;
    }

    const timer = setTimeout(() => {
      if (inputValue && inputValue.trim().length >= 2) {
        fetchPredictions(inputValue);
      } else {
        setPredictions([]);
        setIsDropdownOpen(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [inputValue, selectedLocation, fetchPredictions]);

  const resolveWithPredictionCoords = useCallback((prediction: PlacePrediction) => {
    setIsLoadingPredictions(false);
    const locData: LocationData = {
      formatted_address: prediction.description,
      formattedAddress: prediction.description,
      address: prediction.description,
      name: prediction.main_text,
      lat: prediction.lat ?? 0,
      lng: prediction.lng ?? 0,
      latitude: prediction.lat ?? 0,
      longitude: prediction.lng ?? 0,
      cityName: prediction.secondary_text || prediction.main_text,
      neighbourhood: prediction.main_text,
    };
    setSelectedLocation(locData);
    setInputValue(prediction.description);
    notifySelectLocation(locData);
  }, [notifySelectLocation]);

  // Handle place selection and extract exact location metrics
  const handleSelectPrediction = (prediction: PlacePrediction) => {
    setIsLoadingPredictions(true);
    setIsDropdownOpen(false);

    if (geocoderRef.current) {
      const geocodeReq = prediction.place_id && !prediction.place_id.includes('.')
        ? { placeId: prediction.place_id }
        : { address: prediction.description };

      geocoderRef.current.geocode(geocodeReq, (results, status) => {
        setIsLoadingPredictions(false);
        if (status === 'OK' && results && results[0]) {
          const result = results[0];
          const lat = result.geometry.location.lat();
          const lng = result.geometry.location.lng();
          const formatted_address = result.formatted_address || prediction.description;

          let cityName = '';
          let neighbourhood = '';

          if (result.address_components) {
            for (const comp of result.address_components) {
              if (comp.types.includes('locality') || comp.types.includes('postal_town')) {
                cityName = comp.long_name;
              } else if (!cityName && comp.types.includes('administrative_area_level_2')) {
                cityName = comp.long_name;
              }

              if (
                comp.types.includes('neighborhood') ||
                comp.types.includes('sublocality') ||
                comp.types.includes('sublocality_level_1')
              ) {
                neighbourhood = comp.long_name;
              }
            }
          }

          if (!neighbourhood && prediction.main_text && prediction.main_text !== formatted_address) {
            neighbourhood = prediction.main_text;
          }
          if (!neighbourhood) {
            neighbourhood = cityName || formatted_address.split(',')[0];
          }
          if (!cityName) {
            cityName = neighbourhood;
          }

          const locData: LocationData = {
            formatted_address,
            formattedAddress: formatted_address,
            address: formatted_address,
            name: prediction.main_text || formatted_address,
            lat,
            lng,
            latitude: lat,
            longitude: lng,
            cityName,
            neighbourhood,
          };

          setSelectedLocation(locData);
          setInputValue(formatted_address);
          notifySelectLocation(locData);
          return;
        }

        resolveWithPredictionCoords(prediction);
      });
    } else {
      resolveWithPredictionCoords(prediction);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setInputValue(val);

    if (selectedLocation && val !== selectedLocation.formatted_address) {
      setSelectedLocation(null);
      notifySelectLocation(null);
    }
  };

  const handleClear = () => {
    setInputValue('');
    setSelectedLocation(null);
    setPredictions([]);
    setIsDropdownOpen(false);
    notifySelectLocation(null);
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  // Keyboard navigation inside suggestions list
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isDropdownOpen || predictions.length === 0) {
      if (e.key === 'Enter' && inputValue.trim().length >= 2 && !selectedLocation) {
        e.preventDefault();
        handleSelectPrediction({
          description: inputValue.trim(),
          main_text: inputValue.trim(),
        });
      }
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev < predictions.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : predictions.length - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (highlightedIndex >= 0 && highlightedIndex < predictions.length) {
        handleSelectPrediction(predictions[highlightedIndex]);
      } else if (predictions.length > 0) {
        handleSelectPrediction(predictions[0]);
      }
    } else if (e.key === 'Escape') {
      setIsDropdownOpen(false);
    }
  };

  return (
    <div className="relative w-full" ref={dropdownRef}>
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            if (predictions.length > 0 && !selectedLocation) {
              setIsDropdownOpen(true);
            }
          }}
          placeholder={placeholder}
          required={required}
          autoComplete="off"
          className={`w-full px-4 py-2.5 rounded-xl bg-white border text-[#2C2C2C] text-sm focus:outline-none transition-colors ${
            selectedLocation
              ? 'border-[#2D5A3D] pr-20'
              : inputValue.length > 2
              ? 'border-amber-400 focus:border-amber-500 pr-10'
              : 'border-[#E2DBD0] focus:border-[#2D5A3D] pr-10'
          } ${className}`}
        />

        {selectedLocation ? (
          <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
            <span className="text-[10px] font-bold text-[#2D5A3D] bg-[#eaf3ed] px-2 py-0.5 rounded-md">
              ✓ Verified
            </span>
            <button
              type="button"
              onClick={handleClear}
              className="text-[#8a8278] hover:text-[#2C2C2C] text-xs px-1 cursor-pointer"
              title="Clear selection"
            >
              ✕
            </button>
          </div>
        ) : isLoadingPredictions ? (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[#8a8278] animate-spin">
            ⌛
          </span>
        ) : inputValue ? (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8a8278] hover:text-[#2C2C2C] text-xs cursor-pointer"
            title="Clear text"
          >
            ✕
          </button>
        ) : null}
      </div>

      {/* Helper warning if text typed without selection */}
      {inputValue.length > 2 && !selectedLocation && !isDropdownOpen && (
        <p className="text-[11px] text-amber-700 mt-1 font-medium flex items-center gap-1">
          📍 Please select a suggested location from the dropdown list.
        </p>
      )}

      {/* Suggestions Dropdown Menu */}
      {isDropdownOpen && predictions.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-[#E2DBD0] rounded-2xl shadow-xl max-h-60 overflow-y-auto divide-y divide-[#E2DBD0]/40">
          {predictions.map((item, idx) => (
            <button
              key={item.place_id || idx}
              type="button"
              onClick={() => handleSelectPrediction(item)}
              onMouseEnter={() => setHighlightedIndex(idx)}
              className={`w-full px-4 py-2.5 text-left text-xs transition-colors flex items-start gap-2.5 cursor-pointer ${
                idx === highlightedIndex ? 'bg-[#F4EEE2]' : 'hover:bg-[#F4EEE2]/60'
              }`}
            >
              <span className="text-sm mt-0.5 shrink-0">📍</span>
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-charcoal truncate">{item.main_text}</p>
                {item.secondary_text && (
                  <p className="text-[11px] text-[#8a8278] truncate">{item.secondary_text}</p>
                )}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
