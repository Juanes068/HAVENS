import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

export interface ParticipantProfile {
  id?: string | number;
  username: string;
  photoUrl?: string | null;
  rsvp_status?: string | null;
  rsvpStatus?: string | null;
  response?: string | null;
  age?: number;
  neighbourhood?: string;
  cityName?: string;
}

export interface RawRsvpItem {
  id?: string | number;
  response?: string | null;
  rsvp_status?: string | null;
  rsvpStatus?: string | null;
  user?: {
    id?: string | number;
    username: string;
    photoUrl?: string | null;
    age?: number;
    neighbourhood?: string;
    cityName?: string;
  } | null;
}

export interface FacepileProps {
  /**
   * Direct list of participants or RSVPs.
   * Can accept objects with `user` sub-object or direct participant objects.
   */
  participants?: (ParticipantProfile | RawRsvpItem | null | undefined)[];
  /**
   * Attendees array (defaults to Going if no rsvp_status is explicitly attached).
   */
  attendees?: (ParticipantProfile | null | undefined)[];
  /**
   * RSVPs array with `user` and `response` / `rsvp_status`.
   */
  rsvps?: (RawRsvpItem | null | undefined)[];
  /**
   * Maximum number of avatars to display before showing the `+N` overflow chip.
   * Defaults to 4.
   */
  max?: number;
  /**
   * Size of each circular avatar.
   * 'xs': 20px (w-5 h-5)
   * 'sm': 24px (w-6 h-6)
   * 'md': 32px (w-8 h-8)
   * 'lg': 40px (w-10 h-10)
   */
  size?: 'xs' | 'sm' | 'md' | 'lg';
  /**
   * Whether to display a readable summary label alongside the facepile.
   * E.g., "5 going" or "3 going · 1 maybe".
   */
  showLabel?: boolean;
  /**
   * Custom label or fallback string when empty.
   */
  emptyLabel?: string;
  /**
   * Additional wrapper CSS class names.
   */
  className?: string;
  /**
   * Optional custom border/ring color (defaults to white for standard cards).
   */
  ringColorClass?: string;
  /**
   * Total going count if known from backend counter (used for overflow math if list is truncated).
   */
  totalGoingCount?: number;
}

/**
 * Havens Signature Earthy Palette
 * Deterministic color selection for avatars without photoUrl.
 */
const HAVENS_EARTHY_PALETTE = [
  '#2D5A3D', // Deep Forest Green
  '#C47B5A', // Terracotta Clay
  '#7B5E87', // Muted Heather Plum
  '#4A6B53', // Sage / Moss Green
  '#A26238', // Warm Ochre
  '#5C4A3E', // Deep Bark Espresso
  '#4F6D7A', // Slate Blue-Grey
  '#6E6441', // Olive Gold
];

