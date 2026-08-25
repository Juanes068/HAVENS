import React from 'react';
import { Avatar } from './Avatar';
import { Clock, MapPin, Star, Crown, X, Share2 } from 'lucide-react';

export interface EventDetailModalProps {
  event: any | null;
  onClose: () => void;
  onRsvpChange?: (eventId: number, response: 'going' | 'maybe' | 'pass') => void;
  onDeletePlan?: (plan: any) => void;
  currentUsername?: string;
}

export const EventDetailModal: React.FC<EventDetailModalProps> = ({
  event,
  onClose,
  onRsvpChange,
  onDeletePlan,
  currentUsername,
}) => {
  if (!event) return null;

  const rawDate = event.scheduledDate ? new Date(event.scheduledDate) : null;
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

  const isHost =
    event.role === 'hosting' ||
    (Boolean(currentUsername) &&
      event.creator?.username?.toLowerCase() === currentUsername?.toLowerCase());

  const handleShare = async () => {
    const url = window.location.origin + '/discover?event=' + event.id;
    if (navigator.share) {
      try {
        await navigator.share({
          title: event.title,
          text: event.description || ('Join me for ' + event.title + ' on Havens!'),
          url,
        });
      } catch {
        // User aborted share
      }
    } else if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(url);
      alert('✓ Event link copied to clipboard!');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
      <div className="bg-white border border-[#E2DBD0] rounded-3xl p-6 max-w-lg w-full shadow-2xl space-y-4 animate-in zoom-in-95 duration-150 max-h-[85vh] overflow-y-auto">
        {/* Cover Photo */}
        {event.imageUrl ? (
          <div className="w-full h-44 rounded-2xl overflow-hidden bg-[#F4EEE2] border border-[#E2DBD0]/60 relative shrink-0">
            <img
              src={event.imageUrl}
              alt={event.title}
              className="w-full h-full object-cover"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
              }}
            />
            <div className="absolute top-3 right-3 flex items-center gap-1.5">
              {event.pointsReward ? (
                <span className="text-[10px] font-bold text-amber-800 bg-amber-50/90 backdrop-blur-xs border border-amber-200/60 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                  <Star className="w-3 h-3 fill-amber-500 text-amber-500" />
                  +{event.pointsReward} pts
                </span>
              ) : null}
            </div>
          </div>
        ) : null}

        {/* Header Title Bar */}
        <div className="flex justify-between items-start gap-3">
          <div>
            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
              <span className="text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full bg-[#eaf3ed] text-[#2D5A3D]">
                {event.category || 'Gathering'}
              </span>
              {isHost && (
                <span className="text-[10px] font-semibold px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200/60 flex items-center gap-1">
                  <Crown className="w-3 h-3 text-amber-700" />
                  <span>Hosted by You</span>
                </span>
              )}
              {event.visibility && (
                <span className="text-[10px] text-stone-500 capitalize px-2 py-0.5 rounded-md bg-[#F4EEE2] border border-[#E2DBD0]/60">
                  {event.visibility.replace('_', ' ')}
                </span>
              )}
            </div>

            <h3 className="text-xl font-serif font-bold text-stone-900 leading-tight">
              {event.title}
            </h3>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="text-xs font-bold text-[#8a8278] hover:text-stone-900 bg-[#F4EEE2] p-1.5 rounded-full cursor-pointer transition-colors shrink-0"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Host row */}
        {event.creator && (
          <div className="flex items-center justify-between p-3 rounded-2xl bg-[#FDFBF7] border border-[#E2DBD0]/60">
            <div className="flex items-center gap-3">
              <Avatar
                name={event.creator.username || 'Host'}
                photoUrl={event.creator.photoUrl}
                color="#2D5A3D"
                size="md"
              />
              <div>
                <p className="text-xs font-semibold text-stone-900">
                  @{event.creator.username}
                </p>
                <p className="text-[10px] text-stone-500">Event Organizer</p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleShare}
              className="p-2 rounded-xl border border-[#E2DBD0] hover:bg-[#F4EEE2] text-stone-600 transition-colors cursor-pointer"
              title="Share event"
            >
              <Share2 className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Date, Time & Location Details */}
        <div className="space-y-2 text-xs">
          <div className="flex items-start gap-2.5 p-3 rounded-2xl bg-[#eaf3ed]/50 border border-[#2D5A3D]/15 text-[#2D5A3D]">
            <Clock className="w-4 h-4 shrink-0 mt-0.5 text-[#2D5A3D]" />
            <div>
              <p className="font-semibold">{fullDateFormatted}</p>
              <p className="text-[11px] text-stone-600 mt-0.5">{timeFormatted}</p>
            </div>
          </div>

          <div className="flex items-start gap-2.5 p-3 rounded-2xl bg-[#FDFBF7] border border-[#E2DBD0]/60 text-stone-700">
            <MapPin className="w-4 h-4 shrink-0 mt-0.5 text-[#C47B5A]" />
            <div>
              <p className="font-semibold text-stone-900">
                {event.locationName || 'Vancouver, BC'}
              </p>
              <p className="text-[10px] text-stone-500 mt-0.5">Physical gathering point</p>
            </div>
          </div>
        </div>

        {/* Description */}
        <div>
          <h4 className="text-xs font-semibold text-[#2C2C2C] mb-1">About Gathering</h4>
          <p className="text-xs text-stone-700 leading-relaxed bg-[#FDFBF7] p-3.5 rounded-2xl border border-[#E2DBD0]/60 whitespace-pre-wrap">
            {event.description || 'Intimate gathering hosted on Havens.'}
          </p>
        </div>

        {/* Hobbies / Tags */}
        {event.hobbies && event.hobbies.length > 0 && (
          <div className="space-y-1.5">
            <h4 className="text-xs font-semibold text-[#2C2C2C]">Event Passions & Topics:</h4>
            <div className="flex flex-wrap gap-1.5">
              {event.hobbies.map((hb: any) => (
                <span
                  key={hb.id}
                  className="text-[11px] font-medium px-2.5 py-1 rounded-xl bg-[#eaf3ed] text-[#2D5A3D] border border-[#7aaa8a]/30"
                >
                  #{hb.name}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Action Footer */}
        <div className="pt-3 border-t border-[#E2DBD0]/60 flex items-center justify-between gap-2">
          {onDeletePlan && isHost ? (
            <button
              type="button"
              onClick={() => {
                onClose();
                onDeletePlan(event);
              }}
              className="px-4 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-semibold transition-colors cursor-pointer"
            >
              Delete Plan
            </button>
          ) : null}

          <div className="flex items-center gap-2 ml-auto">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-[#E2DBD0] text-xs font-semibold text-stone-600 hover:bg-[#F4EEE2] transition-colors cursor-pointer"
            >
              Close
            </button>

            {onRsvpChange && (
              <button
                type="button"
                onClick={() => {
                  const eventIdNum = typeof event.id === 'string' ? parseInt(event.id, 10) : event.id;
                  onRsvpChange(eventIdNum, event.response === 'going' ? 'pass' : 'going');
                }}
                className={`px-5 py-2 rounded-xl text-xs font-semibold transition-all shadow-xs cursor-pointer ${event.response === 'going' ? 'bg-[#2D5A3D] text-white hover:bg-[#3d7a55]' : 'bg-[#eaf3ed] text-[#2D5A3D] hover:bg-[#2D5A3D] hover:text-white border border-[#2D5A3D]/20'}`}
              >
                {event.response === 'going' ? 'Going (Confirmed)' : "I'm In (RSVP)"}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
