import React, { useState, useRef, useEffect } from 'react';
import { useLoadScript, Autocomplete } from '@react-google-maps/api';

const LIBRARIES: ('places')[] = ['places'];

export interface LocationData {
  formatted_address: string;
  lat: number;
  lng: number;
  cityName?: string;
  neighbourhood?: string;
  // Aliases for seamless compatibility
  formattedAddress?: string;
  latitude?: number;
  longitude?: number;
}

export interface LocationInputProps {
  onSelectLocation: (location: LocationData | null) => void;
  placeholder?: string;
  initialValue?: string;
  className?: string;
  required?: boolean;
}

export const LocationInput: React.FC<LocationInputProps> = ({
  onSelectLocation,
  placeholder = 'Search address, neighbourhood or city (e.g. Kitsilano Beach, Vancouver)',
  initialValue = '',
  className = '',
  required = false,
}) => {
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';

  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: apiKey,
    libraries: LIBRARIES,
  });

  const [inputValue, setInputValue] = useState(initialValue);
  const [selectedLocation, setSelectedLocation] = useState<LocationData | null>(
    initialValue
      ? {
          formatted_address: initialValue,
          formattedAddress: initialValue,
          lat: 0,
          lng: 0,
          latitude: 0,
          longitude: 0,
        }
      : null
  );
  const [autocomplete, setAutocomplete] = useState<google.maps.places.Autocomplete | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Sync initialValue changes
  useEffect(() => {
    if (initialValue && initialValue !== inputValue) {
      setInputValue(initialValue);
    }
  }, [initialValue]);

  const onLoad = (autoC: google.maps.places.Autocomplete) => {
    setAutocomplete(autoC);
  };

  const onPlaceChanged = () => {
    if (autocomplete !== null) {
      const place = autocomplete.getPlace();

      if (!place || !place.geometry || !place.geometry.location) {
        return;
      }

      const lat = place.geometry.location.lat();
      const lng = place.geometry.location.lng();
      const formatted_address = place.formatted_address || place.name || inputValue;

      let cityName = '';
      let neighbourhood = '';

      if (place.address_components) {
        for (const comp of place.address_components) {
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

      if (!neighbourhood && place.name && place.name !== formatted_address) {
        neighbourhood = place.name;
      }
      if (!neighbourhood) {
        neighbourhood = cityName || formatted_address.split(',')[0];
      }
      if (!cityName) {
        cityName = neighbourhood;
      }

      const locData: LocationData = {
        formatted_address,
        lat,
        lng,
        cityName,
        neighbourhood,
        formattedAddress: formatted_address,
        latitude: lat,
        longitude: lng,
      };

      setSelectedLocation(locData);
      setInputValue(formatted_address);
      onSelectLocation(locData);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setInputValue(val);

    if (selectedLocation && val !== selectedLocation.formatted_address) {
      setSelectedLocation(null);
      onSelectLocation(null);
    }
  };

  const handleClear = () => {
    setInputValue('');
    setSelectedLocation(null);
    onSelectLocation(null);
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  if (loadError) {
    return (
      <div className="w-full">
        <input
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          placeholder={placeholder}
          className={`w-full px-4 py-2.5 rounded-xl bg-white border border-[#E2DBD0] text-[#2C2C2C] text-sm focus:outline-none focus:border-[#2D5A3D] ${className}`}
        />
        <p className="text-[11px] text-amber-700 mt-1">
          Google Maps failed to load. Please verify your API key and connection.
        </p>
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div className="relative w-full">
        <input
          type="text"
          disabled
          placeholder="Loading Google Places Autocomplete..."
          className={`w-full px-4 py-2.5 rounded-xl bg-[#F4EEE2]/40 border border-[#E2DBD0] text-[#8a8278] text-sm animate-pulse cursor-wait ${className}`}
        />
      </div>
    );
  }

  return (
    <div className="relative w-full">
      <div className="relative">
        <Autocomplete onLoad={onLoad} onPlaceChanged={onPlaceChanged}>
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={handleInputChange}
            placeholder={placeholder}
            required={required}
            className={`w-full px-4 py-2.5 rounded-xl bg-white border text-[#2C2C2C] text-sm focus:outline-none transition-colors ${
              selectedLocation
                ? 'border-[#2D5A3D] pr-20'
                : inputValue.length > 2
                ? 'border-amber-400 focus:border-amber-500 pr-10'
                : 'border-[#E2DBD0] focus:border-[#2D5A3D] pr-10'
            } ${className}`}
          />
        </Autocomplete>

        {selectedLocation ? (
          <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
            <span className="text-[10px] font-bold text-[#2D5A3D] bg-[#eaf3ed] px-2 py-0.5 rounded-md flex items-center gap-0.5">
              ✓ Verified
            </span>
            <button
              type="button"
              onClick={handleClear}
              className="text-[#8a8278] hover:text-[#2C2C2C] text-xs px-1 rounded cursor-pointer"
              title="Clear selection"
            >
              ✕
            </button>
          </div>
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

      {inputValue.length > 2 && !selectedLocation && (
        <p className="text-[11px] text-amber-700 mt-1 font-medium flex items-center gap-1">
          📍 Please select a suggested location from the Google Places dropdown list.
        </p>
      )}
    </div>
  );
};
