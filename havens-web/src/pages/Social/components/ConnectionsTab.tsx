import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { computeAffinity } from '../utils/ignoreStorage';
import { Avatar } from '../../../components/Avatar';

interface ConnectionsTabProps {
  requestsLoading: boolean;
  pendingRequests: any[];
  friendsLoading: boolean;
  acceptedFriends: any[];
  activeMatches: any[];
  currentUser: any;
  myHobbies: any[];
  onRespondRequest: (requestId: string | number, action: 'accepted' | 'rejected') => void;
  onCreateMatch: (userId: string) => void;
}

// ─── Skeleton Loaders ──────────────────────────────────────
const RequestSkeleton: React.FC = () => (
  <div className="bg-white border border-[#E2DBD0] rounded-2xl p-4 flex items-center justify-between animate-pulse">
    <div className="flex items-center gap-3">
      <div className="w-11 h-11 rounded-full bg-[#E2DBD0]" />
      <div className="space-y-2">
        <div className="h-3.5 bg-[#E2DBD0] rounded w-24" />
        <div className="h-2.5 bg-[#E2DBD0]/60 rounded w-32" />
      </div>
    </div>
    <div className="flex gap-2">
      <div className="h-8 w-20 bg-[#E2DBD0]/40 rounded-xl" />
      <div className="h-8 w-20 bg-[#E2DBD0]/60 rounded-xl" />
    </div>
  </div>
);

const FriendCardSkeleton: React.FC = () => (
  <div className="bg-white border border-[#E2DBD0] rounded-2xl p-4 animate-pulse space-y-3">
    <div className="flex items-center gap-3">
      <div className="w-10 h-10 rounded-full bg-[#E2DBD0]" />
      <div className="flex-1 space-y-2">
        <div className="h-3.5 bg-[#E2DBD0] rounded w-24" />
        <div className="h-2.5 bg-[#E2DBD0]/60 rounded w-20" />
      </div>
    </div>
    <div className="flex gap-1.5">
      {[1, 2, 3].map((i) => (
        <div key={i} className="h-5 w-14 bg-[#E2DBD0]/50 rounded-md" />
      ))}
    </div>
    <div className="h-8 w-full bg-[#E2DBD0]/40 rounded-xl" />
  </div>
);

// ─── Helper: Find match ID between two users ───────────────
const findMatchId = (activeMatches: any[], userId: string, currentUserId: string): string | null => {
  const match = activeMatches.find((m: any) => {
    const id1 = String(m.user1?.id);
    const id2 = String(m.user2?.id);
    return (
      (id1 === userId && id2 === currentUserId) ||
      (id2 === userId && id1 === currentUserId)
    );
  });
  return match ? String(match.id) : null;
};

