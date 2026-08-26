import React, { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation } from '@apollo/client';
import { useAuth } from '../context/AuthContext';
import { useApp } from '../context/AppContext';
import { Avatar } from '../components/Avatar';
import {
  GET_EVENT_BY_ID,
  SWIPE_EVENT,
  DELETE_EVENT,
  MY_RSVPS,
  GET_ALL_EVENTS,
  GET_MY_CREATED_EVENTS,
} from '../graphql/operations';
import {
  ArrowLeft,
  Calendar,
  Clock,
  MapPin,
  Star,
  Crown,
  Users,
  Check,
  HelpCircle,
  Share2,
  Trash2,
  Settings,
  Sparkles,
  ShieldCheck,
  AlertCircle,
  Trees,
  Utensils,
  Palette,
  Compass,
  ExternalLink,
} from 'lucide-react';
import { EventManagementModal } from './Plans/components/EventManagementModal';

function getCategoryIcon(category?: string) {
  const cat = (category || '').toLowerCase();
  if (cat.includes('outdoor') || cat.includes('nature') || cat.includes('hike')) {
    return <Trees className="w-8 h-8 text-[#2D5A3D]" />;
  }
  if (cat.includes('food') || cat.includes('drink') || cat.includes('dinner') || cat.includes('cafe')) {
    return <Utensils className="w-8 h-8 text-[#C47B5A]" />;
  }
  if (cat.includes('art') || cat.includes('craft') || cat.includes('music')) {
    return <Palette className="w-8 h-8 text-[#7B5E87]" />;
  }
  if (cat.includes('wellness') || cat.includes('mindfulness') || cat.includes('yoga')) {
    return <Sparkles className="w-8 h-8 text-[#2D5A3D]" />;
  }
  return <Compass className="w-8 h-8 text-[#2D5A3D]" />;
}