export function getEarthyAvatarColor(username: string): string {
  if (!username) return HAVENS_EARTHY_PALETTE[0];
  let hash = 0;
  for (let i = 0; i < username.length; i++) {
    hash = username.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % HAVENS_EARTHY_PALETTE.length;
  return HAVENS_EARTHY_PALETTE[index];
}

interface SingleAvatarProps {
  participant: ParticipantProfile;
  size: 'xs' | 'sm' | 'md' | 'lg';
  ringColorClass: string;
}

const SingleFacepileAvatar: React.FC<SingleAvatarProps> = ({
  participant,
  size,
  ringColorClass,
}) => {
  const [imgFailed, setImgFailed] = useState(false);
  const navigate = useNavigate();

  const username = participant.username || 'user';
  const initial = username.charAt(0).toUpperCase() || 'U';
  const bgColor = getEarthyAvatarColor(username);
  const status = (participant.response || participant.rsvp_status || participant.rsvpStatus || 'going').toLowerCase();
  const isMaybe = status === 'maybe';
  const statusLabel = isMaybe ? 'Maybe' : 'Going';

  let sizeClasses = 'w-6 h-6 text-[10px]';
  if (size === 'xs') sizeClasses = 'w-5 h-5 text-[9px]';
  else if (size === 'sm') sizeClasses = 'w-6 h-6 text-[10px]';
  else if (size === 'md') sizeClasses = 'w-8 h-8 text-xs';
  else if (size === 'lg') sizeClasses = 'w-10 h-10 text-sm';

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigate(`/profile/${encodeURIComponent(username)}`);
  };

  const hasValidPhoto = Boolean(participant.photoUrl) && !imgFailed;

  return (
    <Link
      to={`/profile/${encodeURIComponent(username)}`}
      onClick={handleClick}
      title={`@${username} (${statusLabel})`}
      aria-label={`View @${username}'s profile (${statusLabel})`}
      className={`relative inline-block rounded-full ${sizeClasses} ring-2 ${ringColorClass} hover:ring-[#2D5A3D] hover:scale-115 hover:z-30 transition-all duration-150 shrink-0 cursor-pointer shadow-2xs group`}
    >
      <div
        className="w-full h-full rounded-full overflow-hidden flex items-center justify-center font-bold text-white select-none"
        style={{ backgroundColor: bgColor }}
      >
        {hasValidPhoto ? (
          <img
            src={participant.photoUrl!}
            alt={username}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
            onError={() => setImgFailed(true)}
            loading="lazy"
          />
        ) : (
          <span className="font-serif leading-none">{initial}</span>
        )}
      </div>

      {/* Subtle indicator dot for 'maybe' vs 'going' */}
      {isMaybe && (
        <span
          className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-amber-400 ring-1 ring-white"
          title="Marked Maybe"
        />
      )}
    </Link>
  );
};

