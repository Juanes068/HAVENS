import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { computeAffinity } from '../utils/ignoreStorage';
import { Avatar } from '../../../components/Avatar';
import { Inbox, Users } from 'lucide-react';
import { UserProfileModal } from './UserProfileModal';

interface ConnectionsTabProps {
  requestsLoading: boolean;
  pendingRequests: any[];
  friendsLoading: boolean;
  acceptedFriends: any[];
  currentUser: any;
  myHobbies: any[];
  hasMoreRequests?: boolean;
  loadingMoreRequests?: boolean;
  onLoadMoreRequests?: () => void;
  hasMoreFriends?: boolean;
  loadingMoreFriends?: boolean;
  onLoadMoreFriends?: () => void;
  onRespondRequest: (requestId: string | number, action: 'accepted' | 'rejected') => void;
  onOpenChat?: (userId: string, matchId?: string) => void;
}

// ─── Skeleton Loaders ──────────────────────────────────────
const RequestSkeleton: React.FC = () => (
  <div className="bg-white border border-[#E2DBD0] rounded-3xl p-5 flex items-center justify-between shadow-xs animate-pulse">
    <div className="flex items-center gap-3.5">
      <div className="w-12 h-12 rounded-full bg-[#E2DBD0]" />
      <div className="space-y-2">
        <div className="h-4 bg-[#E2DBD0] rounded w-28" />
        <div className="h-3 bg-[#E2DBD0]/60 rounded w-36" />
      </div>
    </div>
    <div className="flex gap-2">
      <div className="h-9 w-20 bg-[#E2DBD0]/40 rounded-xl" />
      <div className="h-9 w-20 bg-[#E2DBD0]/60 rounded-xl" />
    </div>
  </div>
);

const FriendCardSkeleton: React.FC = () => (
  <div className="bg-white border border-[#E2DBD0] rounded-3xl p-5 shadow-xs animate-pulse space-y-3.5">
    <div className="flex items-center gap-3">
      <div className="w-12 h-12 rounded-full bg-[#E2DBD0]" />
      <div className="flex-1 space-y-2">
        <div className="h-4 bg-[#E2DBD0] rounded w-28" />
        <div className="h-3 bg-[#E2DBD0]/60 rounded w-20" />
      </div>
    </div>
    <div className="flex gap-1.5 pt-1">
      {[1, 2, 3].map((i) => (
        <div key={i} className="h-5 w-14 bg-[#E2DBD0]/50 rounded-lg" />
      ))}
    </div>
    <div className="h-9 w-full bg-[#E2DBD0]/40 rounded-xl mt-2" />
  </div>
);

