import React from 'react';
import { computeAffinity } from '../utils/ignoreStorage';
import { Avatar } from '../../../components/Avatar';

interface MeetTabProps {
  loading: boolean;
  suggestedUsers: any[];
  myHobbies: any[];
  fadingCardId: string | null;
  sentRequestUserIds?: (string | number)[];
  connectingUserId?: string | number | null;
  onConnect: (userId: string) => void;
  onIgnore: (userId: string) => void;
}

const CardSkeleton: React.FC = () => (
  <div className="bg-white border border-[#E2DBD0] rounded-3xl p-6 shadow-xs animate-pulse space-y-4">
    <div className="flex items-start justify-between gap-3">
      <div className="flex items-center gap-3">
        <div className="w-14 h-14 rounded-full bg-[#E2DBD0]" />
        <div className="space-y-2">
          <div className="h-4 bg-[#E2DBD0] rounded w-28" />
          <div className="h-3 bg-[#E2DBD0]/60 rounded w-20" />
        </div>
      </div>
      <div className="h-7 w-20 bg-[#E2DBD0]/50 rounded-full" />
    </div>
    <div className="h-3 bg-[#E2DBD0]/40 rounded w-full" />
    <div className="h-3 bg-[#E2DBD0]/40 rounded w-3/4" />
    <div className="flex gap-2 pt-2">
      {[1, 2, 3].map((i) => (
        <div key={i} className="h-6 w-16 bg-[#E2DBD0]/50 rounded-lg" />
      ))}
    </div>
    <div className="flex gap-2.5 pt-3">
      <div className="flex-1 h-10 bg-[#E2DBD0]/40 rounded-xl" />
      <div className="flex-1 h-10 bg-[#E2DBD0]/60 rounded-xl" />
    </div>
  </div>
);

