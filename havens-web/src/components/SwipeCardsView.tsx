import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useMutation } from '@apollo/client';
import { SWIPE_EVENT } from '../graphql/operations';
import { Avatar } from './Avatar';
import { Check, HelpCircle, Compass, Calendar, MapPin, Sparkles } from 'lucide-react';

export interface EventItem {
  id: string;
  title: string;
  description: string;
  latitude: number;
  longitude: number;
  pointsReward?: number;
  visibility?: string;
  trustScore?: number;
  imageUrl?: string;
  locationName?: string;
  scheduledDate?: string;
  ageRange?: string;
  goingCount?: number;
  creator?: {
    id: string;
    username: string;
    photoUrl?: string;
  };
  attendees?: {
    id: string;
    username: string;
    photoUrl?: string;
    age?: number;
    neighbourhood?: string;
    cityName?: string;
  }[];
  rsvps?: {
    id: string;
    response: string;
    user: {
      id: string;
      username: string;
      photoUrl?: string;
    };
  }[];
  hobbies?: {
    id: string;
    name: string;
  }[];
}

interface SwipeCardsViewProps {
  events: EventItem[];
  onRefetch?: () => void;
}

type ToastType = 'pass' | 'rsvp' | 'maybe';

interface ToastState {
  msg: string;
  type: ToastType;
}

