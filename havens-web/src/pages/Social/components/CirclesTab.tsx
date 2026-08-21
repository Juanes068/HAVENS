import React, { useState, useMemo } from 'react';
import { useQuery } from '@apollo/client';
import { GET_RECOMMENDED_CIRCLES } from '../../../graphql/operations';
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
  const [exploringCircle, setExploringCircle] = useState<Circle | null>(null);
  const [isWizardOpen, setIsWizardOpen] = useState(false);

  // GraphQL query for real circles
  const { data, loading, refetch } = useQuery(GET_RECOMMENDED_CIRCLES, {
    fetchPolicy: 'cache-and-network',
  });

  const circles: Circle[] = useMemo(() => {
    return data?.recommendedCircles || [];
  }, [data]);

  const handleCircleCreated = (message: string) => {
    refetch();
    if (onActionStatus) {
      onActionStatus(message);
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
                        📍 {circle.locationName || 'Vancouver, BC'}
                        {circle.distance !== undefined && circle.distance !== null ? ` • ${circle.distance.toFixed(1)} km away` : ''}
                      </span>
                      <span className="text-[11px] font-bold text-[#C47B5A] bg-[#C47B5A]/10 px-2.5 py-1 rounded-full shrink-0">
                        {affinity}% Match
                      </span>
                    </div>

                    <h4 className="text-base font-semibold text-charcoal mb-1">{circle.name}</h4>
                    <p className="text-xs text-[#8a8278] mb-3 line-clamp-2 leading-relaxed">
                      {circle.description || 'A community of passionate members connecting around shared interests.'}
                    </p>

                    {/* Common Interest Tags */}
                    {circle.hobbies && circle.hobbies.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mb-4">
                        {circle.hobbies.map((h) => {
                          const isShared = myHobbies.some((mh: any) => String(mh.id) === String(h.id));
                          return (
                            <span
                              key={h.id}
                              className={`text-[11px] px-2.5 py-1 rounded-md font-medium border ${
                                isShared
                                  ? 'bg-[#eaf3ed] text-[#2D5A3D] border-[#7aaa8a]/30'
                                  : 'bg-[#F4EEE2] text-[#5a5450] border-[#E2DBD0]/60'
                              }`}
                            >
                              {isShared && '✦ '}#{h.name}
                            </span>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Card Actions Footer */}
                  <div className="pt-4 border-t border-[#E2DBD0]/60 flex items-center justify-between">
                    <span className="text-xs text-[#8a8278] font-medium">
                      👥 {membersCount} {membersCount === 1 ? 'trusted member' : 'trusted members'}
                    </span>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setExploringCircle(circle)}
                        className="px-3.5 py-1.5 rounded-xl border border-[#E2DBD0] text-xs font-semibold text-[#5a5450] hover:bg-[#F4EEE2] transition-colors cursor-pointer"
                      >
                        Explore
                      </button>
                      <button
                        type="button"
                        disabled={isJoined}
                        onClick={() => onJoinCircle(Number(circle.id))}
                        className={`px-4 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
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
                <span className="text-xs font-semibold text-charcoal">Matching Interests & Tags:</span>
                <div className="flex flex-wrap gap-1.5">
                  {exploringCircle.hobbies.map((t) => (
                    <span key={t.id} className="text-[11px] bg-[#eaf3ed] text-[#2D5A3D] px-2.5 py-1 rounded-md font-medium">
                      #{t.name}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div className="p-3 bg-[#F0EAE0]/70 rounded-2xl flex items-center justify-between text-xs text-[#5a5450]">
              <span>👥 Active Community Size: <strong>{exploringCircle.memberCount || 1} members</strong></span>
              <span>🎯 Affinity Match: <strong>{getAffinityPercent(exploringCircle)}%</strong></span>
            </div>

            <div className="pt-2 flex items-center justify-end gap-3">
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