export const Facepile: React.FC<FacepileProps> = ({
  participants,
  attendees,
  rsvps,
  max = 4,
  size = 'sm',
  showLabel = true,
  emptyLabel = 'No attendees yet',
  className = '',
  ringColorClass = 'ring-white',
  totalGoingCount,
}) => {
  // Normalize and strictly filter participant entries
  const normalizedList: ParticipantProfile[] = [];
  const seenUsernames = new Set<string>();

  // 1. Process rsvps (extract user and response/rsvp_status)
  if (Array.isArray(rsvps)) {
    rsvps.forEach((item) => {
      if (!item) return;
      const user = item.user;
      if (!user || !user.username) return;

      const rsvpResponse = (item.rsvp_status || item.rsvpStatus || item.response || '').toLowerCase();
      // STRICT FILTER LOGIC: Only include participants who marked "going" or "maybe"
      if (rsvpResponse !== 'going' && rsvpResponse !== 'maybe') return;

      const unameKey = user.username.toLowerCase();
      if (!seenUsernames.has(unameKey)) {
        seenUsernames.add(unameKey);
        normalizedList.push({
          id: user.id,
          username: user.username,
          photoUrl: user.photoUrl,
          rsvp_status: rsvpResponse,
          response: rsvpResponse,
          age: user.age,
          neighbourhood: user.neighbourhood,
          cityName: user.cityName,
        });
      }
    });
  }

  // 2. Process attendees array
  if (Array.isArray(attendees)) {
    attendees.forEach((att) => {
      if (!att || !att.username) return;
      const unameKey = att.username.toLowerCase();
      if (!seenUsernames.has(unameKey)) {
        seenUsernames.add(unameKey);
        normalizedList.push({
          id: att.id,
          username: att.username,
          photoUrl: att.photoUrl,
          rsvp_status: att.rsvp_status || att.response || 'going',
          response: att.response || att.rsvp_status || 'going',
          age: att.age,
          neighbourhood: att.neighbourhood,
          cityName: att.cityName,
        });
      }
    });
  }

  // 3. Process direct participants array
  if (Array.isArray(participants)) {
    participants.forEach((p) => {
      if (!p) return;
      // Check if p is a raw RSVP wrapper with .user
      const isRsvpWrapper = 'user' in p && p.user;
      const user = isRsvpWrapper ? (p as RawRsvpItem).user : (p as ParticipantProfile);
      if (!user || !user.username) return;

      const rsvpResponse = (
        (isRsvpWrapper ? (p as RawRsvpItem).rsvp_status || (p as RawRsvpItem).response : (p as ParticipantProfile).rsvp_status || (p as ParticipantProfile).response) || 'going'
      ).toLowerCase();

      // STRICT FILTER: Only include "going" or "maybe"
      if (rsvpResponse !== 'going' && rsvpResponse !== 'maybe') return;

      const unameKey = user.username.toLowerCase();
      if (!seenUsernames.has(unameKey)) {
        seenUsernames.add(unameKey);
        normalizedList.push({
          id: user.id,
          username: user.username,
          photoUrl: user.photoUrl,
          rsvp_status: rsvpResponse,
          response: rsvpResponse,
          age: user.age,
          neighbourhood: user.neighbourhood,
          cityName: user.cityName,
        });
      }
    });
  }

  const goingList = normalizedList.filter((p) => (p.response || p.rsvp_status || '').toLowerCase() === 'going');
  const maybeList = normalizedList.filter((p) => (p.response || p.rsvp_status || '').toLowerCase() === 'maybe');

  const goingCount = Math.max(goingList.length, totalGoingCount || 0);
  const maybeCount = maybeList.length;
  const totalCount = goingCount + maybeCount;

  // Sliced visible items
  const visibleParticipants = normalizedList.slice(0, max);
  const remainingCount = Math.max(0, totalCount - visibleParticipants.length);

  let overflowSizeClasses = 'w-6 h-6 text-[10px]';
  if (size === 'xs') overflowSizeClasses = 'w-5 h-5 text-[9px]';
  else if (size === 'sm') overflowSizeClasses = 'w-6 h-6 text-[10px]';
  else if (size === 'md') overflowSizeClasses = 'w-8 h-8 text-xs';
  else if (size === 'lg') overflowSizeClasses = 'w-10 h-10 text-sm';

  return (
    <div className={`flex items-center gap-2 min-w-0 ${className}`}>
      {visibleParticipants.length > 0 ? (
        <div className="flex items-center -space-x-2 shrink-0">
          {visibleParticipants.map((participant) => (
            <SingleFacepileAvatar
              key={participant.id || participant.username}
              participant={participant}
              size={size}
              ringColorClass={ringColorClass}
            />
          ))}

          {/* Overflow Badge */}
          {remainingCount > 0 && (
            <div
              className={`relative inline-flex items-center justify-center rounded-full ${overflowSizeClasses} ring-2 ${ringColorClass} bg-[#F4EEE2] text-stone-700 font-bold shadow-2xs shrink-0 select-none z-10`}
              title={`+${remainingCount} more attendees`}
            >
              +{remainingCount}
            </div>
          )}
        </div>
      ) : (
        <div
          className={`${overflowSizeClasses} rounded-full bg-[#FAF8F5] border border-[#E2DBD0] flex items-center justify-center text-stone-400 shrink-0 select-none`}
        >
          <span className="text-[10px]">👥</span>
        </div>
      )}

      {/* Optional Descriptive Label */}
      {showLabel && (
        <div className="text-xs truncate font-medium text-stone-600">
          {totalCount > 0 ? (
            <span className="truncate">
              <strong className="text-stone-900 font-bold">{goingCount}</strong>{' '}
              {goingCount === 1 ? 'going' : 'going'}
              {maybeCount > 0 && (
                <span className="text-amber-800 font-semibold ml-1.5">
                  · {maybeCount} maybe
                </span>
              )}
            </span>
          ) : (
            <span className="text-stone-400 italic text-[11px]">{emptyLabel}</span>
          )}
        </div>
      )}
    </div>
  );
};

export default Facepile;