export const SwipeCardsView: React.FC<SwipeCardsViewProps> = ({ events, onRefetch }) => {
  const [sessionSkippedIds, setSessionSkippedIds] = useState<string[]>([]);
  const [toast, setToast] = useState<ToastState | null>(null);

  // Drag physics state
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [exitDirection, setExitDirection] = useState<'left' | 'right' | 'up' | null>(null);

  const dragStartPos = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const isLockedRef = useRef(false);
  const toastTimeoutRef = useRef<any>(null);

  // GraphQL Swipe Event Mutation with cache refetch
  const [swipeEventMutation] = useMutation(SWIPE_EVENT, {
    refetchQueries: ['MyRsvps', 'GetAllEvents'],
  });

  // Active stack filtering out swiped / skipped cards
  const activeEvents = useMemo(() => {
    return events.filter((e) => !sessionSkippedIds.includes(String(e.id)));
  }, [events, sessionSkippedIds]);

  const currentEvent = activeEvents[0];
  const nextEvent = activeEvents[1];
  const thirdEvent = activeEvents[2];

  const showToast = (msg: string, type: ToastType) => {
    setToast({ msg, type });
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    toastTimeoutRef.current = setTimeout(() => setToast(null), 3000);
  };

  // ─────────────────────────────────────────────────────────────
  // SWIPE ACTION HANDLERS WITH NON-BLOCKING TOAST NOTIFICATIONS
  // ─────────────────────────────────────────────────────────────
  const triggerSwipeRight = async () => {
    if (!currentEvent || isLockedRef.current) return;
    const eventTitle = currentEvent.title;
    const eventId = String(currentEvent.id);
    isLockedRef.current = true;
    setExitDirection('right');

    setTimeout(async () => {
      try {
        setSessionSkippedIds((prev) => [...prev, eventId]);
        const res = await swipeEventMutation({
          variables: {
            eventId: parseInt(eventId, 10),
            response: 'going',
          },
        });

        if (res?.data?.swipeEvent?.success) {
          showToast(`✓ RSVP Confirmed for "${eventTitle}"!`, 'rsvp');
        }
      } catch (err: any) {
        console.error('[Swipe Right Error]', err);
      } finally {
        setExitDirection(null);
        setDragOffset({ x: 0, y: 0 });
        isLockedRef.current = false;
        if (onRefetch) onRefetch();
      }
    }, 250);
  };

  const triggerSwipeLeft = async () => {
    if (!currentEvent || isLockedRef.current) return;
    const eventTitle = currentEvent.title;
    const eventId = String(currentEvent.id);
    isLockedRef.current = true;
    setExitDirection('left');

    setTimeout(async () => {
      try {
        setSessionSkippedIds((prev) => [...prev, eventId]);
        await swipeEventMutation({
          variables: {
            eventId: parseInt(eventId, 10),
            response: 'pass',
          },
        });
        showToast(`✕ Passed "${eventTitle}" — Archived from feed.`, 'pass');
      } catch (err: any) {
        console.error('[Swipe Left Error]', err);
      } finally {
        setExitDirection(null);
        setDragOffset({ x: 0, y: 0 });
        isLockedRef.current = false;
        if (onRefetch) onRefetch();
      }
    }, 250);
  };

  const triggerSwipeUp = async () => {
    if (!currentEvent || isLockedRef.current) return;
    const eventTitle = currentEvent.title;
    const eventId = String(currentEvent.id);
    isLockedRef.current = true;
    setExitDirection('up');

    setTimeout(async () => {
      try {
        setSessionSkippedIds((prev) => [...prev, eventId]);
        await swipeEventMutation({
          variables: {
            eventId: parseInt(eventId, 10),
            response: 'maybe',
          },
        });
        showToast(`? Marked "${eventTitle}" as Maybe — Saved to Calendar.`, 'maybe');
      } catch (err: any) {
        console.error('[Swipe Up Error]', err);
      } finally {
        setExitDirection(null);
        setDragOffset({ x: 0, y: 0 });
        isLockedRef.current = false;
        if (onRefetch) onRefetch();
      }
    }, 250);
  };

  // KEYBOARD NAVIGATION (ARROW KEYS EFFECT)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeTag = document.activeElement?.tagName.toLowerCase();
      if (activeTag === 'input' || activeTag === 'textarea') return;

      if (e.key === 'ArrowRight') {
        e.preventDefault();
        triggerSwipeRight();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        triggerSwipeLeft();
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        triggerSwipeUp();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [activeEvents, currentEvent]);

  // MOUSE & TOUCH DRAG MECHANICS
  const handleStart = (clientX: number, clientY: number) => {
    if (isLockedRef.current) return;
    setIsDragging(true);
    dragStartPos.current = { x: clientX, y: clientY };
  };

  const handleMove = (clientX: number, clientY: number) => {
    if (!isDragging || isLockedRef.current) return;
    const deltaX = clientX - dragStartPos.current.x;
    const deltaY = clientY - dragStartPos.current.y;
    setDragOffset({ x: deltaX, y: deltaY });
  };

  const handleEnd = () => {
    if (!isDragging || isLockedRef.current) return;
    setIsDragging(false);

    const SWIPE_THRESHOLD_X = 110;
    const SWIPE_THRESHOLD_Y = -90;

    if (dragOffset.x > SWIPE_THRESHOLD_X) {
      triggerSwipeRight();
    } else if (dragOffset.x < -SWIPE_THRESHOLD_X) {
      triggerSwipeLeft();
    } else if (dragOffset.y < SWIPE_THRESHOLD_Y) {
      triggerSwipeUp();
    } else {
      setDragOffset({ x: 0, y: 0 });
    }
  };

  if (!currentEvent) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[520px] max-w-md mx-auto p-8 text-center bg-white border border-[#E2DBD0] rounded-3xl shadow-sm space-y-4 antialiased">
        <div className="w-16 h-16 rounded-full bg-[#eaf3ed] text-[#2D5A3D] flex items-center justify-center shadow-xs">
          <Compass className="w-8 h-8 text-[#2D5A3D]" />
        </div>
        <div>
          <h3 className="text-xl font-serif font-bold text-[#2D5A3D]">
            You're All Caught Up!
          </h3>
          <p className="text-xs text-[#8a8278] mt-2 leading-relaxed">
            No more unswiped events in your area. Switch to Interactive Map mode to explore all local gathering pins and markers!
          </p>
        </div>
      </div>
    );
  }

  // Calculate dynamic drag rotation and underneath card scale factor
  const rotationDeg = dragOffset.x * 0.06;
  const dragRatio = Math.min(Math.abs(dragOffset.x) / 120, 1);
  const subCardScale = 0.95 + dragRatio * 0.05;
  const subCardOpacity = 0.75 + dragRatio * 0.25;

  let transformStyle = `translate3d(${dragOffset.x}px, ${dragOffset.y}px, 0px) rotate(${rotationDeg}deg)`;
  if (exitDirection === 'right') transformStyle = `translate3d(600px, ${dragOffset.y}px, 0px) rotate(25deg)`;
  if (exitDirection === 'left') transformStyle = `translate3d(-600px, ${dragOffset.y}px, 0px) rotate(-25deg)`;
  if (exitDirection === 'up') transformStyle = `translate3d(0px, -600px, 0px) rotate(0deg)`;

  return (
    <div className="flex flex-col items-center justify-center space-y-5 py-2 antialiased select-none relative">
      
      {/* Non-Blocking Floating Toast Notification Overlay */}
      {toast && (
        <div
          className={`fixed top-20 z-50 px-4 py-2.5 rounded-2xl text-xs font-semibold shadow-md backdrop-blur-md pointer-events-none transition-all duration-300 animate-bounce ${
            toast.type === 'pass'
              ? 'bg-rose-900/90 text-rose-100 border border-rose-700/50'
              : toast.type === 'rsvp'
              ? 'bg-[#2D5A3D]/95 text-emerald-100 border border-[#7aaa8a]/50'
              : 'bg-amber-950/90 text-amber-100 border border-amber-700/50'
          }`}
        >
          {toast.msg}
        </div>
      )}

      {/* STACKED SWIPE DECK CONTAINER */}
      <div className="w-full max-w-md h-[560px] relative">
        
        {/* 3rd Card in Stack */}
        {thirdEvent && (
          <div
            className="w-full h-full absolute inset-0 rounded-3xl overflow-hidden shadow-md border border-white/10 pointer-events-none transition-all duration-300"
            style={{
              transform: 'scale(0.90) translateY(16px)',
              opacity: 0.5,
            }}
          >
            {thirdEvent.imageUrl ? (
              <img
                src={thirdEvent.imageUrl}
                alt=""
                className="w-full h-full object-cover"
                onError={(e) => {
                  e.currentTarget.style.display = 'none'
                }}
              />
            ) : null}
            <div className={`w-full h-full bg-[#1b3826] ${thirdEvent.imageUrl ? 'hidden' : ''}`} />
          </div>
        )}

        {/* 2nd Card in Stack */}
        {nextEvent && (
          <div
            className="w-full h-full absolute inset-0 rounded-3xl overflow-hidden shadow-lg border border-white/15 pointer-events-none transition-transform duration-150"
            style={{
              transform: `scale(${subCardScale}) translateY(${10 - dragRatio * 8}px)`,
              opacity: subCardOpacity,
            }}
          >
            {nextEvent.imageUrl ? (
              <img
                src={nextEvent.imageUrl}
                alt=""
                className="w-full h-full object-cover"
                onError={(e) => {
                  e.currentTarget.style.display = 'none'
                }}
              />
            ) : null}
            <div className={`w-full h-full bg-gradient-to-br from-[#2D5A3D] to-slate-900 flex items-center justify-center text-white/40 font-serif font-bold text-4xl ${nextEvent.imageUrl ? 'hidden' : ''}`}>
              {nextEvent.title.charAt(0)}
            </div>
            <div className="absolute inset-0 bg-black/40" />
          </div>
        )}

        {/* 1st Card in Stack (TOP INTERACTIVE CARD) */}
        <div
          onMouseDown={(e) => handleStart(e.clientX, e.clientY)}
          onMouseMove={(e) => handleMove(e.clientX, e.clientY)}
          onMouseUp={handleEnd}
          onMouseLeave={handleEnd}
          onTouchStart={(e) => handleStart(e.touches[0].clientX, e.touches[0].clientY)}
          onTouchMove={(e) => handleMove(e.touches[0].clientX, e.touches[0].clientY)}
          onTouchEnd={handleEnd}
          style={{
            transform: transformStyle,
            transition: isDragging ? 'none' : 'transform 0.25s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
          }}
          className="w-full h-full absolute inset-0 rounded-3xl overflow-hidden shadow-2xl border border-white/20 cursor-grab active:cursor-grabbing touch-none z-20"
        >
          {/* Background Image or Forest Gradient Fallback */}
          {currentEvent.imageUrl ? (
            <img
              src={currentEvent.imageUrl}
              alt={currentEvent.title}
              className="w-full h-full object-cover pointer-events-none"
              onError={(e) => {
                e.currentTarget.style.display = 'none'
              }}
            />
          ) : null}
          <div className={`w-full h-full bg-gradient-to-br from-[#2D5A3D] via-[#1b3826] to-slate-950 flex items-center justify-center p-8 text-center pointer-events-none ${currentEvent.imageUrl ? 'hidden' : ''}`}>
            <span className="text-6xl font-serif font-bold text-white/20 lowercase">
              {currentEvent.title.charAt(0)}
            </span>
          </div>

          {/* Drag Overlay Badges */}
          {dragOffset.x > 30 && (
            <div className="absolute top-8 left-8 border-4 border-emerald-400 text-emerald-400 font-bold text-2xl px-4 py-1.5 rounded-2xl rotate-[-15deg] uppercase tracking-wider backdrop-blur-xs bg-black/20 pointer-events-none z-30 animate-pulse">
              RSVP ✓
            </div>
          )}
          {dragOffset.x < -30 && (
            <div className="absolute top-8 right-8 border-4 border-rose-400 text-rose-400 font-bold text-2xl px-4 py-1.5 rounded-2xl rotate-[15deg] uppercase tracking-wider backdrop-blur-xs bg-black/20 pointer-events-none z-30 animate-pulse">
              PASS ✕
            </div>
          )}
          {dragOffset.y < -30 && Math.abs(dragOffset.x) < 30 && (
            <div className="absolute top-8 left-1/2 -translate-x-1/2 border-4 border-amber-400 text-amber-400 font-bold text-2xl px-4 py-1.5 rounded-2xl uppercase tracking-wider backdrop-blur-xs bg-black/20 pointer-events-none z-30 animate-pulse">
              MAYBE
            </div>
          )}

          {/* Soft Dark Gradient Overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/40 to-black/20 flex flex-col justify-between p-6 text-white pointer-events-none">
            
            {/* Top Badges Bar */}
            <div className="flex items-center justify-between z-10">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[11px] font-bold px-3 py-1 rounded-full bg-white/20 backdrop-blur-md uppercase tracking-wider text-white">
                  {currentEvent.visibility || 'Public'}
                </span>
                {currentEvent.ageRange && (
                  <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-white/20 backdrop-blur-md text-white">
                    🎂 {currentEvent.ageRange}
                  </span>
                )}
                {currentEvent.pointsReward && (
                  <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-amber-500/80 backdrop-blur-md text-white">
                    ⭐ +{currentEvent.pointsReward} pts
                  </span>
                )}
              </div>

              <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-[#2D5A3D]/80 backdrop-blur-md text-white">
                🛡️ {currentEvent.trustScore ? `${currentEvent.trustScore * 10}% Trust` : 'Verified'}
              </span>
            </div>

            {/* Bottom Event Details Bar */}
            <div className="space-y-3 z-10">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                {currentEvent.creator && (
                  <div className="flex items-center gap-2.5 bg-black/40 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10">
                    <Avatar
                      name={currentEvent.creator.username}
                      photoUrl={currentEvent.creator.photoUrl}
                      size="sm"
                      className="w-6 h-6"
                    />
                    <span className="text-xs font-semibold text-white/90">
                      @{currentEvent.creator.username}
                    </span>
                  </div>
                )}

                {/* Going Attendees Preview & Count */}
                {((currentEvent.goingCount && currentEvent.goingCount > 0) || (currentEvent.attendees && currentEvent.attendees.length > 0)) && (
                  <div className="flex items-center gap-1.5 bg-black/40 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10">
                    <div className="flex items-center -space-x-1.5">
                      {(currentEvent.attendees || []).slice(0, 3).map((att: any) => (
                        <Avatar
                          key={att.id}
                          name={att.username}
                          photoUrl={att.photoUrl}
                          size="xs"
                          className="w-5 h-5 rounded-full border border-white/40"
                          title={`@${att.username}`}
                        />
                      ))}
                    </div>
                    <span className="text-[11px] font-bold text-emerald-300">
                      👥 {currentEvent.goingCount || currentEvent.attendees?.length || 1} Going
                    </span>
                  </div>
                )}
              </div>


              {/* Prominent Scheduled Date & Time Badge */}
              {currentEvent.scheduledDate && !isNaN(new Date(currentEvent.scheduledDate).getTime()) && (
                <div className="flex items-center gap-2 bg-[#2D5A3D]/95 backdrop-blur-md px-3.5 py-1.5 rounded-2xl border border-white/20 w-max shadow-sm">
                  <Calendar className="w-4 h-4 text-emerald-300 shrink-0" />
                  <div className="text-xs font-bold text-white flex items-center gap-1.5">
                    <span>
                      {new Intl.DateTimeFormat('en-US', {
                        weekday: 'short',
                        month: 'short',
                        day: 'numeric',
                      }).format(new Date(currentEvent.scheduledDate))}
                    </span>
                    <span className="text-emerald-300">•</span>
                    <span className="font-normal text-white/90">
                      {new Intl.DateTimeFormat('en-US', {
                        hour: 'numeric',
                        minute: '2-digit',
                        hour12: true,
                      }).format(new Date(currentEvent.scheduledDate))}
                    </span>
                  </div>
                </div>
              )}

              <div>
                <h2 className="text-2xl font-serif font-bold text-white leading-tight drop-shadow-sm">
                  {currentEvent.title}
                </h2>
                <p className="text-xs text-white/80 mt-1">
                  📍 {currentEvent.locationName || 'Nearby'}
                </p>
              </div>

              <p className="text-xs text-white/90 line-clamp-3 font-normal leading-relaxed">
                {currentEvent.description}
              </p>

              {currentEvent.hobbies && currentEvent.hobbies.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {currentEvent.hobbies.map((hb) => (
                    <span
                      key={hb.id}
                      className="text-[10px] font-semibold px-2.5 py-0.5 rounded-full bg-white/20 backdrop-blur-xs text-white/90"
                    >
                      #{hb.name}
                    </span>
                  ))}
                </div>
              )}
            </div>

          </div>
        </div>

      </div>

      {/* Swipe Action Controls Bar */}
      <div className="flex items-center gap-6 pt-2">
        {/* Pass (Swipe Left) */}
        <button
          type="button"
          onClick={triggerSwipeLeft}
          title="Pass / Skip (Left Arrow / Swipe Left)"
          className="w-14 h-14 rounded-full bg-white border border-rose-200 text-rose-600 hover:bg-rose-50 flex items-center justify-center text-xl font-bold shadow-md hover:scale-110 active:scale-95 transition-all cursor-pointer"
        >
          ✕
        </button>

        {/* Maybe (Swipe Up Session Skip) */}
        <button
          type="button"
          onClick={triggerSwipeUp}
          title="Maybe Later (Up Arrow / Swipe Up)"
          className="w-12 h-12 rounded-full bg-white border border-amber-200 text-amber-600 hover:bg-amber-50 flex items-center justify-center text-sm font-bold shadow-md hover:scale-110 active:scale-95 transition-all cursor-pointer"
        >
          <HelpCircle className="w-5 h-5" />
        </button>

        {/* RSVP (Swipe Right) */}
        <button
          type="button"
          onClick={triggerSwipeRight}
          title="RSVP / I'm In! (Right Arrow / Swipe Right)"
          className="w-14 h-14 rounded-full bg-[#2D5A3D] text-white hover:bg-[#3d7a55] flex items-center justify-center text-xl font-bold shadow-lg hover:scale-110 active:scale-95 transition-all cursor-pointer"
        >
          <Check className="w-6 h-6 stroke-[3]" />
        </button>
      </div>

      {/* Keyboard Shortcuts Guide */}
      <p className="text-[11px] text-[#8a8278] font-mono flex items-center gap-2">
        <span>Shortcuts:</span>
        <kbd className="bg-[#E2DBD0]/60 px-1.5 py-0.5 rounded border border-[#E2DBD0] text-[10px]">← Left</kbd> Pass
        <span>•</span>
        <kbd className="bg-[#E2DBD0]/60 px-1.5 py-0.5 rounded border border-[#E2DBD0] text-[10px]">↑ Up</kbd> Maybe
        <span>•</span>
        <kbd className="bg-[#E2DBD0]/60 px-1.5 py-0.5 rounded border border-[#E2DBD0] text-[10px]">→ Right</kbd> RSVP
      </p>
    </div>
  );
};