// ═══════════════════════════════════════════════════════════
// CONNECTIONS TAB COMPONENT
// ═══════════════════════════════════════════════════════════
export const ConnectionsTab: React.FC<ConnectionsTabProps> = ({
  requestsLoading,
  pendingRequests,
  friendsLoading,
  acceptedFriends,
  activeMatches,
  currentUser,
  myHobbies,
  onRespondRequest,
  onCreateMatch,
}) => {
  const navigate = useNavigate();
  const [fadingRequestId, setFadingRequestId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // ─── Search Filter for Friends ────────────────────────────
  const filteredFriends = useMemo(() => {
    if (!searchQuery.trim()) return acceptedFriends;
    const q = searchQuery.toLowerCase();
    return acceptedFriends.filter((f: any) =>
      f.username?.toLowerCase().includes(q) ||
      f.neighbourhood?.toLowerCase().includes(q)
    );
  }, [acceptedFriends, searchQuery]);

  // ─── Animated Accept/Decline ──────────────────────────────
  const handleAnimatedRespond = (requestId: string | number, action: 'accepted' | 'rejected') => {
    setFadingRequestId(String(requestId));
    setTimeout(() => {
      onRespondRequest(requestId, action);
      setFadingRequestId(null);
    }, 300);
  };

  // ─── Chat Navigation ─────────────────────────────────────
  const handleChatWithUser = (userId: string) => {
    const matchId = findMatchId(activeMatches, userId, String(currentUser?.id));
    if (matchId) {
      navigate(`/chat?match=${matchId}`);
    } else {
      // No match exists — create one first, then navigate
      onCreateMatch(userId);
      navigate('/chat');
    }
  };

  return (
    <div className="space-y-8">

      {/* ═══════════════════════════════════════════════════ */}
      {/* SECTION A: PENDING REQUESTS                       */}
      {/* ═══════════════════════════════════════════════════ */}
      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-serif font-semibold text-[#2D5A3D]">Pending Requests</h3>
          <p className="text-xs text-[#8a8278] mt-0.5">Accept or decline incoming connection invitations</p>
        </div>

        {requestsLoading ? (
          <div className="space-y-3">
            {[1, 2].map((i) => <RequestSkeleton key={i} />)}
          </div>
        ) : pendingRequests.length === 0 ? (
          <div className="bg-white border border-[#E2DBD0] rounded-2xl p-8 text-center text-[#8a8278] text-xs">
            🎉 No pending connection requests at this time.
          </div>
        ) : (
          <div className="space-y-3">
            {pendingRequests.map((req: any) => {
              const isFading = fadingRequestId === String(req.id);
              return (
                <div
                  key={req.id}
                  className={`bg-white border border-[#E2DBD0] rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs transition-all duration-300 ${
                    isFading ? 'opacity-0 scale-95 translate-x-4' : 'opacity-100 scale-100'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Avatar
                      name={req.fromUser?.username}
                      photoUrl={req.fromUser?.photoUrl}
                      color="#C47B5A"
                      size="lg"
                      className="w-11 h-11 border-2 border-white shadow-xs"
                    />
                    <div>
                      <h4 className="text-sm font-semibold text-charcoal">@{req.fromUser?.username}</h4>
                      <p className="text-[11px] text-[#8a8278]">
                        Wants to connect • {req.fromUser?.neighbourhood || 'Havens Member'}
                      </p>
                      {req.createdAt && (
                        <p className="text-[10px] text-[#8a8278]/70 mt-0.5">
                          Sent {new Date(req.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleAnimatedRespond(req.id, 'accepted')}
                      className="px-4 py-2 rounded-xl bg-[#2D5A3D] hover:bg-[#3d7a55] text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
                    >
                      ✓ Accept
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAnimatedRespond(req.id, 'rejected')}
                      className="px-3 py-2 rounded-xl border border-[#E2DBD0] hover:bg-rose-50 text-rose-600 text-xs font-medium transition-colors cursor-pointer"
                    >
                      ✕ Decline
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ═══════════════════════════════════════════════════ */}
      {/* SECTION B: YOUR FRIENDS (Accepted Connections)     */}
      {/* ═══════════════════════════════════════════════════ */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-lg font-serif font-semibold text-[#2D5A3D]">Your Friends</h3>
            <p className="text-xs text-[#8a8278] mt-0.5">People you've mutually connected with</p>
          </div>
          {acceptedFriends.length > 0 && (
            <span className="text-xs bg-[#eaf3ed] text-[#2D5A3D] px-3 py-1 rounded-full font-semibold self-start">
              {acceptedFriends.length} {acceptedFriends.length === 1 ? 'friend' : 'friends'}
            </span>
          )}
        </div>

        {/* Search Filter */}
        {acceptedFriends.length > 2 && (
          <div className="relative">
            <svg
              className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#8a8278]"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search friends by name or neighbourhood..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white border border-[#E2DBD0] text-xs text-[#2C2C2C] placeholder:text-[#8a8278]/60 focus:outline-none focus:border-[#2D5A3D] transition-colors"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8a8278] hover:text-charcoal text-xs font-bold cursor-pointer"
              >
                ✕
              </button>
            )}
          </div>
        )}

        {friendsLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => <FriendCardSkeleton key={i} />)}
          </div>
        ) : acceptedFriends.length === 0 ? (
          <div className="bg-white border border-[#E2DBD0] rounded-2xl p-10 text-center">
            <span className="text-4xl block mb-3">🤝</span>
            <h4 className="text-sm font-semibold text-[#5a5450] mb-1">No friends yet</h4>
            <p className="text-xs text-[#8a8278] max-w-xs mx-auto">
              Connect with people in the Meet tab to build your circle.
            </p>
          </div>
        ) : filteredFriends.length === 0 ? (
          <div className="bg-white border border-[#E2DBD0] rounded-2xl p-8 text-center text-[#8a8278] text-xs">
            No friends matching "{searchQuery}"
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredFriends.map((friend: any) => {
              const affinity = computeAffinity(myHobbies, friend.hobbies);
              const matchId = findMatchId(activeMatches, String(friend.id), String(currentUser?.id));
              return (
                <div
                  key={friend.id}
                  className="bg-white border border-[#E2DBD0] rounded-2xl p-4 flex flex-col justify-between shadow-xs hover:border-[#2D5A3D]/30 transition-all"
                >
                  {/* Friend Info */}
                  <div>
                    <div className="flex items-start gap-3 mb-3">
                      <Avatar
                        name={friend.username}
                        photoUrl={friend.photoUrl}
                        size="lg"
                        className="w-10 h-10 border-2 border-white shadow-xs"
                      />
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-semibold text-charcoal truncate">@{friend.username}</h4>
                        <p className="text-[11px] text-[#8a8278] truncate">{friend.neighbourhood || 'Havens Member'}</p>
                      </div>
                      {/* Affinity Badge */}
                      {affinity > 0 && (
                        <span className={`shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          affinity >= 50
                            ? 'bg-[#2D5A3D]/10 text-[#2D5A3D]'
                            : 'bg-[#C47B5A]/10 text-[#C47B5A]'
                        }`}>
                          {affinity}%
                        </span>
                      )}
                    </div>

                    {/* Shared Hobby Badges */}
                    {friend.hobbies && friend.hobbies.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-3">
                        {friend.hobbies.slice(0, 4).map((hb: any) => {
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
                        {friend.hobbies.length > 4 && (
                          <span className="text-[10px] text-[#8a8278] px-1 py-0.5">
                            +{friend.hobbies.length - 4}
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Chat / Connect Button */}
                  <button
                    type="button"
                    onClick={() => handleChatWithUser(String(friend.id))}
                    className="w-full py-2 rounded-xl bg-[#eaf3ed] text-[#2D5A3D] hover:bg-[#2D5A3D] hover:text-white text-xs font-semibold transition-all cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    {matchId ? (
                      <>
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                        </svg>
                        Open Chat
                      </>
                    ) : (
                      <>
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                        </svg>
                        Start Chat
                      </>
                    )}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ═══════════════════════════════════════════════════ */}
      {/* SECTION C: ACTIVE MATCH CONNECTIONS                */}
      {/* ═══════════════════════════════════════════════════ */}
      {activeMatches.length > 0 && (
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-serif font-semibold text-[#2D5A3D]">Active Matches</h3>
            <p className="text-xs text-[#8a8278] mt-0.5">Your 1-on-1 match connections — tap to open encrypted chat</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {activeMatches.map((m: any) => {
              const partner = m.user1?.id === currentUser?.id ? m.user2 : m.user1;
              const connectedDate = m.createdAt
                ? new Date(m.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
                : null;
              return (
                <div
                  key={m.id}
                  className="bg-white border border-[#E2DBD0] rounded-2xl p-4 flex items-center justify-between shadow-xs hover:border-[#2D5A3D]/30 transition-all"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <Avatar
                      name={partner?.username}
                      photoUrl={partner?.photoUrl}
                      size="lg"
                      className="w-10 h-10 border-2 border-white shadow-xs"
                    />
                    <div className="min-w-0">
                      <h4 className="text-sm font-semibold text-charcoal truncate">@{partner?.username || 'member'}</h4>
                      <p className="text-[11px] text-[#8a8278] truncate">{partner?.neighbourhood || 'Havens Member'}</p>
                      {connectedDate && (
                        <p className="text-[10px] text-[#8a8278]/60 mt-0.5">Connected {connectedDate}</p>
                      )}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => navigate(`/chat?match=${m.id}`)}
                    className="px-3 py-1.5 rounded-xl bg-[#eaf3ed] text-[#2D5A3D] hover:bg-[#2D5A3D] hover:text-white text-xs font-semibold transition-all cursor-pointer shrink-0 ml-2 flex items-center gap-1"
                  >
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                    Chat
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
