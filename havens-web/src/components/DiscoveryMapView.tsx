import React, { useState } from 'react';
import { useMutation } from '@apollo/client';
import { SWIPE_EVENT } from '../graphql/operations';
import { EventItem } from './SwipeCardsView';

interface DiscoveryMapViewProps {
  events: EventItem[];
  onRefetch?: () => void;
}

export const DiscoveryMapView: React.FC<DiscoveryMapViewProps> = ({ events }) => {
  const [selectedEvent, setSelectedEvent] = useState<EventItem | null>(events[0] || null);
  const [rsvpSuccessMsg, setRsvpSuccessMsg] = useState<string>('');

  const [swipeEventMutation, { loading: isRsvping }] = useMutation(SWIPE_EVENT);

  // Default center coordinates (e.g. Kitsilano / Vancouver: 49.2827, -123.1207)
  const defaultLat = selectedEvent?.latitude || 49.2827;
  const defaultLng = selectedEvent?.longitude || -123.1207;

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
        
        {/* Left Side: Event Markers List & InfoWindow Popover */}
        <div className="md:col-span-5 space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-[#E2DBD0]/60 pb-3 mb-3">
              <h3 className="text-sm font-serif font-bold text-[#2D5A3D]">
                📍 Map Markers ({events.length})
              </h3>
              <span className="text-[10px] font-mono bg-[#eaf3ed] text-[#2D5A3D] px-2.5 py-1 rounded-full font-semibold">
                Interactive Coordinates
              </span>
            </div>

            {/* Event Markers Selector */}
            <div className="space-y-2.5 max-h-[280px] overflow-y-auto pr-1">
              {events.map((evt) => {
                const isSelected = selectedEvent?.id === evt.id;
                return (
                  <div
                    key={evt.id}
                    onClick={() => setSelectedEvent(evt)}
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
                      <p className={`text-[10px] font-mono mt-0.5 ${isSelected ? 'text-white/80' : 'text-[#8a8278]'}`}>
                        📍 {evt.latitude.toFixed(2)}, {evt.longitude.toFixed(2)}
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

          {/* Selected Event Marker InfoWindow Card */}
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
                <p className="text-[11px] text-[#8a8278] mt-0.5 line-clamp-2">
                  {selectedEvent.description}
                </p>
              </div>

              <div className="flex items-center justify-between pt-1">
                <span className="text-[10px] text-[#8a8278] font-mono">
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

        {/* Right Side: Interactive OpenStreetMap / Google Maps View Container */}
        <div className="md:col-span-7 h-[480px] md:h-full rounded-2xl overflow-hidden border border-[#E2DBD0] relative shadow-inner bg-sand">
          <iframe
            title="Interactive Map View"
            width="100%"
            height="100%"
            frameBorder="0"
            scrolling="no"
            src={`https://www.openstreetmap.org/export/embed.html?bbox=${
              defaultLng - 0.05
            }%2C${defaultLat - 0.05}%2C${defaultLng + 0.05}%2C${
              defaultLat + 0.05
            }&layer=mapnik&marker=${defaultLat}%2C${defaultLng}`}
            className="w-full h-full border-0"
          />

          {/* Floating Map Pin Badge */}
          <div className="absolute top-3 left-3 bg-white/95 backdrop-blur-md border border-[#E2DBD0] px-3 py-1.5 rounded-xl shadow-xs text-xs font-serif font-bold text-[#2D5A3D]">
            📍 Map Mode • {selectedEvent?.title || 'Selected Event'}
          </div>
        </div>

      </div>
    </div>
  );
};
