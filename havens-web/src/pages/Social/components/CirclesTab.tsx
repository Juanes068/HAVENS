import React, { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation } from '@apollo/client';
import { GET_RECOMMENDED_CIRCLES, SEARCH_COMMUNITIES, DELETE_COMMUNITY } from '../../../graphql/operations';
import { useAuth } from '../../../context/AuthContext';
import { Circle } from '../types';
import { CreateCircleWizard } from './CreateCircleWizard';
import { CircleManagementModal } from './CircleManagementModal';
import { Target, Users, Crown, Trash2, Sparkles, Search, Settings } from 'lucide-react';

interface CirclesTabProps {
  joinedCircleIds: (number | string)[];
  onJoinCircle: (circleId: number) => void;
  myHobbies?: any[];
  onActionStatus?: (message: string) => void;
}

const CircleCardSkeleton: React.FC = () => (
  <div className="bg-white border border-[#E2DBD0] rounded-2xl p-5 flex flex-col justify-between shadow-xs animate-pulse space-y-4">
    <div>
      <div className="h-32 bg-[#E2DBD0]/60 rounded-xl mb-4" />
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="h-5 w-24 bg-[#E2DBD0]/80 rounded-full" />
        <div className="h-5 w-16 bg-[#E2DBD0]/80 rounded-full" />
      </div>
      <div className="h-5 bg-[#E2DBD0] rounded w-3/4 mb-2" />
      <div className="h-3 bg-[#E2DBD0]/60 rounded w-full mb-1" />
      <div className="h-3 bg-[#E2DBD0]/60 rounded w-2/3 mb-4" />
      <div className="flex gap-1.5 mb-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-5 w-16 bg-[#E2DBD0]/50 rounded-md" />
        ))}
      </div>
    </div>
    <div className="pt-4 border-t border-[#E2DBD0]/60 flex items-center justify-between">
      <div className="h-4 w-24 bg-[#E2DBD0]/60 rounded" />
      <div className="h-8 w-24 bg-[#E2DBD0]/70 rounded-xl" />
    </div>
  </div>
);

const CIRCLES_PAGE_SIZE = 8;

