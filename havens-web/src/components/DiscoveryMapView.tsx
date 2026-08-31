import React, { useState, useMemo, useCallback } from 'react';
import { useMutation } from '@apollo/client';
import { GoogleMap, useLoadScript, MarkerF, InfoWindowF } from '@react-google-maps/api';
import { SWIPE_EVENT } from '../graphql/operations';
import { useApp } from '../context/AppContext';
import { EventItem } from './SwipeCardsView';
import { Avatar } from './Avatar';
import { GOOGLE_MAPS_LIBRARIES } from './LocationInput';
import { Calendar, Clock, MapPin, Users } from 'lucide-react';

interface DiscoveryMapViewProps {
  events: EventItem[];
  myRsvps?: Map<string, string>;
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

export const DiscoveryMapView: React.FC<DiscoveryMapViewProps> = ({ events, myRsvps, onRefetch }) => {
  const { t, language } = useApp();
  const locale = language === 'es' ? 'es-ES' : language === 'fr' ? 'fr-FR' : 'en-US';
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';

  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: apiKey,
    libraries: GOOGLE_MAPS_LIBRARIES,
  });

  const [selectedEvent, setSelectedEvent] = useState<EventItem | null>(events[0] || null);
  const [activeMarkerEvent, setActiveMarkerEvent] = useState<EventItem | null>(null);
  const [rsvpSuccessMsg, setRsvpSuccessMsg] = useState<string>('');
  const [map, setMap] = useState<google.maps.Map | null>(null);

  const [swipeEventMutation, { loading: isRsvping }] = useMutation(SWIPE_EVENT, {
    refetchQueries: ['MyRsvps', 'GetAllEvents'],
  });

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

  const handleRsvpFromMap = async (eventItem: EventItem, response: 'going' | 'maybe' | 'pass') => {
    setRsvpSuccessMsg('');
    try {
      const res = await swipeEventMutation({
        variables: {
          eventId: parseInt(eventItem.id, 10),
          response,
        },
      });

      if (res?.data?.swipeEvent?.success) {
        if (response === 'going') {
          setRsvpSuccessMsg(`✓ RSVP Confirmed (Going) for "${eventItem.title}"!`);
        } else if (response === 'maybe') {
          setRsvpSuccessMsg(`? Marked "${eventItem.title}" as Maybe.`);
        } else {
          setRsvpSuccessMsg(`Removed RSVP for "${eventItem.title}".`);
        }
        setTimeout(() => setRsvpSuccessMsg(''), 3500);
        if (onRefetch) onRefetch();
      }
    } catch (err: any) {
      console.error('[Map RSVP Error]', err);
    }
  };

  return (
    <div className="w-full max-w-5xl mx-auto space-y-6 antialiased">
      {/* RSVP Success Banner */}
      {rsvpSuccessMsg && (
        <div className="p-3.5 text-xs bg-[#eaf3ed] border border-[#7aaa8a]/40 text-[#2D5A3D] rounded-2xl font-semibold shadow-xs text-center animate-in fade-in">
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
                Persistent Map Markers
              </span>
            </div>

            {/* Event Markers Selector */}
            <div className="space-y-2.5 max-h-[280px] overflow-y-auto pr-1">
              {events.map((evt) => {
                const isSelected = selectedEvent?.id === evt.id;
                const rsvpStatus = myRsvps?.get(String(evt.id));

                return (
                  <div
                    key={evt.id}
                    onClick={() => handleSelectEvent(evt)}
                    className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-2 ${
                      isSelected
                        ? 'bg-[#2D5A3D] text-white border-[#2D5A3D] shadow-sm'
                        : 'bg-[#F4EEE2]/60 hover:bg-[#F0EAE0] border-[#E2DBD0] text-[#2C2C2C]'
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <h4 className="text-xs font-serif font-bold line-clamp-1">
                          {evt.title}
                        </h4>
                        {evt.ageRange && (
                          <span
                            className={`text-[9px] font-semibold px-1.5 py-0.2 rounded-md ${
                              isSelected ? 'bg-white/20 text-white' : 'bg-[#E2DBD0] text-stone-700'
                            }`}
                          >
                            🎂 {evt.ageRange}
                          </span>
                        )}
                      </div>
                      <p className={`text-[10px] mt-0.5 truncate ${isSelected ? 'text-white/80' : 'text-[#8a8278]'}`}>
                        📍 {evt.locationName || 'Nearby'}
                      </p>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      {rsvpStatus === 'going' && (
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          isSelected ? 'bg-emerald-400/30 text-emerald-100 border border-emerald-300/40' : 'bg-[#eaf3ed] text-[#2D5A3D] border border-[#2D5A3D]/30'
                        }`}>
                          ✓ Going
                        </span>
                      )}
                      {rsvpStatus === 'maybe' && (
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          isSelected ? 'bg-amber-400/30 text-amber-100 border border-amber-300/40' : 'bg-[#fdf6ed] text-[#C47B5A] border border-[#C47B5A]/30'
                        }`}>
                          ? Maybe
                        </span>
                      )}
                      {!rsvpStatus && (
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          isSelected ? 'bg-white/20 text-white' : 'bg-white text-[#2D5A3D]'
                        }`}>
                          {evt.visibility || 'Public'}
                        </span>
                      )}
                    </div>
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
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                ) : null}
                <div className={`w-full h-full bg-gradient-to-br from-[#2D5A3D] to-slate-900 flex items-center justify-center text-white font-serif font-bold text-xl ${selectedEvent.imageUrl ? 'hidden' : ''}`}>
                  {selectedEvent.title.charAt(0)}
                </div>
                <div className="absolute top-2 right-2 flex items-center gap-1">
                  {selectedEvent.ageRange && (
                    <span className="bg-black/50 backdrop-blur-xs text-white text-[10px] font-semibold px-2 py-0.5 rounded-full">
                      🎂 {selectedEvent.ageRange}
                    </span>
                  )}
                  <span className="bg-black/50 backdrop-blur-xs text-white text-[10px] font-semibold px-2 py-0.5 rounded-full">
                    ⭐ +{selectedEvent.pointsReward || 10} pts
                  </span>
                </div>
              </div>

              <div>
                <h4 className="text-sm font-serif font-bold text-charcoal leading-snug">
                  {selectedEvent.title}
                </h4>
                {selectedEvent.scheduledDate && !isNaN(new Date(selectedEvent.scheduledDate).getTime()) && (
                  <div className="flex items-center gap-1.5 text-[11px] font-semibold text-[#2D5A3D] mt-1">
                    <Calendar className="w-3.5 h-3.5 text-[#2D5A3D]" />
                    <span>
                      {new Intl.DateTimeFormat('en-US', {
                        weekday: 'short',
                        month: 'short',
                        day: 'numeric',
                      }).format(new Date(selectedEvent.scheduledDate))}
                      {' • '}
                      {new Intl.DateTimeFormat('en-US', {
                        hour: 'numeric',
                        minute: '2-digit',
                        hour12: true,
                      }).format(new Date(selectedEvent.scheduledDate))}
                    </span>
                  </div>
                )}
                <p className="text-[11px] text-stone-600 font-medium mt-0.5">
                  📍 {selectedEvent.locationName || 'Nearby'}
                </p>
                <p className="text-[11px] text-[#8a8278] mt-0.5 line-clamp-2">
                  {selectedEvent.description}
                </p>
              </div>

              {/* RSVP Action Bar */}
              {(() => {
                const currentRsvp = myRsvps?.get(String(selectedEvent.id));

                return (
                  <div className="pt-2 border-t border-[#E2DBD0]/60 space-y-2">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-stone-500">
                        {t('hostedBy')}: @{selectedEvent.creator?.username || 'member'}
                      </span>
                      {currentRsvp === 'going' && (
                        <span className="font-bold text-[#2D5A3D] bg-[#eaf3ed] px-2.5 py-0.5 rounded-full border border-[#2D5A3D]/20">
                          ✓ {t('going')}
                        </span>
                      )}
                      {currentRsvp === 'maybe' && (
                        <span className="font-bold text-[#C47B5A] bg-[#fdf6ed] px-2.5 py-0.5 rounded-full border border-[#C47B5A]/20">
                          ? {t('maybe')}
                        </span>
                      )}
                    </div>

                    {/* Attendee avatars preview */}
                    {((selectedEvent.goingCount && selectedEvent.goingCount > 0) || (selectedEvent.attendees && selectedEvent.attendees.length > 0)) && (
                      <div className="flex items-center gap-2 py-0.5">
                        <span className="text-[10px] font-bold text-stone-500 uppercase">{t('going')}:</span>
                        <div className="flex items-center -space-x-1.5">
                          {(selectedEvent.attendees || []).slice(0, 4).map((att: any) => (
                            <Avatar
                              key={att.id}
                              name={att.username}
                              photoUrl={att.photoUrl}
                              size="xs"
                              className="w-5 h-5 rounded-full border border-white shadow-2xs"
                              title={`@${att.username}`}
                            />
                          ))}
                        </div>
                        <span className="text-[11px] font-bold text-[#2D5A3D]">
                          {selectedEvent.goingCount || selectedEvent.attendees?.length || 1} {t('attendees')}
                        </span>
                      </div>
                    )}

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        disabled={isRsvping}
                        onClick={() => handleRsvpFromMap(selectedEvent, 'going')}
                        className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer ${
                          currentRsvp === 'going'
                            ? 'bg-[#2D5A3D] text-white shadow-xs'
                            : 'bg-[#eaf3ed] text-[#2D5A3D] hover:bg-[#2D5A3D] hover:text-white border border-[#2D5A3D]/30'
                        }`}
                      >
                        {currentRsvp === 'going' ? `✓ ${t('going')}` : t('going')}
                      </button>

                      <button
                        type="button"
                        disabled={isRsvping}
                        onClick={() => handleRsvpFromMap(selectedEvent, 'maybe')}
                        className={`px-3 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                          currentRsvp === 'maybe'
                            ? 'bg-[#C47B5A] text-white shadow-xs'
                            : 'bg-[#FAF8F5] text-stone-700 hover:bg-[#F0EAE0] border border-[#E2DBD0]'
                        }`}
                      >
                        {currentRsvp === 'maybe' ? `? ${t('maybe')}` : t('maybe')}
                      </button>

                      {currentRsvp && (
                        <button
                          type="button"
                          disabled={isRsvping}
                          onClick={() => handleRsvpFromMap(selectedEvent, 'pass')}
                          className="px-2.5 py-2 rounded-xl text-[11px] text-rose-600 hover:bg-rose-50 border border-rose-200 transition-colors cursor-pointer"
                          title={t('pass')}
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  </div>
                );
              })()}
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
