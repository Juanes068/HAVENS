import React from 'react';
import { computeAffinity } from '../utils/ignoreStorage';
import { Avatar } from '../../../components/Avatar';

interface MeetTabProps {
  loading: boolean;
  suggestedUsers: any[];
  myHobbies: any[];
  fadingCardId: string | null;
  isMatching: boolean;
  onConnect: (userId: string) => void;
  onPass: (userId: string) => void;
}

const CardSkeleton: React.FC = () => (
  <div className="bg-white border border-[#E2DBD0] rounded-2xl p-5 animate-pulse">
    <div className="flex items-center gap-3 mb-4">
      <div className="w-12 h-12 rounded-full bg-[#E2DBD0]" />
      <div className="flex-1 space-y-2">
        <div className="h-3.5 bg-[#E2DBD0] rounded w-28" />
        <div className="h-2.5 bg-[#E2DBD0]/60 rounded w-20" />
      </div>
      <div className="h-6 w-14 bg-[#E2DBD0]/40 rounded-full" />
    </div>
    <div className="flex gap-1.5 mb-4">
      {[1, 2, 3].map((i) => (
        <div key={i} className="h-5 w-16 bg-[#E2DBD0]/50 rounded-md" />
      ))}
    </div>
    <div className="flex gap-2">
      <div className="flex-1 h-9 bg-[#E2DBD0]/40 rounded-xl" />
      <div className="flex-1 h-9 bg-[#E2DBD0]/60 rounded-xl" />
    </div>
  </div>
);

export const MeetTab: React.FC<MeetTabProps> = ({
  loading,
  suggestedUsers,
  myHobbies,
  fadingCardId,
  isMatching,
  onConnect,
  onPass,
}) => {
  return (
    <div className="space-y-5">
      <div>
        <h3 className="text-lg font-serif font-semibold text-[#2D5A3D]">People You May Like</h3>
        <p className="text-xs text-[#8a8278] mt-0.5">
          Members matched by shared hobbies & location proximity. Connect or pass.
        </p>
      </div>

      {loading ? (
        /* Skeleton Loader */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <CardSkeleton key={i} />
          ))}
        </div>
      ) : suggestedUsers.length === 0 ? (
        /* Empty State */
        <div className="bg-white border border-[#E2DBD0] rounded-2xl p-12 text-center">
          <span className="text-5xl block mb-4">🎉</span>
          <h4 className="text-base font-semibold text-[#2D5A3D] mb-2">You've met everyone nearby!</h4>
          <p className="text-xs text-[#8a8278] max-w-sm mx-auto">
            New members join every day. Check back later or invite friends with your unique code to grow the community.
          </p>
        </div>
      ) : (
        /* Suggestion Cards Grid */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {suggestedUsers.map((usr: any) => {
            const affinity = computeAffinity(myHobbies, usr.hobbies);
            const isFading = fadingCardId === String(usr.id);
            return (
              <div
                key={usr.id}
                className={`bg-white border border-[#E2DBD0] rounded-2xl p-5 flex flex-col justify-between shadow-xs hover:border-[#2D5A3D]/40 transition-all duration-300 ${
                  isFading ? 'opacity-0 scale-95 translate-y-2' : 'opacity-100 scale-100'
                }`}
              >
                {/* Card Header: Avatar + Info + Affinity */}
                <div>
                  <div className="flex items-start gap-3 mb-3">
                    <Avatar
                      name={usr.username}
                      photoUrl={usr.photoUrl}
                      size="xl"
                      className="w-12 h-12 border-2 border-white shadow-xs"
                    />
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-semibold text-charcoal truncate">@{usr.username}</h4>
                      <p className="text-[11px] text-[#8a8278] truncate">
                        {usr.neighbourhood || 'Havens Member'}
                      </p>
                    </div>
                    {/* Affinity Badge */}
                    {affinity > 0 && (
                      <span
                        className={`shrink-0 text-[11px] font-bold px-2.5 py-1 rounded-full ${
                          affinity >= 50
                            ? 'bg-[#2D5A3D]/10 text-[#2D5A3D]'
                            : 'bg-[#C47B5A]/10 text-[#C47B5A]'
                        }`}
                      >
                        {affinity}% match
                      </span>
                    )}
                  </div>

                  {/* Bio Preview */}
                  {usr.bio && (
                    <p className="text-[11px] text-[#5a5450] line-clamp-2 mb-3 leading-relaxed">
                      {usr.bio}
                    </p>
                  )}

                  {/* Hobby Badges */}
                  {usr.hobbies && usr.hobbies.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mb-4">
                      {usr.hobbies.slice(0, 5).map((hb: any) => {
                        const isShared = myHobbies.some((mh: any) => mh.id === hb.id);
                        return (
                          <span
                            key={hb.id}
                            className={`text-[10px] px-2 py-0.5 rounded-md font-medium border ${
                              isShared
                                ? 'bg-[#eaf3ed] text-[#2D5A3D] border-[#7aaa8a]/30'
                                : 'bg-[#F4EEE2] text-[#5a5450] border-[#E2DBD0]/60'
                            }`}
                          >
                            {isShared && '✦ '}{hb.name}
                          </span>
                        );
                      })}
                      {usr.hobbies.length > 5 && (
                        <span className="text-[10px] text-[#8a8278] px-1.5 py-0.5">
                          +{usr.hobbies.length - 5} more
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2 pt-3 border-t border-[#E2DBD0]/60">
                  <button
                    type="button"
                    onClick={() => onPass(String(usr.id))}
                    className="flex-1 py-2.5 rounded-xl border border-[#E2DBD0] text-[#8a8278] hover:text-rose-500 hover:border-rose-200 hover:bg-rose-50/50 text-xs font-semibold transition-all cursor-pointer"
                  >
                    Pass
                  </button>
                  <button
                    type="button"
                    disabled={isMatching}
                    onClick={() => onConnect(String(usr.id))}
                    className="flex-1 py-2.5 rounded-xl bg-[#2D5A3D] text-white hover:bg-[#3d7a55] text-xs font-semibold transition-all shadow-xs cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1.5"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                    </svg>
                    Connect
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
