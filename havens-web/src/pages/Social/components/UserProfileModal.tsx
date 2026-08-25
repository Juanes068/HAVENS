import React from 'react';
import { Avatar } from '../../../components/Avatar';
import { computeAffinity } from '../utils/ignoreStorage';
import { Zap, Sparkles, MessageSquare } from 'lucide-react';

interface UserProfileModalProps {
  user: any | null;
  currentUser: any;
  myHobbies: any[];
  isSent?: boolean;
  isConnected?: boolean;
  isConnecting?: boolean;
  onClose: () => void;
  onConnect?: (userId: string) => void;
  onOpenChat?: (userId: string, matchId?: string) => void;
}

export const UserProfileModal: React.FC<UserProfileModalProps> = ({
  user,
  currentUser,
  myHobbies = [],
  isSent = false,
  isConnected = false,
  isConnecting = false,
  onClose,
  onConnect,
  onOpenChat,
}) => {
  if (!user) return null;

  // Compute affinity score
  const affinity = user.matchPercentage ?? computeAffinity(myHobbies, user.hobbies);

  // Separate exact shared and category-related hobbies
  const myHobbyIds = new Set(myHobbies.map((mh: any) => String(mh.id)));
  const myCategoryIds = new Set(
    myHobbies
      .map((mh: any) => String(mh.category?.id || mh.categoryId || ''))
      .filter((id: string) => id && id !== 'undefined' && id !== 'null')
  );

  const sharedHobbyList = user.sharedHobbies || (user.hobbies || []).filter((hb: any) =>
    myHobbyIds.has(String(hb.id))
  );

  const relatedHobbyList = user.relatedHobbies || (user.hobbies || []).filter((hb: any) => {
    const isExact = myHobbyIds.has(String(hb.id));
    const catId = String(hb.category?.id || hb.categoryId || '');
    return !isExact && catId && myCategoryIds.has(catId);
  });

  const otherHobbies = (user.hobbies || []).filter((hb: any) => {
    const isExact = myHobbyIds.has(String(hb.id));
    const catId = String(hb.category?.id || hb.categoryId || '');
    const isRelated = !isExact && catId && myCategoryIds.has(catId);
    return !isExact && !isRelated;
  });

  const isSelf = currentUser && String(currentUser.id) === String(user.id);

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-150">
      <div className="bg-white border border-[#E2DBD0] rounded-3xl p-6 sm:p-8 max-w-xl w-full shadow-2xl space-y-5 animate-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
        
        {/* Cover / Avatar Header Bar */}
        <div className="relative flex items-start justify-between pb-4 border-b border-[#E2DBD0]/60">
          <div className="flex items-center gap-4.5 min-w-0">
            <div className="relative shrink-0">
              <Avatar
                name={user.username}
                photoUrl={user.photoUrl}
                size="xl"
                className="w-18 h-18 sm:w-20 sm:h-20 text-2xl sm:text-3xl border-2 border-white shadow-md rounded-full ring-2 ring-[#2D5A3D]/20"
              />
              <span className="absolute bottom-0 right-0 w-4.5 h-4.5 bg-emerald-500 border-2 border-white rounded-full" />
            </div>

            <div className="min-w-0">
              <span className="text-xs font-bold text-[#C47B5A] uppercase tracking-wider block">
                📍 {user.neighbourhood || user.cityName || 'Local Community Member'}
                {user.distance !== undefined && user.distance !== null ? ` • ${user.distance.toFixed(1)} km away` : ''}
              </span>
              <div className="flex flex-wrap items-center gap-2 mt-1">
                <h3 className="text-xl sm:text-2xl font-serif font-bold text-[#2D5A3D] truncate">
                  @{user.username}
                </h3>
                {user.age ? (
                  <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-[#FAF8F5] border border-[#E2DBD0] text-stone-700 shadow-2xs">
                    {user.age} years old
                  </span>
                ) : null}
              </div>
              {user.totalPoints !== undefined && (
                <p className="text-xs text-[#8a8278] font-medium mt-0.5">
                  ⭐ {user.totalPoints} Havens Points
                </p>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="text-stone-400 hover:text-stone-700 hover:bg-[#F4EEE2] p-2 rounded-full cursor-pointer transition-colors shrink-0"
            title="Close"
          >
            ✕
          </button>
        </div>

        {/* Bio Section */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold uppercase tracking-wider text-stone-700">About</h4>
            {user.dateOfBirth && (
              <span className="text-[11px] text-stone-400">
                Born {new Date(user.dateOfBirth).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
              </span>
            )}
          </div>
          <div className="text-sm text-stone-700 leading-relaxed bg-[#FAF8F5] p-4 sm:p-5 rounded-2xl border border-[#E2DBD0]/70 font-normal">
            {user.bio ? (
              <p className="italic leading-relaxed whitespace-pre-wrap">"{user.bio}"</p>
            ) : (
              <p className="text-stone-400 italic">Passionate member looking to meet like-minded peers and explore local gatherings.</p>
            )}
          </div>
        </div>

        {/* Passions and Interests Taxonomy */}
        {user.hobbies && user.hobbies.length > 0 && (
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-stone-700">Member Passions & Topics</span>
              <span className="text-xs text-[#8a8278] font-medium">
                {user.hobbies.length} {user.hobbies.length === 1 ? 'interest' : 'interests'}
              </span>
            </div>

            <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto pr-1">
              {/* 1. Exact shared hobbies */}
              {sharedHobbyList.map((hb: any) => (
                <span
                  key={`modal-shared-${hb.id}`}
                  className="text-xs px-3 py-1.5 rounded-xl font-semibold bg-[#eaf3ed] text-[#2D5A3D] border border-[#7aaa8a]/40 shadow-2xs flex items-center gap-1.5"
                  title="Shared exact interest"
                >
                  <span className="text-emerald-700">✦</span>
                  <span>#{hb.name}</span>
                </span>
              ))}

              {/* 2. Related category hobbies */}
              {relatedHobbyList.map((hb: any) => (
                <span
                  key={`modal-related-${hb.id}`}
                  className="text-xs px-3 py-1.5 rounded-xl font-medium bg-[#fdf6ed] text-[#C47B5A] border border-[#C47B5A]/30 flex items-center gap-1.5"
                  title={`Related topic in ${hb.category?.name || 'shared category'}`}
                >
                  <span className="text-[10px]">◈</span>
                  <span>#{hb.name}</span>
                </span>
              ))}

              {/* 3. Other hobbies */}
              {otherHobbies.map((hb: any) => (
                <span
                  key={`modal-other-${hb.id}`}
                  className="text-xs px-3 py-1.5 rounded-xl font-normal bg-[#F4EEE2] text-[#5a5450] border border-[#E2DBD0]/60"
                >
                  #{hb.name}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Affinity Score Banner */}
        <div className="p-3.5 bg-[#FAF8F5] border border-[#E2DBD0] rounded-2xl flex items-center justify-between text-xs text-stone-700">
          <span className="flex items-center gap-2 font-medium">
            {affinity >= 70 ? <Zap className="w-4 h-4 text-[#2D5A3D]" /> : <Sparkles className="w-4 h-4 text-[#C47B5A]" />}
            <span>Community Affinity Score</span>
          </span>
          <span className="font-bold text-sm text-[#2D5A3D]">{affinity}% Match</span>
        </div>

        {/* Action Buttons Footer */}
        <div className="pt-3 flex items-center justify-end gap-3 border-t border-[#E2DBD0]/60">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl border border-[#E2DBD0] text-xs font-semibold text-stone-600 hover:bg-[#F4EEE2] transition-colors cursor-pointer"
          >
            Close
          </button>

          {!isSelf && (
            isConnected ? (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  if (onOpenChat) {
                    onOpenChat(String(user.id), user.matchId);
                  }
                }}
                className="px-6 py-2.5 rounded-xl bg-[#2D5A3D] text-white text-xs font-bold hover:bg-[#3d7a55] transition-all shadow-xs cursor-pointer flex items-center gap-2"
              >
                <MessageSquare className="w-4 h-4" />
                <span>Open Chat</span>
              </button>
            ) : isSent ? (
              <button
                type="button"
                disabled
                className="px-6 py-2.5 rounded-xl bg-[#eaf3ed] text-[#2D5A3D] border border-[#7aaa8a]/40 text-xs font-bold cursor-default shadow-2xs"
              >
                ✓ Request Sent
              </button>
            ) : (
              <button
                type="button"
                disabled={isConnecting}
                onClick={() => {
                  if (onConnect) {
                    onConnect(String(user.id));
                  }
                  onClose();
                }}
                className="px-6 py-2.5 rounded-xl bg-[#2D5A3D] text-white text-xs font-bold hover:bg-[#3d7a55] transition-all shadow-xs cursor-pointer disabled:opacity-50 flex items-center gap-2"
              >
                {isConnecting ? (
                  <span>Sending...</span>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                    </svg>
                    <span>Connect Now</span>
                  </>
                )}
              </button>
            )
          )}
        </div>
      </div>
    </div>
  );
};
