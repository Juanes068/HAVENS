import React, { useState, useMemo } from 'react';
import { useQuery } from '@apollo/client';
import { useNavigate } from 'react-router-dom';
import { computeAffinity } from '../utils/ignoreStorage';
import { Avatar } from '../../../components/Avatar';
import { Zap, Sparkles, Compass, Search, UserCheck } from 'lucide-react';
import { UserProfileModal } from './UserProfileModal';
import { useAuth } from '../../../context/AuthContext';
import { SEARCH_USERS } from '../../../graphql/operations';

interface MeetTabProps {
  loading: boolean;
  suggestedUsers: any[];
  myHobbies: any[];
  fadingCardId: string | null;
  sentRequestUserIds?: (string | number)[];
  connectingUserId?: string | number | null;
  hasMore?: boolean;
  loadingMore?: boolean;
  onLoadMore?: () => void;
  onConnect: (userId: string) => void;
  onIgnore: (userId: string) => void;
  onOpenChat?: (userId: string, matchId?: string) => void;
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
  onExplore: (user: any) => void;
}> = ({
  user: usr,
  myHobbies,
  isFading,
  isSent,
  isConnecting,
  onConnect,
  onIgnore,
  onExplore,
}) => {
  const navigate = useNavigate();
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

  const matchingHobbies = [...sharedHobbyList, ...relatedHobbyList];
  const displayHobbies = matchingHobbies.length > 0
    ? matchingHobbies.slice(0, 4)
    : (usr.hobbies || []).slice(0, 4);
  const remainingCount = Math.max(0, (matchingHobbies.length > 0 ? matchingHobbies.length : (usr.hobbies?.length || 0)) - 4);

  return (
    <div
      onClick={() => navigate(`/profile/${usr.username || usr.id}`)}
      className={`group bg-white border border-[#E2DBD0] hover:border-[#2D5A3D]/50 rounded-3xl p-5 sm:p-5.5 flex flex-col justify-between shadow-xs hover:shadow-md transition-all duration-200 cursor-pointer ${
        isFading ? 'opacity-0 scale-95 translate-y-3' : 'opacity-100 scale-100'
      }`}
    >
      <div>
        {/* Header: Avatar + User Info + % Match Pill */}
        <div className="flex items-start justify-between gap-3 mb-3.5">
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="relative shrink-0">
              <Avatar
                name={usr.username}
                photoUrl={usr.photoUrl}
                size="lg"
                className="w-13 h-13 sm:w-14 sm:h-14 border-2 border-white shadow-xs rounded-full ring-1 ring-[#2D5A3D]/20 group-hover:ring-[#2D5A3D]/50 transition-all"
              />
              <span className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-emerald-500 border-2 border-white rounded-full" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h4 className="text-base font-semibold text-[#2C2C2C] truncate group-hover:text-[#2D5A3D] transition-colors">
                  @{usr.username}
                </h4>
                {usr.age ? (
                  <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-[#FAF8F5] border border-[#E2DBD0] text-stone-700 shadow-2xs">
                    {usr.age} yrs
                  </span>
                ) : null}
              </div>
              {/* Location */}
              <div className="flex items-center gap-1 text-xs text-[#8a8278] mt-0.5 truncate">
                <svg className="w-3.5 h-3.5 text-[#C47B5A] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <span className="truncate">
                  {usr.distance !== undefined && usr.distance !== null
                    ? `${usr.distance.toFixed(1)} km · ${usr.neighbourhood || usr.cityName || 'Local'}`
                    : usr.neighbourhood || usr.cityName || 'Local Member'}
                </span>
              </div>
            </div>
          </div>

          {/* % Match Affinity Pill */}
          {affinity > 0 ? (
            <div
              className={`shrink-0 flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full shadow-2xs ${
                affinity >= 70
                  ? 'bg-[#eaf3ed] text-[#2D5A3D] border border-[#7aaa8a]/30'
                  : 'bg-[#fdf6ed] text-[#C47B5A] border border-[#C47B5A]/25'
              }`}
            >
              {affinity >= 70 ? <Zap className="w-3.5 h-3.5 text-[#2D5A3D]" /> : <Sparkles className="w-3.5 h-3.5 text-[#C47B5A]" />}
              <span>{affinity}%</span>
            </div>
          ) : (
            <div className="shrink-0 flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-[#FAF8F5] text-[#8a8278] border border-[#E2DBD0]">
              <span>0% Match</span>
            </div>
          )}
        </div>

        {/* Compact Shared Hobbies (Strictly Max 4) */}
        <div className="flex flex-wrap gap-1.5 mb-4 min-h-[28px] items-center">
          {displayHobbies.map((hb: any) => {
            const isExact = myHobbyIds.has(String(hb.id));
            const isRelated = !isExact && hb.category?.id && myCategoryIds.has(String(hb.category.id));

            return (
              <span
                key={`shared-${hb.id}`}
                className={`text-[11px] px-2.5 py-1 rounded-xl font-medium border ${
                  isExact
                    ? 'bg-[#eaf3ed] text-[#2D5A3D] border-[#7aaa8a]/30 font-semibold shadow-2xs'
                    : isRelated
                    ? 'bg-[#fdf6ed] text-[#C47B5A] border-[#C47B5A]/30'
                    : 'bg-[#F4EEE2] text-[#6b645d] border-[#E2DBD0]/60'
                }`}
              >
                {isExact ? '✦ ' : isRelated ? '◈ ' : ''}#{hb.name}
              </span>
            );
          })}

          {remainingCount > 0 && (
            <span className="text-[11px] text-[#8a8278] font-medium px-2 py-0.5 bg-[#F0EAE0] rounded-xl">
              +{remainingCount}
            </span>
          )}

          {displayHobbies.length === 0 && (
            <span className="text-xs text-[#8a8278] italic">Community Member</span>
          )}
        </div>
      </div>

      {/* Card Actions */}
      <div className="flex items-center gap-2 pt-3 border-t border-[#E2DBD0]/60" onClick={(e) => e.stopPropagation()}>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onIgnore(String(usr.id));
          }}
          className="p-2.5 rounded-xl border border-[#E2DBD0] text-[#8a8278] hover:text-rose-600 hover:border-rose-200 hover:bg-rose-50/60 text-xs font-semibold transition-all cursor-pointer flex items-center justify-center shrink-0"
          title="Hide profile"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            navigate(`/profile/${usr.username || usr.id}`);
          }}
          className="px-3 py-2.5 rounded-xl border border-[#E2DBD0] hover:border-[#2D5A3D]/50 text-stone-700 hover:text-[#2D5A3D] bg-[#FAF8F5] hover:bg-white text-xs font-semibold transition-all cursor-pointer flex items-center justify-center gap-1 shrink-0 shadow-2xs"
          title="View full profile"
        >
          <span>View More</span>
        </button>

        {isSent ? (
          <button
            type="button"
            disabled
            className="flex-1 py-2.5 px-3 rounded-xl bg-[#eaf3ed] text-[#2D5A3D] border border-[#7aaa8a]/40 text-xs font-semibold flex items-center justify-center gap-1.5 cursor-default shadow-2xs"
          >
            <svg className="w-4 h-4 text-[#2D5A3D]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
            <span>Sent</span>
          </button>
        ) : (
          <button
            type="button"
            disabled={isConnecting}
            onClick={(e) => {
              e.stopPropagation();
              onConnect(String(usr.id));
            }}
            className="flex-1 py-2.5 px-3 rounded-xl bg-[#2D5A3D] hover:bg-[#3d7a55] text-white text-xs font-semibold shadow-xs hover:shadow transition-all cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50"
          >
            {isConnecting ? (
              <span>Connecting...</span>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                </svg>
                <span>Connect</span>
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
  hasMore = false,
  loadingMore = false,
  onLoadMore,
  onConnect,
  onIgnore,
  onOpenChat,
}) => {
  const { user: currentUser } = useAuth();
  const [exploringUser, setExploringUser] = useState<any | null>(null);
  const [profileSearchQuery, setProfileSearchQuery] = useState('');

  const isSearching = profileSearchQuery.trim().length > 0;
  const trimmedQuery = profileSearchQuery.trim();

  // ─── Global Search Query across entire database ───
  const {
    data: searchData,
    loading: searchLoading,
  } = useQuery(SEARCH_USERS, {
    variables: { query: trimmedQuery, limit: 50, offset: 0 },
    skip: !isSearching,
    fetchPolicy: 'cache-and-network',
  });

  // ─── Filter Logic ───
  // Default recommendations: STRICTLY ONLY match percentage > 0.
  // Profiles with match percentage <= 0 are hidden from default view.
  // When searching globally: queries entire database ignoring location, radius, and affinity thresholds.
  const displayUsers = useMemo(() => {
    if (isSearching) {
      const results = searchData?.searchUsers || [];
      return results.filter((usr: any) => {
        if (usr.id === currentUser?.id || usr.username === currentUser?.username) return false;
        return true;
      });
    }

    // Default view: Strict filter where match percentage > 0
    return suggestedUsers.filter((usr: any) => {
      const affinity = usr.matchPercentage ?? computeAffinity(myHobbies, usr.hobbies);
      return affinity > 0;
    });
  }, [suggestedUsers, isSearching, searchData, currentUser, myHobbies]);

  const isContentLoading = isSearching ? searchLoading : loading;

  return (
    <div className="space-y-6">
      {/* ── Header Title and Overview ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h3 className="text-xl font-serif font-semibold text-[#2D5A3D]">Match Suggestions</h3>
          <p className="text-xs text-[#8a8278] mt-0.5">
            Connect with community members and build genuine bonds based on shared passions.
          </p>
        </div>
        {!isContentLoading && (
          <span className="text-xs bg-[#eaf3ed] text-[#2D5A3D] px-3 py-1 rounded-full font-semibold self-start sm:self-auto border border-[#7aaa8a]/30">
            {isSearching ? (
              `${displayUsers.length} search ${displayUsers.length === 1 ? 'result' : 'results'}`
            ) : (
              `${displayUsers.length} ${displayUsers.length === 1 ? 'match' : 'matches'}`
            )}
          </span>
        )}
      </div>

      {/* ── Dedicated Profile Search Bar ── */}
      <div className="relative w-full">
        <div className="relative flex items-center">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8a8278] pointer-events-none" />
          <input
            type="text"
            value={profileSearchQuery}
            onChange={(e) => setProfileSearchQuery(e.target.value)}
            placeholder="Search profiles globally by username, bio, city, or hobbies..."
            className="w-full pl-11 pr-10 py-3 rounded-2xl bg-white border border-[#E2DBD0] hover:border-[#2D5A3D]/40 focus:border-[#2D5A3D] text-xs sm:text-sm text-[#2C2C2C] placeholder:text-[#8a8278]/70 shadow-2xs focus:shadow-xs focus:outline-none transition-all"
          />
          {profileSearchQuery && (
            <button
              type="button"
              onClick={() => setProfileSearchQuery('')}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#8a8278] hover:text-[#2C2C2C] bg-[#F4EEE2] hover:bg-[#E2DBD0] w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold cursor-pointer transition-colors"
              title="Clear profile search"
            >
              ✕
            </button>
          )}
        </div>
        {isSearching && (
          <div className="flex items-center justify-between mt-2 px-1 text-xs text-[#8a8278]">
            <span>
              Showing {displayUsers.length} profile{displayUsers.length === 1 ? '' : 's'} matching "{profileSearchQuery}"
            </span>
            <button
              type="button"
              onClick={() => setProfileSearchQuery('')}
              className="text-[#2D5A3D] hover:underline font-semibold cursor-pointer"
            >
              Reset search
            </button>
          </div>
        )}
      </div>

      {isContentLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <CardSkeleton key={i} />
          ))}
        </div>
      ) : displayUsers.length === 0 ? (
        isSearching ? (
          <div className="bg-white border border-[#E2DBD0] rounded-3xl p-10 text-center shadow-xs space-y-3 max-w-lg mx-auto">
            <div className="w-14 h-14 rounded-full bg-[#F4EEE2] flex items-center justify-center mx-auto text-[#8a8278]">
              <Search className="w-7 h-7" />
            </div>
            <h4 className="text-base font-semibold text-[#2D5A3D]">No profiles found</h4>
            <p className="text-xs text-[#8a8278] leading-relaxed">
              We couldn't find any member profiles matching "{profileSearchQuery}". Try searching for another name, city, or hobby tag.
            </p>
            <button
              type="button"
              onClick={() => setProfileSearchQuery('')}
              className="px-4 py-2 rounded-xl bg-[#2D5A3D] text-white text-xs font-semibold hover:bg-[#3d7a55] transition-colors cursor-pointer inline-block"
            >
              Clear Search
            </button>
          </div>
        ) : (
          <div className="bg-white border border-[#E2DBD0] rounded-3xl p-12 text-center shadow-xs space-y-3 max-w-lg mx-auto">
            <div className="w-16 h-16 rounded-full bg-[#eaf3ed] flex items-center justify-center mx-auto">
              <Compass className="w-8 h-8 text-[#2D5A3D]" />
            </div>
            <h4 className="text-base font-semibold text-[#2D5A3D]">No match suggestions found</h4>
            <p className="text-xs text-[#8a8278] leading-relaxed">
              You can search for members directly using the search bar above, or add more hobbies to your profile to discover shared connections!
            </p>
          </div>
        )
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {displayUsers.map((usr: any) => {
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
                  onExplore={(u) => setExploringUser(u)}
                />
              );
            })}
          </div>

          {/* ── Pagination Controls ("Load More" & End of Feed Indicator) ── */}
          {!isSearching && (
            <div className="flex flex-col items-center justify-center pt-6 pb-2">
              {hasMore ? (
                <button
                  type="button"
                  disabled={loadingMore}
                  onClick={onLoadMore}
                  className="px-6 py-2.5 rounded-2xl bg-white border border-[#E2DBD0] hover:bg-[#F4EEE2] hover:border-[#2D5A3D] text-xs font-semibold text-[#2D5A3D] transition-all shadow-2xs hover:shadow-xs cursor-pointer flex items-center gap-2 disabled:opacity-50"
                >
                  {loadingMore ? (
                    <>
                      <svg className="animate-spin w-4 h-4 text-[#2D5A3D]" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      <span>Loading more suggestions...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5 text-[#2D5A3D]" />
                      <span>Load More Suggestions</span>
                    </>
                  )}
                </button>
              ) : (
                <div className="text-center py-2">
                  <span className="text-xs text-[#8a8278] bg-[#E2DBD0]/40 px-4 py-1.5 rounded-full font-medium">
                    ✓ You've seen all local recommendations
                  </span>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* ─── User Profile Preview Modal ─── */}
      {exploringUser && (
        <UserProfileModal
          user={exploringUser}
          currentUser={currentUser}
          myHobbies={myHobbies}
          isSent={sentRequestUserIds.some((id) => String(id) === String(exploringUser.id))}
          isConnecting={String(connectingUserId) === String(exploringUser.id)}
          onClose={() => setExploringUser(null)}
          onConnect={onConnect}
          onOpenChat={onOpenChat}
        />
      )}
    </div>
  );
};

export default MeetTab;