// ═══════════════════════════════════════════════════════════
// CONNECTIONS TAB (Requests & Your Friends Directory)
// ═══════════════════════════════════════════════════════════
export const ConnectionsTab: React.FC<ConnectionsTabProps> = ({
  requestsLoading,
  pendingRequests,
  friendsLoading,
  acceptedFriends,
  currentUser,
  myHobbies,
  hasMoreRequests = false,
  loadingMoreRequests = false,
  onLoadMoreRequests,
  hasMoreFriends = false,
  loadingMoreFriends = false,
  onLoadMoreFriends,
  onRespondRequest,
  onOpenChat,
}) => {
  const navigate = useNavigate();
  const [fadingRequestId, setFadingRequestId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeSubSection, setActiveSubSection] = useState<'all' | 'requests' | 'friends'>('all');
  const [exploringUser, setExploringUser] = useState<any | null>(null);

  // ─── Search Filter for Friends ────────────────────────────
  const filteredFriends = useMemo(() => {
    if (!searchQuery.trim()) return acceptedFriends;
    const q = searchQuery.toLowerCase();
    return acceptedFriends.filter((f: any) =>
      f.username?.toLowerCase().includes(q) ||
      f.neighbourhood?.toLowerCase().includes(q) ||
      f.cityName?.toLowerCase().includes(q)
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
  const handleChat = (friendId: string, matchId?: string) => {
    if (onOpenChat) {
      onOpenChat(friendId, matchId);
    } else if (matchId) {
      navigate(`/chat?match=${matchId}`);
    } else {
      navigate('/chat');
    }
  };

  return (
    <div className="space-y-8">
      {/* ─── Top Filter Sub-tabs ─── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-[#E2DBD0]/60">
        <div>
          <h2 className="text-xl font-serif font-semibold text-[#2D5A3D]">Connections Hub</h2>
          <p className="text-xs text-[#8a8278] mt-0.5">
            Manage your incoming invitations and browse your verified friends directory.
          </p>
        </div>

        <div className="flex items-center gap-1.5 bg-[#E2DBD0]/40 p-1 rounded-2xl self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setActiveSubSection('all')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              activeSubSection === 'all'
                ? 'bg-white text-[#2D5A3D] shadow-2xs'
                : 'text-[#8a8278] hover:text-[#2C2C2C]'
            }`}
          >
            All
          </button>
          <button
            type="button"
            onClick={() => setActiveSubSection('requests')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeSubSection === 'requests'
                ? 'bg-white text-[#2D5A3D] shadow-2xs'
                : 'text-[#8a8278] hover:text-[#2C2C2C]'
            }`}
          >
            <span>Requests</span>
            {pendingRequests.length > 0 && (
              <span className="px-1.5 py-0.5 text-[10px] bg-rose-500 text-white rounded-full font-bold leading-none">
                {pendingRequests.length}
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={() => setActiveSubSection('friends')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeSubSection === 'friends'
                ? 'bg-white text-[#2D5A3D] shadow-2xs'
                : 'text-[#8a8278] hover:text-[#2C2C2C]'
            }`}
          >
            <span>Your Friends</span>
            {acceptedFriends.length > 0 && (
              <span className="px-1.5 py-0.5 text-[10px] bg-[#2D5A3D]/10 text-[#2D5A3D] rounded-full font-bold leading-none">
                {acceptedFriends.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════ */}
      {/* SECTION 1: REQUESTS (Pending Inbound Invitations)  */}
      {/* ═══════════════════════════════════════════════════ */}
      {(activeSubSection === 'all' || activeSubSection === 'requests') && (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
              <h3 className="text-lg font-serif font-semibold text-[#2D5A3D]">Incoming Requests</h3>
            </div>
            {pendingRequests.length > 0 && (
              <span className="text-xs bg-amber-50 text-amber-700 border border-amber-200 px-3 py-1 rounded-full font-medium">
                {pendingRequests.length} pending response
              </span>
            )}
          </div>

          {requestsLoading ? (
            <div className="space-y-3">
              {[1, 2].map((i) => <RequestSkeleton key={i} />)}
            </div>
          ) : pendingRequests.length === 0 ? (
            <div className="bg-white border border-[#E2DBD0] rounded-3xl p-8 text-center text-[#8a8278] text-xs shadow-xs space-y-1">
              <Inbox className="w-8 h-8 text-[#8a8278] mx-auto mb-1 opacity-70" />
              <p className="font-semibold text-[#5a5450]">No pending connection requests</p>
              <p className="text-[11px]">When other members invite you to connect, their invitations will appear here.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {pendingRequests.map((req: any) => {
                // Support both Match (initiator/user1/user2) and Friendship (fromUser) models
                const sender = req.initiator || req.fromUser || (req.user1?.id === currentUser?.id ? req.user2 : req.user1);
                const isFading = fadingRequestId === String(req.id);

                return (
                  <div
                    key={req.id}
                    onClick={() => setExploringUser(sender)}
                    className={`bg-white border border-[#E2DBD0] hover:border-[#2D5A3D]/50 rounded-2xl p-4 flex flex-col justify-between shadow-2xs hover:shadow-md transition-all duration-200 cursor-pointer ${
                      isFading ? 'opacity-0 scale-95 translate-x-4' : 'opacity-100 scale-100'
                    }`}
                  >
                    <div className="flex items-start gap-3 mb-3">
                      <Avatar
                        name={sender?.username}
                        photoUrl={sender?.photoUrl}
                        color="#C47B5A"
                        size="md"
                        className="w-11 h-11 border-2 border-white shadow-2xs rounded-full ring-1 ring-[#2D5A3D]/20 shrink-0"
                      />
                      <div className="min-w-0 flex-1">
                        <h4 className="text-sm font-semibold text-[#2C2C2C] truncate group-hover:text-[#2D5A3D]">
                          @{sender?.username || 'member'}
                        </h4>
                        <p className="text-[11px] text-[#8a8278] truncate mt-0.5">
                          📍 {sender?.neighbourhood || sender?.cityName || 'Havens Member'}
                        </p>
                        {req.createdAt && (
                          <p className="text-[10px] text-[#8a8278]/80 mt-0.5">
                            Sent {new Date(req.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Accept / Decline Action Buttons */}
                    <div className="flex items-center gap-2 pt-2.5 border-t border-[#E2DBD0]/60" onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleAnimatedRespond(req.id, 'accepted');
                        }}
                        className="flex-1 py-2 px-3 rounded-xl bg-[#2D5A3D] hover:bg-[#3d7a55] text-white text-xs font-semibold shadow-2xs transition-all cursor-pointer flex items-center justify-center gap-1.5"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                        <span>Accept</span>
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleAnimatedRespond(req.id, 'rejected');
                        }}
                        className="py-2 px-3 rounded-xl border border-[#E2DBD0] hover:bg-rose-50 hover:border-rose-200 text-rose-600 text-xs font-medium transition-all cursor-pointer flex items-center justify-center gap-1"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                        <span>Decline</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Load More Requests Pagination */}
          {!requestsLoading && pendingRequests.length > 0 && hasMoreRequests && onLoadMoreRequests && (
            <div className="pt-2 flex justify-center">
              <button
                type="button"
                onClick={onLoadMoreRequests}
                disabled={loadingMoreRequests}
                className="px-5 py-2 rounded-2xl bg-white border border-[#E2DBD0] hover:border-[#2D5A3D]/50 text-stone-800 text-xs font-bold transition-all shadow-2xs hover:shadow-xs flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {loadingMoreRequests ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-[#2D5A3D] border-t-transparent rounded-full animate-spin" />
                    <span>Loading more requests...</span>
                  </>
                ) : (
                  <span>Load More Requests ({pendingRequests.length} loaded)</span>
                )}
              </button>
            </div>
          )}
        </section>
      )}

      {/* ═══════════════════════════════════════════════════ */}
      {/* SECTION 2: YOUR FRIENDS (Mutually Accepted Matches) */}
      {/* ═══════════════════════════════════════════════════ */}
      {(activeSubSection === 'all' || activeSubSection === 'friends') && (
        <section className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#2D5A3D]" />
              <h3 className="text-lg font-serif font-semibold text-[#2D5A3D]">Your Friends Directory</h3>
            </div>
            {acceptedFriends.length > 0 && (
              <span className="text-xs bg-[#eaf3ed] text-[#2D5A3D] border border-[#7aaa8a]/30 px-3.5 py-1 rounded-full font-semibold self-start sm:self-auto">
                {acceptedFriends.length} {acceptedFriends.length === 1 ? 'Connected Friend' : 'Connected Friends'}
              </span>
            )}
          </div>

          {/* Search Filter for Friends Directory */}
          {acceptedFriends.length > 2 && (
            <div className="relative max-w-md">
              <svg
                className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8a8278]"
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
                placeholder="Search friends by name or location..."
                className="w-full pl-10 pr-8 py-2.5 rounded-2xl bg-white border border-[#E2DBD0] text-xs text-[#2C2C2C] placeholder:text-[#8a8278]/60 focus:outline-none focus:border-[#2D5A3D] shadow-2xs transition-colors"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8a8278] hover:text-[#2C2C2C] text-xs font-bold cursor-pointer"
                >
                  ✕
                </button>
              )}
            </div>
          )}

          {friendsLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {[1, 2, 3].map((i) => <FriendCardSkeleton key={i} />)}
            </div>
          ) : acceptedFriends.length === 0 ? (
            <div className="bg-white border border-[#E2DBD0] rounded-3xl p-12 text-center shadow-xs space-y-2">
              <Users className="w-10 h-10 text-[#8a8278] mx-auto mb-2 opacity-70" />
              <h4 className="text-sm font-semibold text-[#5a5450]">No connected friends yet</h4>
              <p className="text-xs text-[#8a8278] max-w-xs mx-auto">
                Explore the Meet tab to discover people nearby and send connect requests.
              </p>
            </div>
          ) : filteredFriends.length === 0 ? (
            <div className="bg-white border border-[#E2DBD0] rounded-3xl p-8 text-center text-[#8a8278] text-xs shadow-xs">
              No friends matching "{searchQuery}"
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredFriends.map((friend: any) => {
                const affinity = friend.matchPercentage ?? computeAffinity(myHobbies, friend.hobbies);
                const displayHobbies = (friend.hobbies || []).slice(0, 4);
                const remainingCount = Math.max(0, (friend.hobbies?.length || 0) - 4);

                return (
                  <div
                    key={friend.id}
                    onClick={() => setExploringUser(friend)}
                    className="bg-white border border-[#E2DBD0] hover:border-[#2D5A3D]/50 rounded-3xl p-5 flex flex-col justify-between shadow-xs hover:shadow-md transition-all duration-200 cursor-pointer"
                  >
                    <div>
                      {/* Header info */}
                      <div className="flex items-start gap-3.5 mb-3.5">
                        <Avatar
                          name={friend.username}
                          photoUrl={friend.photoUrl}
                          size="md"
                          className="w-13 h-13 border-2 border-white shadow-xs rounded-full ring-1 ring-[#2D5A3D]/20 shrink-0"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <h4 className="text-base font-semibold text-[#2C2C2C] truncate">
                              @{friend.username}
                            </h4>
                            {friend.age ? (
                              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-[#FAF8F5] border border-[#E2DBD0] text-stone-700 shadow-2xs">
                                {friend.age} yrs
                              </span>
                            ) : null}
                          </div>
                          <p className="text-xs text-[#8a8278] truncate mt-0.5">
                            📍 {friend.neighbourhood || friend.cityName || 'Havens Friend'}
                          </p>
                        </div>
                        {affinity > 0 && (
                          <span className="shrink-0 text-xs font-bold px-2.5 py-0.5 rounded-full bg-[#eaf3ed] text-[#2D5A3D] border border-[#7aaa8a]/30">
                            {affinity}%
                          </span>
                        )}
                      </div>

                      {/* Shared Hobby Tags (Strictly Max 4) */}
                      {displayHobbies.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mb-4 min-h-[28px] items-center">
                          {displayHobbies.map((hb: any) => {
                            const isShared = myHobbies.some((mh: any) => String(mh.id) === String(hb.id));
                            return (
                              <span
                                key={hb.id}
                                className={`text-[11px] px-2.5 py-1 rounded-xl font-medium border ${
                                  isShared
                                    ? 'bg-[#eaf3ed] text-[#2D5A3D] border-[#7aaa8a]/30 font-semibold'
                                    : 'bg-[#F4EEE2] text-[#6b645d] border-[#E2DBD0]/60'
                                }`}
                              >
                                {isShared && '✦ '}#{hb.name}
                              </span>
                            );
                          })}
                          {remainingCount > 0 && (
                            <span className="text-[11px] text-[#8a8278] font-medium px-2 py-0.5 bg-[#F0EAE0] rounded-xl">
                              +{remainingCount}
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Actions: Open Chat */}
                    <div className="pt-2.5 border-t border-[#E2DBD0]/60 flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleChat(String(friend.id), friend.matchId);
                        }}
                        className="w-full py-2 rounded-xl bg-[#eaf3ed] text-[#2D5A3D] hover:bg-[#2D5A3D] hover:text-white text-xs font-semibold transition-all shadow-2xs cursor-pointer flex items-center justify-center gap-1.5"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                        </svg>
                        <span>Open Chat</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Load More Friends Pagination */}
          {!friendsLoading && acceptedFriends.length > 0 && (
            <div className="pt-4 flex flex-col items-center justify-center gap-2">
              {hasMoreFriends && onLoadMoreFriends ? (
                <button
                  type="button"
                  onClick={onLoadMoreFriends}
                  disabled={loadingMoreFriends}
                  className="px-6 py-2.5 rounded-2xl bg-white border border-[#E2DBD0] hover:border-[#2D5A3D]/50 hover:bg-[#FAF8F5] text-stone-800 text-xs font-bold transition-all shadow-2xs hover:shadow-xs flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {loadingMoreFriends ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-[#2D5A3D] border-t-transparent rounded-full animate-spin" />
                      <span>Loading more friends...</span>
                    </>
                  ) : (
                    <>
                      <Users className="w-3.5 h-3.5 text-[#2D5A3D]" />
                      <span>Load More Friends ({acceptedFriends.length} loaded)</span>
                    </>
                  )}
                </button>
              ) : (
                <div className="flex items-center gap-2 text-stone-500 text-xs py-2 px-4 rounded-full bg-[#FAF8F5] border border-[#E2DBD0]/60">
                  <span>✓</span>
                  <span>All {acceptedFriends.length} connected friends loaded</span>
                </div>
              )}
            </div>
          )}
        </section>
      )}

      {/* ─── User Profile Preview Modal ─── */}
      {exploringUser && (
        <UserProfileModal
          user={exploringUser}
          currentUser={currentUser}
          myHobbies={myHobbies}
          isConnected={true}
          onClose={() => setExploringUser(null)}
          onOpenChat={(id, matchId) => {
            setExploringUser(null);
            handleChat(id, matchId);
          }}
        />
      )}
    </div>
  );
};

export default ConnectionsTab;
