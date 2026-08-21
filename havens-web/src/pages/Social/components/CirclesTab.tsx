import React, { useState } from 'react';
import { CircleMatch, RECOMMENDED_CIRCLE_MATCHES } from '../types';

interface CirclesTabProps {
  joinedCircleIds: number[];
  onJoinCircle: (circleId: number) => void;
}

export const CirclesTab: React.FC<CirclesTabProps> = ({
  joinedCircleIds,
  onJoinCircle,
}) => {
  const [exploringCircle, setExploringCircle] = useState<CircleMatch | null>(null);

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-br from-[#2D5A3D]/5 via-[#F0EAE0]/80 to-[#F4EEE2] border border-[#2D5A3D]/30 rounded-3xl p-6 md:p-8 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 border-b border-[#E2DBD0] pb-4">
          <div>
            <span className="text-[11px] font-bold tracking-wider text-[#C47B5A] uppercase">
              ⭐ Featured Priority Section
            </span>
            <h3 className="text-2xl font-serif font-semibold text-[#2D5A3D] mt-0.5">
              Recommended Circles
            </h3>
            <p className="text-xs text-[#8a8278] mt-1">
              Micro-groups matched to your geolocation & hobby affinity.
            </p>
          </div>
          <span className="text-xs bg-[#2D5A3D] text-white px-3 py-1.5 rounded-full font-semibold self-start md:self-auto">
            🎯 {RECOMMENDED_CIRCLE_MATCHES.length} Circles Nearby
          </span>
        </div>

        {/* Circle Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {RECOMMENDED_CIRCLE_MATCHES.map((circle) => {
            const isJoined = joinedCircleIds.includes(circle.id);
            return (
              <div
                key={circle.id}
                className="bg-white border border-[#E2DBD0] hover:border-[#2D5A3D] rounded-2xl p-5 flex flex-col justify-between shadow-xs transition-all duration-200"
              >
                <div>
                  {/* Circle Header Metadata */}
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="text-[11px] font-semibold text-[#2D5A3D] bg-[#eaf3ed] px-2.5 py-1 rounded-full">
                      📍 {circle.location} • {circle.distanceKm} km away
                    </span>
                    <span className="text-[11px] font-bold text-[#C47B5A] bg-[#C47B5A]/10 px-2.5 py-1 rounded-full">
                      {circle.matchScore}% Match
                    </span>
                  </div>

                  <h4 className="text-base font-semibold text-charcoal mb-1">{circle.name}</h4>
                  <p className="text-xs text-[#8a8278] mb-3 line-clamp-2 leading-relaxed">
                    {circle.description}
                  </p>

                  {/* Common Interest Tags */}
                  <div className="flex flex-wrap gap-1.5 mb-4">
                    {circle.tags.map((t) => (
                      <span
                        key={t}
                        className="text-[11px] bg-[#F4EEE2] text-[#2D5A3D] px-2.5 py-1 rounded-md font-medium border border-[#E2DBD0]/60"
                      >
                        #{t}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Card Actions Footer */}
                <div className="pt-4 border-t border-[#E2DBD0]/60 flex items-center justify-between">
                  <span className="text-xs text-[#8a8278] font-medium">
                    👥 {circle.membersCount} trusted members
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
                      onClick={() => onJoinCircle(circle.id)}
                      className={`px-4 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                        isJoined
                          ? 'bg-[#eaf3ed] text-[#2D5A3D] border border-[#7aaa8a]/40'
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
      </div>

      {/* Circle Explore Modal */}
      {exploringCircle && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-[#E2DBD0] rounded-3xl p-6 max-w-lg w-full shadow-xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex justify-between items-start">
              <div>
                <span className="text-[10px] font-bold text-[#C47B5A] uppercase tracking-wider">
                  📍 {exploringCircle.location} • {exploringCircle.distanceKm} km away
                </span>
                <h3 className="text-xl font-serif font-semibold text-[#2D5A3D] mt-0.5">
                  {exploringCircle.name}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setExploringCircle(null)}
                className="text-xs font-bold text-[#8a8278] hover:text-charcoal bg-[#F4EEE2] p-1.5 rounded-full cursor-pointer"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-[#5a5450] leading-relaxed">
              {exploringCircle.description}
            </p>

            <div className="space-y-2">
              <span className="text-xs font-semibold text-charcoal">Matching Interests & Tags:</span>
              <div className="flex flex-wrap gap-1.5">
                {exploringCircle.tags.map((t) => (
                  <span key={t} className="text-[11px] bg-[#eaf3ed] text-[#2D5A3D] px-2.5 py-1 rounded-md font-medium">
                    #{t}
                  </span>
                ))}
              </div>
            </div>

            <div className="p-3 bg-[#F0EAE0]/70 rounded-2xl flex items-center justify-between text-xs text-[#5a5450]">
              <span>👥 Active Community Size: <strong>{exploringCircle.membersCount} members</strong></span>
              <span>🎯 Affinity Match: <strong>{exploringCircle.matchScore}%</strong></span>
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
                onClick={() => {
                  onJoinCircle(exploringCircle.id);
                  setExploringCircle(null);
                }}
                className="px-5 py-2 rounded-xl bg-[#2D5A3D] text-white text-xs font-semibold hover:bg-[#3d7a55] transition-colors shadow-xs cursor-pointer"
              >
                Join Circle Now
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
