import React, { useState, useMemo, useCallback } from 'react';
import { useMutation } from '@apollo/client';
import { GoogleMap, useLoadScript, MarkerF, InfoWindowF } from '@react-google-maps/api';
import { SWIPE_EVENT } from '../graphql/operations';
import { EventItem } from './SwipeCardsView';

const LIBRARIES: ('places')[] = ['places'];

interface DiscoveryMapViewProps {
  events: EventItem[];
  onRefetch?: () => void;
}

const mapContainerStyle = {
  width: '100%',
  height: '100%',
  minHeight: '460px',
  borderRadius: '1rem',
};

const defaultMapOptions: google.maps.MapOptions = {
  disableDefaultUI: false,
  zoomControl: true,
  streetViewControl: false,
  mapTypeControl: false,
  fullscreenControl: false,
  styles: [
    {
      featureType: 'poi',
      elementType: 'labels',
      stylers: [{ visibility: 'off' }],
    },
  ],
};

export const DiscoveryMapView: React.FC<DiscoveryMapViewProps> = ({ events }) => {
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';

  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: apiKey,
    libraries: LIBRARIES,
  });

  const [selectedEvent, setSelectedEvent] = useState<EventItem | null>(events[0] || null);
  const [activeMarkerEvent, setActiveMarkerEvent] = useState<EventItem | null>(null);
  const [rsvpSuccessMsg, setRsvpSuccessMsg] = useState<string>('');
  const [map, setMap] = useState<google.maps.Map | null>(null);

  const [swipeEventMutation, { loading: isRsvping }] = useMutation(SWIPE_EVENT);

  // Compute map center dynamically based on selected event or first valid event
  const center = useMemo(() => {
    if (selectedEvent && selectedEvent.latitude && selectedEvent.longitude) {
      return { lat: selectedEvent.latitude, lng: selectedEvent.longitude };
    }
    const firstValid = events.find((e) => e.latitude && e.longitude);
    if (firstValid) {
      return { lat: firstValid.latitude, lng: firstValid.longitude };
    }
    return { lat: 49.2827, lng: -123.1207 }; // Fallback to Vancouver
  }, [selectedEvent, events]);

  const onMapLoad = useCallback((mapInstance: google.maps.Map) => {
    setMap(mapInstance);
  }, []);

  const handleSelectEvent = (evt: EventItem) => {
    setSelectedEvent(evt);
    setActiveMarkerEvent(evt);
    if (map && evt.latitude && evt.longitude) {
      map.panTo({ lat: evt.latitude, lng: evt.longitude });
      map.setZoom(14);
    }
  };

  const handleRsvpFromMap = async (eventItem: EventItem) => {
    setRsvpSuccessMsg('');
    try {
      const res = await swipeEventMutation({
        variables: {
          eventId: parseInt(eventItem.id, 10),
          response: 'going',
        },
      });

      if (res?.data?.swipeEvent?.success) {
        setRsvpSuccessMsg(`💚 RSVP Confirmed for "${eventItem.title}"!`);
        setTimeout(() => setRsvpSuccessMsg(''), 3500);
      }
    } catch (err: any) {
      console.error('[Map RSVP Error]', err);
    }
  };

  return (
    <div className="w-full max-w-5xl mx-auto space-y-6 antialiased">
      {/* RSVP Success Banner */}
      {rsvpSuccessMsg && (
        <div className="p-3.5 text-xs bg-[#eaf3ed] border border-[#7aaa8a]/40 text-[#2D5A3D] rounded-2xl font-semibold animate-bounce shadow-xs text-center">
          {rsvpSuccessMsg}
        </div>
      )}

      {/* Map Layout Grid: Left Pin List / Right Interactive Map Canvas */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 bg-white border border-[#E2DBD0] rounded-3xl p-4 sm:p-6 shadow-sm overflow-hidden min-h-[560px]">
        
        {/* Left Side: Event Markers List & Info Card */}
        <div className="md:col-span-5 space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-[#E2DBD0]/60 pb-3 mb-3">
              <h3 className="text-sm font-serif font-bold text-[#2D5A3D]">
                📍 Map Events ({events.length})
              </h3>
              <span className="text-[10px] bg-[#eaf3ed] text-[#2D5A3D] px-2.5 py-1 rounded-full font-semibold">
                Google Maps Live
              </span>
            </div>

            {/* Event Markers Selector */}
            <div className="space-y-2.5 max-h-[280px] overflow-y-auto pr-1">
              {events.map((evt) => {
                const isSelected = selectedEvent?.id === evt.id;
                return (
                  <div
                    key={evt.id}
                    onClick={() => handleSelectEvent(evt)}
                    className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                      isSelected
                        ? 'bg-[#2D5A3D] text-white border-[#2D5A3D] shadow-sm'
                        : 'bg-[#F4EEE2]/60 hover:bg-[#F0EAE0] border-[#E2DBD0] text-[#2C2C2C]'
                    }`}
                  >
                    <div>
                      <h4 className="text-xs font-serif font-bold line-clamp-1">
                        {evt.title}
                      </h4>
                      <p className={`text-[10px] mt-0.5 ${isSelected ? 'text-white/80' : 'text-[#8a8278]'}`}>
                        📍 {evt.locationName || 'Nearby'}
                      </p>
                    </div>

                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${
                      isSelected ? 'bg-white/20 text-white' : 'bg-white text-[#2D5A3D]'
                    }`}>
                      {evt.visibility || 'Public'}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Selected Event Marker Info Card */}
          {selectedEvent && (
            <div className="bg-[#F0EAE0]/90 border border-[#E2DBD0] rounded-2xl p-4 space-y-3 shadow-xs mt-4">
              <div className="h-28 w-full rounded-xl overflow-hidden bg-[#2D5A3D] relative">
                {selectedEvent.imageUrl ? (
                  <img
                    src={selectedEvent.imageUrl}
                    alt={selectedEvent.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-[#2D5A3D] to-slate-900 flex items-center justify-center text-white font-serif font-bold text-xl">
                    {selectedEvent.title.charAt(0)}
                  </div>
                )}
                <div className="absolute top-2 right-2 bg-black/50 backdrop-blur-xs text-white text-[10px] font-semibold px-2 py-0.5 rounded-full">
                  ⭐ +{selectedEvent.pointsReward || 10} pts
                </div>
              </div>

              <div>
                <h4 className="text-sm font-serif font-bold text-charcoal leading-snug">
                  {selectedEvent.title}
                </h4>
                <p className="text-[11px] text-[#2D5A3D] font-medium mt-0.5">
                  📍 {selectedEvent.locationName || 'Nearby'}
                </p>
                <p className="text-[11px] text-[#8a8278] mt-0.5 line-clamp-2">
                  {selectedEvent.description}
                </p>
              </div>

              <div className="flex items-center justify-between pt-1">
                <span className="text-[10px] text-[#8a8278]">
                  Host: @{selectedEvent.creator?.username || 'member'}
                </span>

                <button
                  type="button"
                  disabled={isRsvping}
                  onClick={() => handleRsvpFromMap(selectedEvent)}
                  className="px-4 py-1.5 rounded-lg bg-[#2D5A3D] hover:bg-[#3d7a55] text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer disabled:opacity-50"
                >
                  {isRsvping ? 'RSVPing...' : "I'm in! (RSVP)"}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Right Side: Interactive Google Maps Container */}
        <div className="md:col-span-7 h-[480px] md:h-full min-h-[480px] rounded-2xl overflow-hidden border border-[#E2DBD0] relative shadow-inner bg-[#F4EEE2]">
          {loadError ? (
            <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center text-rose-700">
              <span className="text-3xl mb-2">🗺️</span>
              <p className="font-semibold text-sm">Failed to load Google Maps</p>
              <p className="text-xs text-[#8a8278] mt-1">Please verify your Google Maps API key and network connection.</p>
            </div>
          ) : !isLoaded ? (
            <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center text-[#8a8278] animate-pulse">
              <span className="text-3xl mb-2">📍</span>
              <p className="text-sm font-medium">Loading Google Maps...</p>
            </div>
          ) : (
            <GoogleMap
              mapContainerStyle={mapContainerStyle}
              center={center}
              zoom={13}
              options={defaultMapOptions}
              onLoad={onMapLoad}
            >
              {/* Event Markers on Google Map */}
              {events
                .filter((evt) => evt.latitude && evt.longitude)
                .map((evt) => (
                  <MarkerF
                    key={evt.id}
                    position={{ lat: evt.latitude, lng: evt.longitude }}
                    title={evt.title}
                    onClick={() => {
                      setSelectedEvent(evt);
                      setActiveMarkerEvent(evt);
                    }}
                  />
                ))}

              {/* Interactive InfoWindow on Marker click */}
              {activeMarkerEvent && activeMarkerEvent.latitude && activeMarkerEvent.longitude && (
                <InfoWindowF
                  position={{
                    lat: activeMarkerEvent.latitude,
                    lng: activeMarkerEvent.longitude,
                  }}
                  onCloseClick={() => setActiveMarkerEvent(null)}
                >
                  <div className="p-1 max-w-[200px] text-charcoal font-sans">
                    <h5 className="font-bold text-xs text-[#2D5A3D] line-clamp-1">{activeMarkerEvent.title}</h5>
                    <p className="text-[10px] text-[#5a5450] mt-0.5">
                      📍 {activeMarkerEvent.locationName || 'Nearby'}
                    </p>
                    <p className="text-[10px] text-[#8a8278] mt-1 line-clamp-2">
                      {activeMarkerEvent.description}
                    </p>
                  </div>
                </InfoWindowF>
              )}
            </GoogleMap>
          )}

          {/* Floating Map Mode Badge */}
          <div className="absolute top-3 left-3 bg-white/95 backdrop-blur-md border border-[#E2DBD0] px-3 py-1.5 rounded-xl shadow-xs text-xs font-serif font-bold text-[#2D5A3D] pointer-events-none">
            📍 {selectedEvent ? (selectedEvent.locationName || selectedEvent.title) : 'Interactive Map'}
          </div>
        </div>

      </div>
    </div>
  );
};