export const EventDetailPageView: React.FC = () => {
  const { eventId } = useParams<{ eventId: string }>();
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();
  const { t } = useApp();

  const [managingEvent, setManagingEvent] = useState<any | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [actionSuccessMsg, setActionSuccessMsg] = useState<string | null>(null);

  const parsedEventId = eventId ? parseInt(eventId, 10) : 0;

  // 1. Fetch Event Details
  const {
    data: eventData,
    loading: eventLoading,
    error: eventError,
    refetch: refetchEvent,
  } = useQuery(GET_EVENT_BY_ID, {
    variables: { id: parsedEventId },
    skip: !parsedEventId,
    fetchPolicy: 'cache-and-network',
  });

  // 2. Fetch User RSVPs to determine current RSVP state
  const { data: myRsvpsData, refetch: refetchMyRsvps } = useQuery(MY_RSVPS, {
    skip: !currentUser,
    fetchPolicy: 'cache-and-network',
  });

  // 3. Swipe / RSVP Mutation
  const [swipeEventMutation, { loading: isMutatingRsvp }] = useMutation(SWIPE_EVENT, {
    refetchQueries: [
      { query: GET_EVENT_BY_ID, variables: { id: parsedEventId } },
      { query: MY_RSVPS },
      { query: GET_ALL_EVENTS, variables: { upcomingOnly: false } },
      { query: GET_MY_CREATED_EVENTS, variables: { upcomingOnly: false } },
    ],
    onCompleted: (res) => {
      refetchEvent();
      refetchMyRsvps();
      if (res?.swipeEvent?.success) {
        setActionSuccessMsg(res.swipeEvent.message || 'RSVP updated successfully!');
        setTimeout(() => setActionSuccessMsg(null), 3500);
      }
    },
  });

  // 4. Delete Event Mutation
  const [deleteEventMutation, { loading: isDeleting }] = useMutation(DELETE_EVENT, {
    refetchQueries: [
      { query: GET_ALL_EVENTS, variables: { upcomingOnly: false } },
      { query: GET_MY_CREATED_EVENTS, variables: { upcomingOnly: false } },
      { query: MY_RSVPS },
    ],
    onCompleted: (res) => {
      if (res?.deleteEvent?.success) {
        navigate('/plans');
      }
    },
  });

  const event = eventData?.eventById;

  // Date Formatting
  const rawDate = event?.scheduledDate ? new Date(event.scheduledDate) : null;
  const isValidDate = rawDate && !isNaN(rawDate.getTime());

  const fullDateFormatted = isValidDate
    ? new Intl.DateTimeFormat('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      }).format(rawDate)
    : 'Date TBD';

  const timeFormatted = isValidDate
    ? new Intl.DateTimeFormat('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      }).format(rawDate)
    : 'Time TBD';

  // Identity & Role Calculations
  const isHost =
    Boolean(currentUser) &&
    Boolean(event?.creator?.id) &&
    String(event.creator.id) === String(currentUser?.id);

  const userRsvpRecord = (myRsvpsData?.myRsvps || []).find(
    (r: any) => String(r.event?.id) === String(parsedEventId)
  );

  const userResponse = isHost
    ? 'hosting'
    : userRsvpRecord?.response || (event?.rsvps || []).find(
        (r: any) => String(r.user?.id) === String(currentUser?.id)
      )?.response;

  const [attendanceFilter, setAttendanceFilter] = useState<'all' | 'going' | 'maybe'>('going');

  // RSVP lists
  const goingRsvps = (event?.rsvps || []).filter((r: any) => r.response === 'going');
  const maybeRsvps = (event?.rsvps || []).filter((r: any) => r.response === 'maybe');
  const allRsvps = (event?.rsvps || []).filter((r: any) => r.response === 'going' || r.response === 'maybe');
  const goingCount = goingRsvps.length || event?.goingCount || 0;
  const maybeCount = maybeRsvps.length;

  const displayedAttendees =
    attendanceFilter === 'going'
      ? goingRsvps
      : attendanceFilter === 'maybe'
      ? maybeRsvps
      : allRsvps;

  const handleRsvpToggle = async (targetResponse: 'going' | 'maybe') => {
    const nextResponse = userResponse === targetResponse ? 'pass' : targetResponse;
    try {
      await swipeEventMutation({
        variables: {
          eventId: parsedEventId,
          response: nextResponse,
        },
      });
    } catch (err) {
      console.error('[EventDetail RSVP Error]', err);
    }
  };

  const handleShare = async () => {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({
          title: event?.title || 'Havens Event',
          text: event?.description || `Join me for ${event?.title} on Havens!`,
          url,
        });
        return;
      } catch {
        // User dismissed
      }
    }
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(url);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 3000);
    }
  };

  if (eventLoading) {
    return (
      <div className="max-w-[1100px] mx-auto px-4 sm:px-6 py-12">
        <div className="flex items-center gap-3 text-stone-500 animate-pulse text-sm">
          <div className="w-6 h-6 rounded-full bg-[#E2DBD0]" />
          <span>Loading gathering details...</span>
        </div>
      </div>
    );
  }

  if (eventError || !event) {
    return (
      <div className="max-w-[1100px] mx-auto px-4 sm:px-6 py-12 text-center space-y-4">
        <div className="w-16 h-16 rounded-2xl bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center mx-auto">
          <AlertCircle className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-serif font-bold text-stone-900">Gathering Not Found</h2>
        <p className="text-xs text-[#8a8278] max-w-md mx-auto">
          This gathering could not be located or may have been removed by the host.
        </p>
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#2D5A3D] text-white text-xs font-bold shadow-xs hover:bg-[#3d7a55] transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Return to Gatherings</span>
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-[1100px] mx-auto px-4 sm:px-6 py-8 antialiased text-[#2C2C2C] space-y-6">
      {/* Top Navigation & Share Toolbar */}
      <div className="flex items-center justify-between gap-4 pb-4 border-b border-[#E2DBD0]/70">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border border-[#E2DBD0] bg-white text-stone-700 hover:text-[#2D5A3D] hover:border-[#2D5A3D]/40 text-xs font-bold transition-colors cursor-pointer shadow-2xs group"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
          <span>Back</span>
        </button>

        <div className="flex items-center gap-2">
          {event.community && (
            <span className="hidden sm:inline-flex items-center gap-1 text-xs font-semibold text-[#2D5A3D] bg-[#eaf3ed] px-2.5 py-1 rounded-xl border border-[#2D5A3D]/20">
              <Users className="w-3.5 h-3.5" />
              <span>{event.community.name}</span>
            </span>
          )}

          <button
            type="button"
            onClick={handleShare}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-[#E2DBD0] bg-white hover:bg-[#FAF8F5] text-stone-700 text-xs font-bold transition-colors shadow-2xs cursor-pointer"
          >
            <Share2 className="w-4 h-4 text-[#2D5A3D]" />
            <span>{copiedLink ? '✓ Link Copied!' : 'Share Event'}</span>
          </button>
        </div>
      </div>

      {/* Notifications */}
      {actionSuccessMsg && (
        <div className="p-4 rounded-2xl bg-[#eaf3ed] border border-[#2D5A3D]/30 text-[#2D5A3D] text-xs font-semibold flex items-center gap-2 shadow-2xs animate-in fade-in">
          <Check className="w-4 h-4 text-[#2D5A3D] shrink-0" />
          <span>{actionSuccessMsg}</span>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* SECTION 1: HERO EVENT BANNER & DETAILS */}
      {/* ───────────────────────────────────────────────────────────── */}
      <div className="rounded-3xl bg-white border border-[#E2DBD0] overflow-hidden shadow-xs">
        {/* Cover Photo or Ambient Fallback */}
        <div className="relative w-full h-64 sm:h-80 md:h-96 bg-gradient-to-br from-[#FAF8F5] via-[#F4EEE2] to-[#EAE2D2] flex items-center justify-center border-b border-[#E2DBD0]/60">
          {event.imageUrl ? (
            <img
              src={event.imageUrl}
              alt={event.title}
              className="w-full h-full object-cover"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
              }}
            />
          ) : (
            <div className="flex flex-col items-center justify-center p-6 text-center select-none space-y-3">
              <div className="w-20 h-20 rounded-3xl bg-white/90 backdrop-blur-xs border border-[#E2DBD0] shadow-md flex items-center justify-center">
                {getCategoryIcon(event.category)}
              </div>
              <span className="text-xs font-bold text-stone-600 uppercase tracking-widest">
                {event.category || 'Gathering'}
              </span>
            </div>
          )}

          {/* Floating Badges on Top Banner */}
          <div className="absolute top-4 left-4 right-4 flex items-center justify-between pointer-events-none">
            <span className="text-xs font-bold px-3.5 py-1.5 rounded-full bg-white/95 backdrop-blur-xs text-[#2D5A3D] shadow-sm border border-[#E2DBD0]/50">
              {event.category || 'Gathering'}
            </span>

            <div className="flex items-center gap-2">
              {/* Gamification Points Badge - Enhanced Size & Visibility */}
              {event.pointsReward ? (
                <span className="text-xs sm:text-sm font-bold text-amber-900 bg-amber-50/95 backdrop-blur-xs border border-amber-300 px-3.5 py-1.5 rounded-full shadow-sm inline-flex items-center gap-1.5">
                  <Star className="w-4 h-4 fill-amber-500 text-amber-500" />
                  <span>+{event.pointsReward} pts</span>
                </span>
              ) : null}

              {isHost && (
                <span className="text-xs font-bold px-3.5 py-1.5 rounded-full bg-[#2D5A3D] text-white shadow-sm flex items-center gap-1">
                  <Crown className="w-3.5 h-3.5 text-white" />
                  <span>Host</span>
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Event Main Content Info */}
        <div className="p-6 sm:p-8 space-y-6">
          <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
            <div className="space-y-3 flex-1">
              {/* Badges row */}
              <div className="flex items-center gap-2 flex-wrap">
                {event.ageRange && (
                  <span className="text-xs font-semibold px-3 py-1 rounded-full bg-[#FAF8F5] border border-[#E2DBD0] text-stone-700">
                    🎂 Age: {event.ageRange}
                  </span>
                )}
                {event.visibility && (
                  <span className="text-xs text-stone-600 capitalize px-2.5 py-1 rounded-full bg-[#F4EEE2] border border-[#E2DBD0]/60">
                    {event.visibility.replace('_', ' ')}
                  </span>
                )}
                {event.trustScore !== undefined && (
                  <span className="text-xs font-bold text-[#2D5A3D] bg-[#eaf3ed] px-2.5 py-1 rounded-full border border-[#2D5A3D]/20 flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5 text-[#2D5A3D]" />
                    <span>Trust Score: {event.trustScore}</span>
                  </span>
                )}
              </div>

              {/* Title */}
              <h1 className="text-2xl sm:text-4xl font-serif font-bold text-stone-900 leading-tight">
                {event.title}
              </h1>
            </div>

            {/* Host Action or RSVP Action Buttons */}
            <div className="flex items-center gap-2.5 shrink-0 self-stretch md:self-auto flex-wrap">
              {isHost ? (
                <>
                  <button
                    type="button"
                    onClick={() => setManagingEvent(event)}
                    className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-[#2D5A3D] hover:bg-[#3d7a55] text-white text-xs font-bold transition-all shadow-xs cursor-pointer"
                  >
                    <Settings className="w-4 h-4" />
                    <span>Manage Event & RSVPs</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowDeleteModal(true)}
                    className="p-3 rounded-2xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 transition-colors cursor-pointer shadow-2xs"
                    title="Delete Gathering"
                  >
                    <Trash2 className="w-4 h-4 text-rose-600" />
                  </button>
                </>
              ) : (
                /* Attending / Non-host RSVP Controls */
                <>
                  <button
                    type="button"
                    disabled={isMutatingRsvp}
                    onClick={() => handleRsvpToggle('going')}
                    className={`flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-6 py-3 rounded-2xl text-xs font-bold transition-all shadow-xs cursor-pointer ${
                      userResponse === 'going'
                        ? 'bg-[#2D5A3D] text-white ring-2 ring-[#2D5A3D]/30'
                        : 'bg-[#eaf3ed] text-[#2D5A3D] hover:bg-[#2D5A3D] hover:text-white border border-[#2D5A3D]/25'
                    }`}
                  >
                    <Check className="w-4 h-4" />
                    <span>{userResponse === 'going' ? 'Going (Confirmed)' : 'RSVP Going'}</span>
                  </button>

                  <button
                    type="button"
                    disabled={isMutatingRsvp}
                    onClick={() => handleRsvpToggle('maybe')}
                    className={`flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl text-xs font-bold transition-all border shadow-2xs cursor-pointer ${
                      userResponse === 'maybe'
                        ? 'bg-amber-100 border-amber-300 text-amber-900'
                        : 'border-[#E2DBD0] bg-white text-stone-700 hover:bg-[#FAF8F5]'
                    }`}
                  >
                    <HelpCircle className="w-4 h-4" />
                    <span>{userResponse === 'maybe' ? 'Marked Maybe' : 'Maybe'}</span>
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Date, Time & Location Blocks */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <div className="p-4 rounded-2xl bg-[#eaf3ed]/50 border border-[#2D5A3D]/15 flex items-start gap-3.5 text-[#2D5A3D]">
              <div className="p-2.5 rounded-xl bg-white text-[#2D5A3D] shadow-2xs shrink-0">
                <Clock className="w-5 h-5 text-[#2D5A3D]" />
              </div>
              <div>
                <p className="font-bold text-stone-900 text-sm">{fullDateFormatted}</p>
                <p className="text-xs text-stone-600 mt-0.5">{timeFormatted}</p>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-[#FDFBF7] border border-[#E2DBD0]/70 flex items-start gap-3.5 text-stone-700">
              <div className="p-2.5 rounded-xl bg-white text-[#C47B5A] border border-[#E2DBD0] shadow-2xs shrink-0">
                <MapPin className="w-5 h-5 text-[#C47B5A]" />
              </div>
              <div className="min-w-0">
                <p className="font-bold text-stone-900 text-sm truncate">
                  {event.locationName || 'Location specified'}
                </p>
                <p className="text-xs text-[#8a8278] mt-0.5">Physical gathering point</p>
              </div>
            </div>
          </div>

          {/* Organizer Card */}
          {event.creator && (
            <div className="p-4 sm:p-5 rounded-2xl bg-[#FAF8F5] border border-[#E2DBD0]/70 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <Link to={`/profile/${event.creator.username || event.creator.id}`} className="shrink-0 group">
                  <Avatar
                    name={event.creator.username}
                    photoUrl={event.creator.photoUrl}
                    size="lg"
                    className="w-12 h-12 rounded-2xl border-2 border-white shadow-xs group-hover:scale-105 transition-transform"
                  />
                </Link>
                <div>
                  <div className="flex items-center gap-1.5">
                    <Link
                      to={`/profile/${event.creator.username || event.creator.id}`}
                      className="text-sm font-bold text-stone-900 hover:text-[#2D5A3D] transition-colors"
                    >
                      @{event.creator.username}
                    </Link>
                    <span className="text-[10px] font-bold px-2 py-0.2 rounded-md bg-[#eaf3ed] text-[#2D5A3D]">
                      Host
                    </span>
                  </div>
                  <p className="text-xs text-[#8a8278]">Gathering Organizer</p>
                </div>
              </div>

              <Link
                to={`/profile/${event.creator.username || event.creator.id}`}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl border border-[#E2DBD0] bg-white hover:bg-[#F4EEE2] text-xs font-bold text-stone-700 transition-colors shadow-2xs"
              >
                <span>View Profile</span>
                <ExternalLink className="w-3 h-3 text-[#8a8278]" />
              </Link>
            </div>
          )}

          {/* Description Section */}
          <div className="space-y-2 pt-2">
            <h3 className="text-base font-serif font-bold text-stone-900">About Gathering</h3>
            <p className="text-sm text-stone-700 leading-relaxed bg-[#FDFBF7] p-5 rounded-2xl border border-[#E2DBD0]/70 whitespace-pre-wrap">
              {event.description || 'Intimate gathering hosted on Havens.'}
            </p>
          </div>

          {/* Passions & Topics */}
          {event.hobbies && event.hobbies.length > 0 && (
            <div className="space-y-2 pt-2">
              <h3 className="text-base font-serif font-bold text-stone-900">
                Related Topics & Passions
              </h3>
              <div className="flex flex-wrap gap-2">
                {event.hobbies.map((h: any) => (
                  <span
                    key={h.id}
                    className="text-xs font-medium px-3 py-1.5 rounded-2xl bg-[#eaf3ed] text-[#2D5A3D] border border-[#7aaa8a]/30"
                  >
                    #{h.name}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* SECTION 2: ATTENDANCE & RSVP DIRECTORY */}
      {/* ───────────────────────────────────────────────────────────── */}
      <div className="p-6 sm:p-8 rounded-3xl bg-white border border-[#E2DBD0] shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-lg font-serif font-bold text-stone-900">
              Attendance Directory
            </h3>
            <p className="text-xs text-[#8a8278] mt-0.5">
              Verified community members attending or considering this gathering
            </p>
          </div>

          {/* Granular Filter Tabs */}
          <div className="flex items-center gap-1.5 p-1 bg-[#FAF8F5] border border-[#E2DBD0] rounded-2xl shrink-0">
            <button
              type="button"
              onClick={() => setAttendanceFilter('going')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                attendanceFilter === 'going'
                  ? 'bg-[#2D5A3D] text-white shadow-2xs'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              <Check className="w-3.5 h-3.5" />
              <span>Confirmed ({goingCount})</span>
            </button>

            <button
              type="button"
              onClick={() => setAttendanceFilter('maybe')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                attendanceFilter === 'maybe'
                  ? 'bg-amber-500 text-white shadow-2xs'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              <HelpCircle className="w-3.5 h-3.5" />
              <span>Maybe ({maybeCount})</span>
            </button>

            <button
              type="button"
              onClick={() => setAttendanceFilter('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                attendanceFilter === 'all'
                  ? 'bg-stone-800 text-white shadow-2xs'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              <span>All ({goingCount + maybeCount})</span>
            </button>
          </div>
        </div>

        {/* Display Filtered Attendees Grid */}
        {displayedAttendees.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 pt-1">
            {displayedAttendees.map((rsvp: any) => {
              const u = rsvp.user;
              if (!u) return null;
              const isGoing = rsvp.response === 'going';
              return (
                <Link
                  key={rsvp.id}
                  to={`/profile/${u.username || u.id}`}
                  className="p-3.5 rounded-2xl border border-[#E2DBD0] bg-[#FAF8F5] hover:border-[#2D5A3D]/50 hover:bg-white transition-all flex items-center justify-between gap-3 shadow-2xs group"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <Avatar
                      name={u.username}
                      photoUrl={u.photoUrl}
                      size="md"
                      className="w-10 h-10 rounded-full border border-white shadow-2xs shrink-0"
                    />
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-stone-900 truncate group-hover:text-[#2D5A3D] transition-colors">
                        @{u.username}
                      </p>
                      {(u.neighbourhood || u.cityName) && (
                        <p className="text-[10px] text-[#8a8278] truncate">
                          {u.neighbourhood || u.cityName}
                        </p>
                      )}
                    </div>
                  </div>

                  <span
                    className={`text-[10px] font-bold px-2.5 py-1 rounded-full shrink-0 flex items-center gap-1 ${
                      isGoing
                        ? 'bg-[#eaf3ed] text-[#2D5A3D] border border-[#2D5A3D]/25'
                        : 'bg-amber-100 text-amber-900 border border-amber-300'
                    }`}
                  >
                    {isGoing ? (
                      <>
                        <Check className="w-2.5 h-2.5" />
                        <span>Confirmed</span>
                      </>
                    ) : (
                      <>
                        <HelpCircle className="w-2.5 h-2.5" />
                        <span>Interested</span>
                      </>
                    )}
                  </span>
                </Link>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-8 px-4 rounded-2xl bg-[#FAF8F5] border border-[#E2DBD0]/60 space-y-2">
            <p className="text-xs text-[#8a8278]">
              {attendanceFilter === 'going'
                ? 'No confirmed attendees yet.'
                : attendanceFilter === 'maybe'
                ? 'No members marked maybe yet.'
                : 'No RSVPs recorded yet.'}
            </p>
            {attendanceFilter === 'going' && (
              <p className="text-xs font-semibold text-[#2D5A3D]">Be the first to confirm attendance!</p>
            )}
          </div>
        )}
      </div>

      {/* Host Management Modal */}
      {managingEvent && (
        <EventManagementModal
          plan={managingEvent}
          isOpen={Boolean(managingEvent)}
          onClose={() => setManagingEvent(null)}
          onDelete={() => {
            setManagingEvent(null);
            setShowDeleteModal(true);
          }}
          onEventUpdated={() => {
            refetchEvent();
          }}
        />
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-[#E2DBD0] rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="p-3 bg-rose-50 rounded-2xl border border-rose-100 flex items-center justify-center">
                <Trash2 className="w-5 h-5 text-rose-600" />
              </div>
              <div>
                <h3 className="text-lg font-serif font-bold text-stone-900">Delete Gathering?</h3>
                <p className="text-xs text-[#8a8278]">This action is permanent and cannot be undone</p>
              </div>
            </div>

            <p className="text-xs text-stone-700 leading-relaxed bg-[#FAF8F5] p-3.5 rounded-2xl border border-[#E2DBD0]">
              Are you sure you want to delete <span className="font-bold text-stone-900">"{event.title}"</span>? All attendees and invitations will be cancelled.
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setShowDeleteModal(false)}
                className="px-4 py-2 rounded-xl border border-[#E2DBD0] text-xs font-semibold text-stone-700 hover:bg-[#FAF8F5] transition-colors cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="button"
                disabled={isDeleting}
                onClick={() => deleteEventMutation({ variables: { id: parsedEventId } })}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-colors shadow-xs cursor-pointer disabled:opacity-50"
              >
                {isDeleting ? 'Deleting...' : 'Confirm Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EventDetailPageView;
