import React, { useState, useMemo } from 'react';
import { useQuery, useMutation } from '@apollo/client';
import { GET_RECOMMENDED_CIRCLES, DELETE_COMMUNITY } from '../../../graphql/operations';
import { useAuth } from '../../../context/AuthContext';
import { Circle } from '../types';
import { CreateCircleWizard } from './CreateCircleWizard';

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

export const CirclesTab: React.FC<CirclesTabProps> = ({
  joinedCircleIds,
  onJoinCircle,
  myHobbies = [],
  onActionStatus,
}) => {
  const { user: currentUser } = useAuth();
  const [exploringCircle, setExploringCircle] = useState<Circle | null>(null);
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [circleToDelete, setCircleToDelete] = useState<Circle | null>(null);

  // GraphQL query for real circles
  const { data, loading, refetch } = useQuery(GET_RECOMMENDED_CIRCLES, {
    fetchPolicy: 'cache-and-network',
  });

  const [deleteCommunityMutation, { loading: isDeleting }] = useMutation(DELETE_COMMUNITY);

  const circles: Circle[] = useMemo(() => {
    return data?.recommendedCircles || [];
  }, [data]);

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
            <span className="text-xs bg-[#2D5A3D] text-white px-3 py-2 rounded-xl font-semibold self-start md:self-auto shadow-xs">
              🎯 {circles.length} Circles Available
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

        {/* ─── Grid of Circles ─── */}
        {loading && circles.length === 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {[1, 2, 3, 4].map((i) => (
              <CircleCardSkeleton key={i} />
            ))}
          </div>
        ) : circles.length === 0 ? (
          /* Empty State */
          <div className="bg-white border border-[#E2DBD0] rounded-2xl p-12 text-center space-y-4">
            <span className="text-5xl block">⭕</span>
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
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {circles.map((circle) => {
              const isJoined = joinedCircleIds.some((id) => String(id) === String(circle.id));
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

              const totalCircleMatches = sharedList.length + relatedList.length;

              const isCreator = Boolean(
                currentUser &&
                circle.creator &&
                (String(currentUser.id) === String(circle.creator.id) || currentUser.id === circle.creator.id)
              );

              return (
                <div
                  key={circle.id}
                  className="bg-white border border-[#E2DBD0] hover:border-[#2D5A3D] rounded-2xl p-5 flex flex-col justify-between shadow-xs transition-all duration-200"
                >
                  <div>
                    {/* Circle Cover Banner if available */}
                    {circle.imageUrl ? (
                      <div className="w-full h-36 rounded-xl overflow-hidden mb-3 border border-[#E2DBD0]/60 bg-gradient-to-r from-[#2D5A3D]/10 via-[#F4EEE2] to-[#C47B5A]/10">
                        <img
                          src={circle.imageUrl}
                          alt={circle.name}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                          }}
                        />
                      </div>
                    ) : (
                      <div className="w-full h-20 rounded-xl bg-gradient-to-r from-[#2D5A3D]/10 via-[#F4EEE2] to-[#C47B5A]/10 flex items-center justify-center mb-3 border border-[#E2DBD0]/60">
                        <span className="text-2xl opacity-60">⭕</span>
                      </div>
                    )}

                    {/* Circle Header Metadata */}
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span className="text-[11px] font-semibold text-[#2D5A3D] bg-[#eaf3ed] px-2.5 py-1 rounded-full truncate">
                        {circle.isVirtual ? '🌐 Virtual Group' : `📍 ${circle.locationName || 'Local'}`}
                        {!circle.isVirtual && circle.distance !== undefined && circle.distance !== null ? ` • ${circle.distance.toFixed(1)} km away` : ''}
                      </span>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {isCreator && (
                          <span className="text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                            👑 Host
                          </span>
                        )}
                        {affinity > 0 && (
                          <span className="text-[11px] font-bold text-[#C47B5A] bg-[#C47B5A]/10 px-2.5 py-1 rounded-full">
                            {affinity}% Match
                          </span>
                        )}
                      </div>
                    </div>

                    <h4 className="text-base font-semibold text-charcoal mb-1">{circle.name}</h4>
                    <p className="text-xs text-[#8a8278] mb-3 line-clamp-2 leading-relaxed">
                      {circle.description || 'A community of passionate members connecting around shared interests.'}
                    </p>

                    {/* Filtered Matching Hobbies ONLY */}
                    <div className="space-y-1.5 mb-4">
                      <div className="text-[10px] font-semibold text-[#8a8278] uppercase tracking-wider flex items-center justify-between">
                        <span>Matching Topics</span>
                        {totalCircleMatches > 0 && (
                          <span className="text-[9px] text-[#2D5A3D] font-bold bg-[#eaf3ed] px-1.5 py-0.5 rounded">
                            {totalCircleMatches} {totalCircleMatches === 1 ? 'topic' : 'topics'}
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-1.5 min-h-[26px] items-center">
                        {/* 1. Exact shared hobbies */}
                        {sharedList.map((h: any) => (
                          <span
                            key={`circle-shared-${h.id}`}
                            className="text-[11px] px-2.5 py-1 rounded-md font-semibold bg-[#eaf3ed] text-[#2D5A3D] border border-[#7aaa8a]/30 shadow-2xs"
                            title="Shared exact interest"
                          >
                            ✦ #{h.name}
                          </span>
                        ))}

                        {/* 2. Related category hobbies */}
                        {relatedList.map((h: any) => (
                          <span
                            key={`circle-related-${h.id}`}
                            className="text-[11px] px-2.5 py-1 rounded-md font-medium bg-[#fdf6ed] text-[#C47B5A] border border-[#C47B5A]/30"
                            title={`Related topic in ${h.category?.name || 'shared category'}`}
                          >
                            ◈ #{h.name}
                          </span>
                        ))}

                        {/* Fallback when no direct hobby match */}
                        {totalCircleMatches === 0 && (
                          <span className="text-[11px] px-2.5 py-1 rounded-md font-normal bg-[#F4EEE2] text-[#8a8278] border border-[#E2DBD0]/60 italic">
                            ⭕ Open Community Circle
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Card Actions Footer */}
                  <div className="pt-4 border-t border-[#E2DBD0]/60 flex items-center justify-between gap-2">
                    <span className="text-xs text-[#8a8278] font-medium truncate">
                      👥 {membersCount} {membersCount === 1 ? 'member' : 'members'}
                    </span>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {isCreator && (
                        <button
                          type="button"
                          onClick={() => setCircleToDelete(circle)}
                          className="px-2.5 py-1.5 rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1 shadow-2xs"
                          title="Delete your circle"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                          <span className="hidden sm:inline">Delete</span>
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => setExploringCircle(circle)}
                        className="px-3 py-1.5 rounded-xl border border-[#E2DBD0] text-xs font-semibold text-[#5a5450] hover:bg-[#F4EEE2] transition-colors cursor-pointer"
                      >
                        Explore
                      </button>
                      <button
                        type="button"
                        disabled={isJoined}
                        onClick={() => onJoinCircle(Number(circle.id))}
                        className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                          isJoined
                            ? 'bg-[#eaf3ed] text-[#2D5A3D] border border-[#7aaa8a]/40 cursor-default'
                            : 'bg-[#2D5A3D] text-white hover:bg-[#3d7a55] shadow-xs'
                        }`}
                      >
                        {isJoined ? '✓ Joined' : 'Join Circle'}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
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
                {exploringCircle.creator && (
                  <p className="text-[11px] text-[#8a8278]">
                    Hosted by @{exploringCircle.creator.username}
                  </p>
                )}
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
              <span>🎯 Affinity Match: <strong>{getAffinityPercent(exploringCircle)}%</strong></span>
            </div>

            <div className="pt-2 flex items-center justify-between gap-3">
              {currentUser && exploringCircle.creator && String(currentUser.id) === String(exploringCircle.creator.id) && (
                <button
                  type="button"
                  onClick={() => {
                    setCircleToDelete(exploringCircle);
                  }}
                  className="px-3.5 py-2 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 hover:bg-rose-100 text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  Delete Circle
                </button>
              )}

              <div className="flex items-center gap-2 ml-auto">
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

      {/* ─── Delete Circle Confirmation Modal ─── */}
      {circleToDelete && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-[#E2DBD0] rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3 text-rose-600">
              <span className="text-2xl p-2 bg-rose-50 rounded-2xl border border-rose-100">🗑️</span>
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
