import React from 'react';
import { LocationInput, LocationData } from './LocationInput';

// Maintain backward compatibility with existing imports
export type LocationResult = LocationData;

export interface LocationAutocompleteProps {
  onSelectLocation: (location: LocationResult | null) => void;
  placeholder?: string;
  initialValue?: string;
  className?: string;
  required?: boolean;
}

export const LocationAutocomplete: React.FC<LocationAutocompleteProps> = (props) => {
  return <LocationInput {...props} />;
};

export { LocationInput };
