import React, { useState, useMemo } from 'react';
import { useQuery } from '@apollo/client';
import { SectionHeading } from '../components/SectionHeading';
import { SwipeCardsView, EventItem } from '../components/SwipeCardsView';
import { DiscoveryMapView } from '../components/DiscoveryMapView';
import { GET_ALL_EVENTS, MY_RSVPS } from '../graphql/operations';
import { useAuth } from '../context/AuthContext';
import { Layers, MapPin, Sparkles, CheckCircle2, Calendar } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

type ViewMode = 'swipe' | 'map';

export const DiscoverView: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [viewMode, setViewMode] = useState<ViewMode>('swipe');

  // Fetch all events dynamically from the Django GraphQL backend
  const {
    data: eventsData,
    loading: loadingEvents,
    error: eventsError,
    refetch: refetchEvents,
  } = useQuery<{ allEvents: EventItem[] }>(GET_ALL_EVENTS, {
    fetchPolicy: 'cache-and-network',
  });

  // Fetch current user's RSVPs to filter main feed and populate map status
  const {
    data: rsvpsData,
    loading: loadingRsvps,
    refetch: refetchRsvps,
  } = useQuery(MY_RSVPS, {
    fetchPolicy: 'cache-and-network',
    skip: !user,
  });

  const rawEvents = eventsData?.allEvents || [];

  // Map of eventId -> response ('going' | 'maybe' | 'pass')
  const myRsvpMap = useMemo(() => {
    const map = new Map<string, string>();
    if (rsvpsData?.myRsvps) {
      for (const rsvp of rsvpsData.myRsvps) {
        if (rsvp.event?.id && rsvp.response) {
          map.set(String(rsvp.event.id), rsvp.response);
        }
      }
    }
    return map;
  }, [rsvpsData]);

  // Strict Date Filtering: Only keep upcoming events (scheduledDate >= start of today)
  const upcomingEvents = useMemo(() => {
    const startOfToday = new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate()).getTime();
    return rawEvents.filter((event) => {
      if (!event.scheduledDate) return true;
      const eventTime = new Date(event.scheduledDate).getTime();
      return !isNaN(eventTime) && eventTime >= startOfToday;
    });
  }, [rawEvents]);

  // TASK 3 - Main feed archiving on RSVP:
  // Any event marked as 'going' or 'maybe' (or 'pass') is archived / excluded from the discovery card feed
  const unrsvpedFeedEvents = useMemo(() => {
    return upcomingEvents.filter((event) => {
      const response = myRsvpMap.get(String(event.id));
      return !response || (response !== 'going' && response !== 'maybe' && response !== 'pass');
    });
  }, [upcomingEvents, myRsvpMap]);

  const activeRsvpsCount = useMemo(() => {
    let count = 0;
    for (const [_, res] of myRsvpMap.entries()) {
      if (res === 'going' || res === 'maybe') count++;
    }
    return count;
  }, [myRsvpMap]);

  const handleRefetchAll = () => {
    refetchEvents();
    if (user) refetchRsvps();
  };

  const loading = loadingEvents || (loadingRsvps && !eventsData);

  return (
    <div className="max-w-[1400px] mx-auto px-6 py-8 space-y-6 antialiased pb-20">
      {/* Header & Mode Switcher Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E2DBD0] pb-5">
        <div>
          <SectionHeading>Discover community plans</SectionHeading>
          <p className="text-sm text-muted mt-1">
            Explore local gatherings via discovery swipe cards or interactive map markers
          </p>
        </div>

        {/* Floating Mode Toggle Switch */}
        <div className="flex items-center gap-1.5 p-1.5 bg-[#F0EAE0] rounded-2xl shrink-0 self-start sm:self-auto shadow-2xs border border-[#E2DBD0]">
          <button
            type="button"
            onClick={() => setViewMode('swipe')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              viewMode === 'swipe'
                ? 'bg-[#2D5A3D] text-white shadow-xs'
                : 'text-stone-600 hover:text-stone-900 hover:bg-white/50'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Discover Feed</span>
            <span
              className={`text-[10px] px-2 py-0.5 rounded-full font-bold transition-colors ${
                viewMode === 'swipe' ? 'bg-white/20 text-white' : 'bg-[#E2DBD0] text-stone-700'
              }`}
            >
              {unrsvpedFeedEvents.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setViewMode('map')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              viewMode === 'map'
                ? 'bg-[#2D5A3D] text-white shadow-xs'
                : 'text-stone-600 hover:text-stone-900 hover:bg-white/50'
            }`}
          >
            <MapPin className="w-3.5 h-3.5" />
            <span>Interactive Map</span>
            <span
              className={`text-[10px] px-2 py-0.5 rounded-full font-bold transition-colors ${
                viewMode === 'map' ? 'bg-white/20 text-white' : 'bg-[#E2DBD0] text-stone-700'
              }`}
            >
              {upcomingEvents.length}
            </span>
          </button>
        </div>
      </div>

      {/* Persistent RSVP Notice Banner */}
      {activeRsvpsCount > 0 && (
        <div className="p-3.5 rounded-2xl bg-[#eaf3ed] border border-[#2D5A3D]/25 flex items-center justify-between text-xs text-[#2D5A3D] animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-[#2D5A3D] shrink-0" />
            <span>
              You have <strong>{activeRsvpsCount} active {activeRsvpsCount === 1 ? 'plan' : 'plans'}</strong> (marked Going/Maybe). These are archived from your swipe feed and kept live on your Map & Calendar.
            </span>
          </div>
          <button
            type="button"
            onClick={() => setViewMode('map')}
            className="px-3 py-1 bg-white text-[#2D5A3D] rounded-xl font-bold border border-[#2D5A3D]/20 hover:bg-[#2D5A3D] hover:text-white transition-colors cursor-pointer text-[11px] shrink-0"
          >
            View on Map
          </button>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="text-center py-20 text-muted font-normal animate-pulse text-sm">
          Fetching live events from havens backend...
        </div>
      )}

      {/* Error State */}
      {eventsError && !loading && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 rounded-2xl text-center text-sm font-medium">
          Failed to load community events. Please try again.
        </div>
      )}

      {/* VIEW MODES */}
      {!loading && !eventsError && (
        <>
          {viewMode === 'swipe' ? (
            <SwipeCardsView
              events={unrsvpedFeedEvents}
              onRefetch={handleRefetchAll}
            />
          ) : (
            <DiscoveryMapView
              events={upcomingEvents}
              myRsvps={myRsvpMap}
              onRefetch={handleRefetchAll}
            />
          )}
        </>
      )}
    </div>
  );
};