export const CirclesTab: React.FC<CirclesTabProps> = ({
  joinedCircleIds,
  onJoinCircle,
  myHobbies = [],
  onActionStatus,
}) => {
  const { user: currentUser } = useAuth();
  const [exploringCircle, setExploringCircle] = useState<Circle | null>(null);
  const [managingCircle, setManagingCircle] = useState<Circle | null>(null);
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [circleToDelete, setCircleToDelete] = useState<Circle | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [circleSearchQuery, setCircleSearchQuery] = useState('');

  // GraphQL query for real circles with pagination support
  const { data, loading, refetch, fetchMore } = useQuery(GET_RECOMMENDED_CIRCLES, {
    variables: {
      limit: CIRCLES_PAGE_SIZE,
      offset: 0,
    },
    fetchPolicy: 'cache-and-network',
  });

  const isSearching = circleSearchQuery.trim().length > 0;
  const trimmedCircleQuery = circleSearchQuery.trim();

  // Global search query across entire database
  const {
    data: searchData,
    loading: searchLoading,
  } = useQuery(SEARCH_COMMUNITIES, {
    variables: {
      query: trimmedCircleQuery,
      limit: 50,
      offset: 0,
    },
    skip: !isSearching,
    fetchPolicy: 'cache-and-network',
  });

  useEffect(() => {
    if (data?.recommendedCircles) {
      const items = data.recommendedCircles || [];
      setHasMore(items.length >= CIRCLES_PAGE_SIZE);
    }
  }, [data]);

  const [deleteCommunityMutation, { loading: isDeleting }] = useMutation(DELETE_COMMUNITY);

  const circles: Circle[] = useMemo(() => {
    if (isSearching) {
      return searchData?.searchCommunities || [];
    }
    return data?.recommendedCircles || [];
  }, [isSearching, searchData, data]);

  const isContentLoading = isSearching ? searchLoading : loading;

  const handleLoadMoreCircles = async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    try {
      await fetchMore({
        variables: {
          offset: circles.length,
          limit: CIRCLES_PAGE_SIZE,
        },
        updateQuery: (prev, { fetchMoreResult }) => {
          if (!fetchMoreResult || !fetchMoreResult.recommendedCircles) {
            setHasMore(false);
            return prev;
          }
          const newItems = fetchMoreResult.recommendedCircles;
          if (newItems.length < CIRCLES_PAGE_SIZE) {
            setHasMore(false);
          }
          return {
            ...prev,
            recommendedCircles: [...(prev.recommendedCircles || []), ...newItems],
          };
        },
      });
    } catch (err) {
      console.error('Error loading more circles:', err);
    } finally {
      setLoadingMore(false);
    }
  };

  const handleCircleCreated = (message: string) => {
    refetch();
    if (onActionStatus) {
      onActionStatus(message);
    }
  };

  const handleDeleteCircle = async () => {
    if (!circleToDelete) return;
    try {
      const res = await deleteCommunityMutation({
        variables: { id: Number(circleToDelete.id) },
      });
      if (res?.data?.deleteCommunity?.success) {
        if (onActionStatus) {
          onActionStatus(res.data.deleteCommunity.message || `Circle "${circleToDelete.name}" deleted successfully!`);
        }
        setCircleToDelete(null);
        if (exploringCircle?.id === circleToDelete.id) {
          setExploringCircle(null);
        }
        refetch();
      } else {
        if (onActionStatus) {
          onActionStatus(res?.data?.deleteCommunity?.message || 'Failed to delete circle.');
        }
      }
    } catch (err: any) {
      if (onActionStatus) {
        onActionStatus(`Error: ${err.message}`);
      }
    }
  };

  // Helper to compute affinity % between user hobbies and circle hobbies
  const getAffinityPercent = (circle: Circle): number => {
    if (circle.affinityScore !== undefined && circle.affinityScore > 0 && myHobbies.length > 0) {
      const pct = Math.min(100, Math.round((circle.affinityScore / myHobbies.length) * 100));
      return Math.max(50, pct);
    }
    if (!myHobbies?.length || !circle.hobbies?.length) return 80;
    const myIds = new Set(myHobbies.map((h: any) => String(h.id)));
    const matches = circle.hobbies.filter((h: any) => myIds.has(String(h.id))).length;
    if (matches > 0) {
      return Math.min(100, Math.round((matches / myHobbies.length) * 100));
    }
    return 75;
  };

  return (
    <div className="space-y-6">
      {/* ─── Main Container Card ─── */}
      <div className="bg-gradient-to-br from-[#2D5A3D]/5 via-[#F0EAE0]/80 to-[#F4EEE2] border border-[#2D5A3D]/30 rounded-3xl p-6 md:p-8 shadow-sm">
        
        {/* Header with Title & Action Button */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 border-b border-[#E2DBD0] pb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold tracking-wider text-[#C47B5A] uppercase">
                ⭐ Featured Priority Section
              </span>
            </div>
            <h3 className="text-2xl font-serif font-semibold text-[#2D5A3D] mt-0.5">
              Recommended Circles
            </h3>
            <p className="text-xs text-[#8a8278] mt-1">
              Micro-groups matched to your geolocation & hobby affinity taxonomy.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs bg-[#2D5A3D] text-white px-3 py-2 rounded-xl font-semibold self-start md:self-auto shadow-xs flex items-center gap-1.5">
              <Target className="w-3.5 h-3.5" />
              <span>
                {isSearching
                  ? `${circles.length} ${circles.length === 1 ? 'Circle Found' : 'Circles Found'}`
                  : `${circles.length} Circles Available`}
              </span>
            </span>
            <button
              type="button"
              onClick={() => setIsWizardOpen(true)}
              className="px-4 py-2 rounded-xl bg-[#2D5A3D] hover:bg-[#3d7a55] text-white text-xs font-semibold shadow-xs transition-all cursor-pointer flex items-center gap-1.5"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              Create Circle
            </button>
          </div>
        </div>

        {/* ── Dedicated Circle Search Bar ── */}
        <div className="relative w-full mb-6">
          <div className="relative flex items-center">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8a8278] pointer-events-none" />
            <input
              type="text"
              value={circleSearchQuery}
              onChange={(e) => setCircleSearchQuery(e.target.value)}
              placeholder="Search circles globally by name, description, topics, or location..."
              className="w-full pl-11 pr-10 py-3 rounded-2xl bg-white border border-[#E2DBD0] hover:border-[#2D5A3D]/40 focus:border-[#2D5A3D] text-xs sm:text-sm text-[#2C2C2C] placeholder:text-[#8a8278]/70 shadow-2xs focus:shadow-xs focus:outline-none transition-all"
            />
            {circleSearchQuery && (
              <button
                type="button"
                onClick={() => setCircleSearchQuery('')}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#8a8278] hover:text-[#2C2C2C] bg-[#F4EEE2] hover:bg-[#E2DBD0] w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold cursor-pointer transition-colors"
                title="Clear circle search"
              >
                ✕
              </button>
            )}
          </div>
          {isSearching && (
            <div className="flex items-center justify-between mt-2 px-1 text-xs text-[#8a8278]">
              <span>
                Showing {circles.length} circle{circles.length === 1 ? '' : 's'} matching "{circleSearchQuery}"
              </span>
              <button
                type="button"
                onClick={() => setCircleSearchQuery('')}
                className="text-[#2D5A3D] hover:underline font-semibold cursor-pointer"
              >
                Show all available circles
              </button>
            </div>
          )}
        </div>

        {/* ─── Grid of Circles ─── */}
        {isContentLoading && circles.length === 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {[1, 2, 3, 4].map((i) => (
              <CircleCardSkeleton key={i} />
            ))}
          </div>
        ) : circles.length === 0 ? (
          isSearching ? (
            <div className="bg-white border border-[#E2DBD0] rounded-2xl p-10 text-center space-y-3">
              <div className="w-14 h-14 rounded-full bg-[#F4EEE2] flex items-center justify-center mx-auto text-[#8a8278]">
                <Search className="w-7 h-7" />
              </div>
              <h4 className="text-base font-semibold text-[#2D5A3D]">No circles found</h4>
              <p className="text-xs text-[#8a8278] max-w-md mx-auto">
                We couldn't find any circles matching "{circleSearchQuery}". Try a different search term or launch a new circle!
              </p>
              <button
                type="button"
                onClick={() => setCircleSearchQuery('')}
                className="px-4 py-2 rounded-xl bg-[#2D5A3D] text-white text-xs font-semibold hover:bg-[#3d7a55] transition-colors cursor-pointer inline-block"
              >
                Clear Search
              </button>
            </div>
          ) : (
            /* Empty State */
            <div className="bg-white border border-[#E2DBD0] rounded-2xl p-12 text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-[#eaf3ed] flex items-center justify-center mx-auto">
                <Users className="w-8 h-8 text-[#2D5A3D]" />
              </div>
              <div>
                <h4 className="text-base font-semibold text-[#2D5A3D]">No circles created yet</h4>
                <p className="text-xs text-[#8a8278] max-w-md mx-auto mt-1">
                  Be the pioneer of your local community! Start the first micro-group for your favorite hobbies.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsWizardOpen(true)}
                className="px-5 py-2.5 rounded-xl bg-[#2D5A3D] hover:bg-[#3d7a55] text-white text-xs font-semibold shadow-xs transition-all cursor-pointer inline-flex items-center gap-2"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
                Launch First Circle
              </button>
            </div>
          )
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {circles.map((circle) => {
              const isJoined = joinedCircleIds.some((id) => String(id) === String(circle.id));
              const isCreator = Boolean(currentUser && circle.creator && String(circle.creator.id) === String(currentUser.id));
              const affinity = getAffinityPercent(circle);
              const membersCount = circle.memberCount || 1;

              // Intersect Circle hobbies with user's hobbies (exact + related category)
              const myHobbyIds = new Set((myHobbies || []).map((mh: any) => String(mh.id)));
              const myCategoryIds = new Set(
                (myHobbies || [])
                  .map((mh: any) => String(mh.category?.id || mh.categoryId || ''))
                  .filter((id: string) => id && id !== 'undefined' && id !== 'null')
              );

              const sharedList = circle.sharedHobbies || (circle.hobbies || []).filter((h: any) =>
                myHobbyIds.has(String(h.id))
              );

              const relatedList = circle.relatedHobbies || (circle.hobbies || []).filter((h: any) => {
                const isExact = myHobbyIds.has(String(h.id));
                const catId = String(h.category?.id || h.categoryId || '');
                return !isExact && catId && myCategoryIds.has(catId);
              });

              const matchingHobbies = [...sharedList, ...relatedList];
              const displayHobbies = matchingHobbies.length > 0
                ? matchingHobbies.slice(0, 4)
                : (circle.hobbies || []).slice(0, 4);
              const remainingCount = Math.max(0, (matchingHobbies.length > 0 ? matchingHobbies.length : (circle.hobbies?.length || 0)) - 4);

              return (
                <div
                  key={circle.id}
                  onClick={() => setExploringCircle(circle)}
                  className="group bg-white border border-[#E2DBD0] hover:border-[#2D5A3D]/50 rounded-3xl p-5 sm:p-5.5 flex flex-col justify-between shadow-xs hover:shadow-md transition-all duration-200 cursor-pointer"
                >
                  <div>
                    {/* Circle Image Banner */}
                    <div className="relative w-full h-40 sm:h-44 rounded-2xl overflow-hidden mb-4 border border-[#E2DBD0]/60 bg-gradient-to-tr from-[#2D5A3D]/15 via-[#F4EEE2] to-[#C47B5A]/15 shrink-0">
                      {circle.imageUrl ? (
                        <img
                          src={circle.imageUrl}
                          alt={circle.name}
                          className="w-full h-full object-cover group-hover:scale-103 transition-transform duration-300"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                          }}
                        />
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center text-[#2D5A3D]/40">
                          <Users className="w-10 h-10 mb-1 opacity-60" />
                          <span className="text-[11px] font-serif tracking-wider font-semibold text-[#8a8278]">Havens Circle</span>
                        </div>
                      )}

                      {/* Floating Badges Overlay */}
                      <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between gap-1.5 pointer-events-none">
                        <span className="text-[11px] font-semibold text-[#2D5A3D] bg-white/95 backdrop-blur-xs px-2.5 py-1 rounded-full shadow-2xs truncate">
                          {circle.isVirtual ? '🌐 Virtual Group' : `📍 ${circle.locationName || 'Local'}`}
                          {!circle.isVirtual && circle.distance !== undefined && circle.distance !== null ? ` • ${circle.distance.toFixed(1)} km` : ''}
                        </span>
                        <div className="flex items-center gap-1.5 shrink-0">
                          {isCreator && (
                            <span className="text-[10px] font-bold text-amber-800 bg-amber-50/95 backdrop-blur-xs border border-amber-200 px-2 py-0.5 rounded-full flex items-center gap-1 shadow-2xs">
                              <Crown className="w-3 h-3 text-amber-700" />
                              <span>Host</span>
                            </span>
                          )}
                          {affinity > 0 && (
                            <span className="text-[10px] font-bold text-[#C47B5A] bg-white/95 backdrop-blur-xs border border-[#C47B5A]/25 px-2 py-0.5 rounded-full shadow-2xs">
                              {affinity}% Match
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <h4 className="text-lg font-serif font-bold text-stone-900 mb-1.5 truncate group-hover:text-[#2D5A3D] transition-colors">
                      {circle.name}
                    </h4>

                    {circle.description && (
                      <p className="text-xs text-[#6b645d] line-clamp-2 mb-3 leading-relaxed">
                        {circle.description}
                      </p>
                    )}

                    {/* Matching Topics (Strictly Max 4) */}
                    <div className="flex flex-wrap gap-1.5 mb-4 min-h-[28px] items-center">
                      {displayHobbies.map((h: any) => {
                        const isExact = myHobbyIds.has(String(h.id));
                        const isRelated = !isExact && h.category?.id && myCategoryIds.has(String(h.category.id));

                        return (
                          <span
                            key={`circle-topic-${h.id}`}
                            className={`text-[11px] px-2.5 py-1 rounded-xl font-medium border ${
                              isExact
                                ? 'bg-[#eaf3ed] text-[#2D5A3D] border-[#7aaa8a]/30 font-semibold'
                                : isRelated
                                ? 'bg-[#fdf6ed] text-[#C47B5A] border-[#C47B5A]/30'
                                : 'bg-[#F4EEE2] text-[#6b645d] border-[#E2DBD0]/60'
                            }`}
                          >
                            {isExact ? '✦ ' : isRelated ? '◈ ' : ''}#{h.name}
                          </span>
                        );
                      })}

                      {remainingCount > 0 && (
                        <span className="text-[11px] text-[#8a8278] font-medium px-2 py-0.5 bg-[#F0EAE0] rounded-xl">
                          +{remainingCount}
                        </span>
                      )}

                      {displayHobbies.length === 0 && (
                        <span className="text-xs text-[#8a8278] italic">Community Circle</span>
                      )}
                    </div>
                  </div>

                  {/* Card Actions Footer */}
                  <div className="pt-3 border-t border-[#E2DBD0]/60 flex items-center justify-between gap-2" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center gap-2 text-xs text-[#8a8278] font-medium truncate">
                      <span>👥 {membersCount} {membersCount === 1 ? 'member' : 'members'}</span>
                      {circle.ageRange && (
                        <>
                          <span>•</span>
                          <span className="bg-[#FAF8F5] border border-[#E2DBD0] text-stone-700 px-2 py-0.5 rounded-full text-[11px] font-semibold">
                            🎂 {circle.ageRange}
                          </span>
                        </>
                      )}
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {isCreator ? (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setManagingCircle(circle);
                          }}
                          className="px-3.5 py-2 rounded-xl bg-[#2D5A3D] hover:bg-[#3d7a55] text-white text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-2xs hover:shadow-xs"
                          title="Manage circle & monitor members"
                        >
                          <Settings className="w-3.5 h-3.5" />
                          <span>Manage</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          disabled={isJoined}
                          onClick={(e) => {
                            e.stopPropagation();
                            onJoinCircle(Number(circle.id));
                          }}
                          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                            isJoined
                              ? 'bg-[#eaf3ed] text-[#2D5A3D] border border-[#7aaa8a]/40 cursor-default'
                              : 'bg-[#2D5A3D] text-white hover:bg-[#3d7a55] shadow-2xs hover:shadow-xs'
                          }`}
                        >
                          {isJoined ? '✓ Joined' : 'Join Circle'}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Pagination Load More Controls */}
        {!loading && !isSearching && circles.length > 0 && (
          <div className="mt-8 flex flex-col items-center justify-center gap-3">
            {hasMore ? (
              <button
                type="button"
                onClick={handleLoadMoreCircles}
                disabled={loadingMore}
                className="px-6 py-2.5 rounded-2xl bg-white border border-[#E2DBD0] hover:border-[#2D5A3D]/50 hover:bg-[#FAF8F5] text-stone-800 text-xs font-bold transition-all shadow-2xs hover:shadow-xs flex items-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loadingMore ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-[#2D5A3D] border-t-transparent rounded-full animate-spin" />
                    <span>Loading more circles...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5 text-[#2D5A3D]" />
                    <span>Load More Circles ({circles.length} loaded)</span>
                  </>
                )}
              </button>
            ) : (
              <div className="flex items-center gap-2 text-stone-600 text-xs py-2 px-4 rounded-full bg-[#FAF8F5] border border-[#E2DBD0]/60">
                <span>✓</span>
                <span>All {circles.length} local circles loaded</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ─── Circle Explore Modal ─── */}
      {exploringCircle && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-[#E2DBD0] rounded-3xl p-6 max-w-lg w-full shadow-xl space-y-4 animate-in fade-in zoom-in-95 duration-150 max-h-[85vh] overflow-y-auto">
            {exploringCircle.imageUrl && (
              <div className="w-full h-44 rounded-2xl overflow-hidden border border-[#E2DBD0] bg-gradient-to-r from-[#2D5A3D]/10 via-[#F4EEE2] to-[#C47B5A]/10">
                <img
                  src={exploringCircle.imageUrl}
                  alt={exploringCircle.name}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                />
              </div>
            )}

            <div className="flex justify-between items-start">
              <div>
                <span className="text-[10px] font-bold text-[#C47B5A] uppercase tracking-wider">
                  📍 {exploringCircle.locationName || 'Vancouver, BC'}
                  {exploringCircle.distance !== undefined && exploringCircle.distance !== null ? ` • ${exploringCircle.distance.toFixed(1)} km away` : ''}
                </span>
                <h3 className="text-xl font-serif font-semibold text-[#2D5A3D] mt-0.5">
                  {exploringCircle.name}
                </h3>
                <div className="flex items-center gap-2 mt-0.5 text-[11px] text-[#8a8278]">
                  {exploringCircle.creator && (
                    <span>Hosted by @{exploringCircle.creator.username}</span>
                  )}
                  {exploringCircle.ageRange && (
                    <>
                      <span>•</span>
                      <span className="font-semibold text-stone-700 bg-[#F4EEE2] px-2 py-0.5 rounded-full border border-[#E2DBD0]">
                        🎂 {exploringCircle.ageRange}
                      </span>
                    </>
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setExploringCircle(null)}
                className="text-xs font-bold text-[#8a8278] hover:text-charcoal bg-[#F4EEE2] p-1.5 rounded-full cursor-pointer transition-colors"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-[#5a5450] leading-relaxed">
              {exploringCircle.description || 'A welcoming Havens circle dedicated to uniting passionate members for regular local gatherings and connections.'}
            </p>

            {exploringCircle.hobbies && exploringCircle.hobbies.length > 0 && (
              <div className="space-y-2">
                <span className="text-xs font-semibold text-charcoal">Community Topics & Passions:</span>
                <div className="flex flex-wrap gap-1.5">
                  {exploringCircle.hobbies.map((t: any) => {
                    const myHobbyIds = new Set((myHobbies || []).map((mh: any) => String(mh.id)));
                    const myCatIds = new Set(
                      (myHobbies || [])
                        .map((mh: any) => String(mh.category?.id || mh.categoryId || ''))
                        .filter((id: string) => id && id !== 'undefined' && id !== 'null')
                    );
                    const isExact = myHobbyIds.has(String(t.id));
                    const isRelated = !isExact && t.category?.id && myCatIds.has(String(t.category.id));

                    return (
                      <span
                        key={t.id}
                        className={`text-[11px] px-2.5 py-1 rounded-md font-medium border ${
                          isExact
                            ? 'bg-[#eaf3ed] text-[#2D5A3D] border-[#7aaa8a]/40 font-semibold shadow-2xs'
                            : isRelated
                            ? 'bg-[#fdf6ed] text-[#C47B5A] border-[#C47B5A]/30'
                            : 'bg-[#F4EEE2] text-[#5a5450] border-[#E2DBD0]/60'
                        }`}
                      >
                        {isExact && '✦ '}{isRelated && '◈ '}#{t.name}
                      </span>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="p-3 bg-[#F0EAE0]/70 rounded-2xl flex items-center justify-between text-xs text-[#5a5450]">
              <span>👥 Active Community Size: <strong>{exploringCircle.memberCount || 1} members</strong></span>
              <span>Affinity Match: <strong>{getAffinityPercent(exploringCircle)}%</strong></span>
            </div>

            <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => {
                    setManagingCircle(exploringCircle);
                    setExploringCircle(null);
                  }}
                  className="px-4 py-2 rounded-xl bg-[#eaf3ed] hover:bg-[#d9ecde] border border-[#2D5A3D]/30 text-[#2D5A3D] text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 shadow-2xs"
                >
                  <Settings className="w-3.5 h-3.5" />
                  <span>
                    {currentUser && exploringCircle.creator && String(currentUser.id) === String(exploringCircle.creator.id)
                      ? 'Manage & Monitor Members'
                      : 'View Joined Members'}
                  </span>
                </button>
              </div>

              <div className="flex items-center gap-2 ml-auto w-full sm:w-auto justify-end">
                <button
                  type="button"
                  onClick={() => setExploringCircle(null)}
                  className="px-4 py-2 rounded-xl border border-[#E2DBD0] text-xs font-semibold text-[#5a5450] hover:bg-[#F4EEE2] transition-colors cursor-pointer"
                >
                  Close
                </button>
                <button
                  type="button"
                  disabled={joinedCircleIds.some((id) => String(id) === String(exploringCircle.id))}
                  onClick={() => {
                    onJoinCircle(Number(exploringCircle.id));
                    setExploringCircle(null);
                  }}
                  className="px-5 py-2 rounded-xl bg-[#2D5A3D] text-white text-xs font-semibold hover:bg-[#3d7a55] transition-colors shadow-xs cursor-pointer disabled:opacity-50"
                >
                  {joinedCircleIds.some((id) => String(id) === String(exploringCircle.id)) ? '✓ Already Joined' : 'Join Circle Now'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── Circle Management & Member Monitoring Modal ─── */}
      <CircleManagementModal
        isOpen={Boolean(managingCircle)}
        circle={managingCircle}
        onClose={() => setManagingCircle(null)}
        onCircleUpdated={(msg) => {
          if (onActionStatus) onActionStatus(msg);
          refetch();
        }}
        onCircleDeleted={(msg) => {
          if (onActionStatus) onActionStatus(msg);
          setManagingCircle(null);
          setExploringCircle(null);
          refetch();
        }}
      />

      {/* ─── Delete Circle Confirmation Modal ─── */}
      {circleToDelete && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-[#E2DBD0] rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="p-2.5 bg-rose-50 rounded-2xl border border-rose-100 flex items-center justify-center">
                <Trash2 className="w-5 h-5 text-rose-600" />
              </div>
              <div>
                <h3 className="text-base font-bold text-[#2C2C2C]">Delete Circle?</h3>
                <p className="text-xs text-[#8a8278]">This action cannot be undone.</p>
              </div>
            </div>

            <div className="p-3.5 bg-[#FDFBF7] border border-[#E2DBD0] rounded-2xl text-xs text-[#5a5450] space-y-1.5">
              <p>
                Are you sure you want to permanently delete <strong>"{circleToDelete.name}"</strong>?
              </p>
              <p className="text-[11px] text-[#2D5A3D] font-semibold bg-[#eaf3ed] p-2 rounded-xl border border-[#7aaa8a]/30">
                ✓ Deleting this circle will free up 1 slot in your 3-circle creation limit so you can create a new circle.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setCircleToDelete(null)}
                className="px-4 py-2 rounded-xl border border-[#E2DBD0] text-xs font-semibold text-[#5a5450] hover:bg-[#F4EEE2] transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleDeleteCircle}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold transition-colors shadow-xs cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
              >
                {isDeleting ? 'Deleting...' : 'Yes, Delete Circle'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Create Circle Modal Wizard ─── */}
      <CreateCircleWizard
        isOpen={isWizardOpen}
        onClose={() => setIsWizardOpen(false)}
        onCircleCreated={handleCircleCreated}
      />
    </div>
  );
};