export const SuggestionCard: React.FC<{
  user: any;
  myHobbies: any[];
  isFading: boolean;
  isSent: boolean;
  isConnecting: boolean;
  onConnect: (userId: string) => void;
  onIgnore: (userId: string) => void;
}> = ({
  user: usr,
  myHobbies,
  isFading,
  isSent,
  isConnecting,
  onConnect,
  onIgnore,
}) => {
  // Use backend computed match percentage or calculate client-side fallback
  const affinity = usr.matchPercentage ?? computeAffinity(myHobbies, usr.hobbies);

  // Intersect target's hobbies with logged-in user's hobbies (exact + related category)
  const myHobbyIds = new Set((myHobbies || []).map((mh: any) => String(mh.id)));
  const myCategoryIds = new Set(
    (myHobbies || [])
      .map((mh: any) => String(mh.category?.id || mh.categoryId || ''))
      .filter((id: string) => id && id !== 'undefined' && id !== 'null')
  );

  const sharedHobbyList = usr.sharedHobbies || (usr.hobbies || []).filter((hb: any) =>
    myHobbyIds.has(String(hb.id))
  );

  const relatedHobbyList = usr.relatedHobbies || (usr.hobbies || []).filter((hb: any) => {
    const isExact = myHobbyIds.has(String(hb.id));
    const catId = String(hb.category?.id || hb.categoryId || '');
    return !isExact && catId && myCategoryIds.has(catId);
  });

  const totalMatchingCount = sharedHobbyList.length + relatedHobbyList.length;

  return (
    <div
      className={`group bg-white border border-[#E2DBD0] rounded-3xl p-6 flex flex-col justify-between shadow-xs hover:shadow-md hover:border-[#2D5A3D]/40 transition-all duration-300 ${
        isFading ? 'opacity-0 scale-95 translate-y-3' : 'opacity-100 scale-100'
      }`}
    >
      <div>
        {/* Top Header: Avatar + User Info + % Match Affinity Badge */}
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="relative">
              <Avatar
                name={usr.username}
                photoUrl={usr.photoUrl}
                size="xl"
                className="w-14 h-14 border-2 border-white shadow-xs rounded-full ring-2 ring-[#2D5A3D]/10"
              />
              <span className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-emerald-500 border-2 border-white rounded-full" />
            </div>
            <div className="min-w-0">
              <h4 className="text-base font-semibold text-[#2C2C2C] truncate group-hover:text-[#2D5A3D] transition-colors">
                @{usr.username}
              </h4>
              {/* Geographic Proximity & Location */}
              <div className="flex items-center gap-1.5 text-xs text-[#8a8278] mt-0.5">
                <svg className="w-3.5 h-3.5 text-[#2D5A3D] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <span className="truncate">
                  {usr.distance !== undefined && usr.distance !== null
                    ? `${usr.distance} km away • ${usr.neighbourhood || usr.cityName || 'Local'}`
                    : usr.neighbourhood || usr.cityName || 'Local Member'}
                </span>
              </div>
            </div>
          </div>

          {/* % Match Affinity Pill */}
          {affinity > 0 && (
            <div
              className={`shrink-0 flex items-center gap-1 text-xs font-bold px-3 py-1.5 rounded-full shadow-2xs ${
                affinity >= 70
                  ? 'bg-gradient-to-r from-[#2D5A3D]/15 to-[#3d7a55]/20 text-[#2D5A3D] border border-[#2D5A3D]/25'
                  : 'bg-[#C47B5A]/15 text-[#C47B5A] border border-[#C47B5A]/25'
              }`}
            >
              <span className="text-[11px]">{affinity >= 70 ? '⚡' : '✨'}</span>
              <span>{affinity}% Match</span>
            </div>
          )}
        </div>

        {/* Bio */}
        {usr.bio ? (
          <p className="text-xs text-[#5a5450] line-clamp-2 mb-4 leading-relaxed bg-[#FDFBF7] p-3 rounded-2xl border border-[#E2DBD0]/40">
            "{usr.bio}"
          </p>
        ) : (
          <p className="text-xs text-[#8a8278]/80 italic mb-4">
            Passionate explorer excited to meet like-minded peers.
          </p>
        )}

        {/* Hobbies Badges: Render ONLY Matching & Related Hobbies */}
        <div className="space-y-2 mb-5">
          <div className="text-[11px] font-semibold text-[#8a8278] uppercase tracking-wider flex items-center justify-between">
            <span>Shared Passions</span>
            {totalMatchingCount > 0 && (
              <span className="text-[10px] text-[#2D5A3D] font-bold bg-[#eaf3ed] px-2 py-0.5 rounded-md">
                {totalMatchingCount} {totalMatchingCount === 1 ? 'match' : 'matches'}
              </span>
            )}
          </div>
          <div className="flex flex-wrap gap-1.5 min-h-[30px] items-center">
            {/* 1. Exact Shared Hobbies */}
            {sharedHobbyList.map((hb: any) => (
              <span
                key={`shared-${hb.id}`}
                className="text-[11px] px-2.5 py-1 rounded-xl font-semibold bg-[#eaf3ed] text-[#2D5A3D] border border-[#7aaa8a]/40 flex items-center gap-1 shadow-2xs"
                title="Shared exact interest"
              >
                <span>✦</span>
                <span>{hb.name}</span>
              </span>
            ))}

            {/* 2. Related Hobbies (Category match) */}
            {relatedHobbyList.map((hb: any) => (
              <span
                key={`related-${hb.id}`}
                className="text-[11px] px-2.5 py-1 rounded-xl font-medium bg-[#fdf6ed] text-[#C47B5A] border border-[#C47B5A]/30 flex items-center gap-1"
                title={`Related topic in ${hb.category?.name || 'shared category'}`}
              >
                <span className="text-[10px]">◈</span>
                <span>{hb.name}</span>
              </span>
            ))}

            {/* Fallback if no specific hobby match */}
            {totalMatchingCount === 0 && (
              <span className="text-[11px] px-2.5 py-1 rounded-xl font-normal bg-[#F4EEE2] text-[#8a8278] border border-[#E2DBD0]/60 italic">
                ✨ Local Community Explorer
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Card Footer Actions: Ignore & Connect */}
      <div className="flex items-center gap-2.5 pt-4 border-t border-[#E2DBD0]/60">
        <button
          type="button"
          onClick={() => onIgnore(String(usr.id))}
          className="flex-1 py-2.5 px-4 rounded-2xl border border-[#E2DBD0] text-[#8a8278] hover:text-rose-600 hover:border-rose-200 hover:bg-rose-50/60 text-xs font-semibold transition-all cursor-pointer flex items-center justify-center gap-1.5"
          title="Hide profile with 24-hour cooldown"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
          </svg>
          Ignore
        </button>

        {isSent ? (
          <button
            type="button"
            disabled
            className="flex-1 py-2.5 px-4 rounded-2xl bg-[#eaf3ed] text-[#2D5A3D] border border-[#7aaa8a]/40 text-xs font-semibold flex items-center justify-center gap-1.5 cursor-default shadow-xs"
          >
            <svg className="w-3.5 h-3.5 text-[#2D5A3D]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
            Request Sent
          </button>
        ) : (
          <button
            type="button"
            disabled={isConnecting}
            onClick={() => onConnect(String(usr.id))}
            className="flex-1 py-2.5 px-4 rounded-2xl bg-[#2D5A3D] text-white hover:bg-[#3d7a55] text-xs font-semibold transition-all shadow-xs hover:shadow-md cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1.5"
          >
            {isConnecting ? (
              <>
                <svg className="animate-spin w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Sending...
              </>
            ) : (
              <>
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                </svg>
                Connect
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
};

export const MeetTab: React.FC<MeetTabProps> = ({
  loading,
  suggestedUsers,
  myHobbies,
  fadingCardId,
  sentRequestUserIds = [],
  connectingUserId = null,
  onConnect,
  onIgnore,
}) => {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h3 className="text-xl font-serif font-semibold text-[#2D5A3D]">Nearby Match Suggestions</h3>
          <p className="text-xs text-[#8a8278] mt-0.5">
            Strictly location-filtered members ranked by hobby affinity. Connect to build genuine bonds.
          </p>
        </div>
        {suggestedUsers.length > 0 && !loading && (
          <span className="text-xs bg-[#eaf3ed] text-[#2D5A3D] px-3 py-1 rounded-full font-semibold self-start sm:self-auto border border-[#7aaa8a]/30">
            {suggestedUsers.length} {suggestedUsers.length === 1 ? 'member' : 'members'} nearby
          </span>
        )}
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <CardSkeleton key={i} />
          ))}
        </div>
      ) : suggestedUsers.length === 0 ? (
        <div className="bg-white border border-[#E2DBD0] rounded-3xl p-12 text-center shadow-xs space-y-3 max-w-lg mx-auto">
          <span className="text-5xl block">🌿</span>
          <h4 className="text-base font-semibold text-[#2D5A3D]">You're all caught up!</h4>
          <p className="text-xs text-[#8a8278] leading-relaxed">
            There are no new unreviewed profiles in your local radius right now. Check back as new members join, or invite friends to your community!
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {suggestedUsers.map((usr: any) => {
            const isFading = fadingCardId === String(usr.id);
            const isSent = sentRequestUserIds.some((id) => String(id) === String(usr.id));
            const isConnecting = String(connectingUserId) === String(usr.id);

            return (
              <SuggestionCard
                key={usr.id}
                user={usr}
                myHobbies={myHobbies}
                isFading={isFading}
                isSent={isSent}
                isConnecting={isConnecting}
                onConnect={onConnect}
                onIgnore={onIgnore}
              />
            );
          })}
        </div>
      )}
    </div>
  );
};

export default MeetTab;
