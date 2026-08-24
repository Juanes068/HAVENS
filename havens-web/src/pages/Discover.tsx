import React, { useState } from 'react';
import { useQuery } from '@apollo/client';
import { SectionHeading } from '../components/SectionHeading';
import { SwipeCardsView, EventItem } from '../components/SwipeCardsView';
import { DiscoveryMapView } from '../components/DiscoveryMapView';
import { GET_ALL_EVENTS } from '../graphql/operations';

import { Layers } from 'lucide-react';

type ViewMode = 'swipe' | 'map';

export const DiscoverView: React.FC = () => {
  const [viewMode, setViewMode] = useState<ViewMode>('swipe');

  // Fetch events dynamically from the Django GraphQL backend
  const { data, loading, error, refetch } = useQuery<{ allEvents: EventItem[] }>(GET_ALL_EVENTS, {
    fetchPolicy: 'cache-and-network',
  });

  const rawEvents = data?.allEvents || [];

  // Strict Date Filtering: Only keep upcoming events (scheduledDate >= start of today)
  const upcomingEvents = React.useMemo(() => {
    const startOfToday = new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate()).getTime();
    return rawEvents.filter(event => {
      if (!event.scheduledDate) return true;
      const eventTime = new Date(event.scheduledDate).getTime();
      return !isNaN(eventTime) && eventTime >= startOfToday;
    });
  }, [rawEvents]);

  return (
    <div className="max-w-[1400px] mx-auto px-6 py-8 space-y-6 antialiased pb-20">
      
      {/* Header & Mode Switcher Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E2DBD0] pb-5">
        <div>
          <SectionHeading>Discover community plans</SectionHeading>
          <p className="text-sm text-muted mt-1">
            Explore local gatherings via Tinder-style swipe cards or interactive map markers
          </p>
        </div>

        {/* Sleek Floating Mode Toggle Switch */}
        <div className="flex items-center gap-1 p-1 bg-[#E2DBD0]/60 rounded-2xl shrink-0 self-start sm:self-auto shadow-xs">
          <button
            type="button"
            onClick={() => setViewMode('swipe')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
              viewMode === 'swipe'
                ? 'bg-[#2D5A3D] text-white shadow-sm'
                : 'text-[#5a5450] hover:text-charcoal'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Swipe Cards</span>
          </button>

          <button
            type="button"
            onClick={() => setViewMode('map')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
              viewMode === 'map'
                ? 'bg-[#2D5A3D] text-white shadow-sm'
                : 'text-[#5a5450] hover:text-charcoal'
            }`}
          >
            🗺️ Interactive Map
          </button>
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="text-center py-20 text-muted font-normal animate-pulse text-sm">
          Fetching live events from havens backend...
        </div>
      )}

      {/* Error State */}
      {error && !loading && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 rounded-2xl text-center text-sm font-medium">
          Failed to load community events. Please try again.
        </div>
      )}

      {/* VIEW MODES */}
      {!loading && !error && (
        <>
          {viewMode === 'swipe' ? (
            <SwipeCardsView events={upcomingEvents} onRefetch={() => refetch()} />
          ) : (
            <DiscoveryMapView events={upcomingEvents} onRefetch={() => refetch()} />
          )}
        </>
      )}

    </div>
  );
};
