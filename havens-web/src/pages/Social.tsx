import React, { useState, useMemo, useCallback } from 'react';
import { useQuery, useMutation } from '@apollo/client';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { SectionHeading } from '../components/SectionHeading';
import {
  GET_ALL_USERS,
  CREATE_MATCH,
  MY_MATCHES,
  MY_FRIEND_REQUESTS,
  MY_FRIENDS,
  RESPOND_FRIEND_REQUEST,
  GET_ALL_COMMUNITIES,
  JOIN_COMMUNITY,
} from '../graphql/operations';

// ─── Types ────────────────────────────────────────────────────
type TabType = 'meet' | 'connections' | 'circles';

interface CircleMatch {
  id: number;
  name: string;
  description: string;
  membersCount: number;
  tags: string[];
  location: string;
  distanceKm: number;
  matchScore: number;
}

// ─── Ignore Cooldown Logic (localStorage, 24h) ───────────────
const IGNORE_COOLDOWN_MS = 24 * 60 * 60 * 1000; // 24 hours
const STORAGE_KEY = 'havens_ignored_users';

const getIgnoredUsers = (): Record<string, number> => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    const now = Date.now();
    // Prune expired entries
    const active: Record<string, number> = {};
    for (const [uid, ts] of Object.entries(parsed)) {
      if (now - (ts as number) < IGNORE_COOLDOWN_MS) {
        active[uid] = ts as number;
      }
    }
    return active;
  } catch {
    return {};
  }
};

const ignoreUser = (userId: string): void => {
  const current = getIgnoredUsers();
  current[userId] = Date.now();
  localStorage.setItem(STORAGE_KEY, JSON.stringify(current));
};

const isUserIgnored = (userId: string): boolean => {
  const ignored = getIgnoredUsers();
  return userId in ignored;
};

// ─── Affinity Calculation ─────────────────────────────────────
const computeAffinity = (myHobbies: any[], theirHobbies: any[]): number => {
  if (!myHobbies?.length || !theirHobbies?.length) return 0;
  const myIds = new Set(myHobbies.map((h: any) => h.id));
  const shared = theirHobbies.filter((h: any) => myIds.has(h.id)).length;
  const total = new Set([...myHobbies.map((h: any) => h.id), ...theirHobbies.map((h: any) => h.id)]).size;
  return total > 0 ? Math.round((shared / total) * 100) : 0;
};

// ─── Recommended Circle Matches (static dataset) ─────────────
const RECOMMENDED_CIRCLE_MATCHES: CircleMatch[] = [
  {
    id: 1,
    name: 'Kitsilano Trail Runners',
    description: 'Local neighborhood running circle exploring Pacific Spirit trails and Kits beach sunset runs.',
    membersCount: 14,
    tags: ['Running', 'Trail Running', 'Outdoors'],
    location: 'Kitsilano, Vancouver',
    distanceKm: 1.2,
    matchScore: 96,
  },
  {
    id: 2,
    name: 'Specialty Coffee & Pour Over Guild',
    description: 'Weekly pour-over tastings, micro-roaster visits, and weekend brunch meetups.',
    membersCount: 28,
    tags: ['Specialty Coffee', 'Espresso', 'Brunch'],
    location: 'Mount Pleasant, Vancouver',
    distanceKm: 2.5,
    matchScore: 92,
  },
  {
    id: 3,
    name: 'North Shore Bouldering Circle',
    description: 'Indoor bouldering sessions at the Hive and outdoor weekend bouldering trips.',
    membersCount: 9,
    tags: ['Bouldering', 'Rock Climbing'],
    location: 'North Vancouver',
    distanceKm: 4.8,
    matchScore: 88,
  },
  {
    id: 4,
    name: 'Web3 & AI Product Designers',
    description: 'Co-working sessions, UI reviews, and open-source collaboration for tech enthusiasts.',
    membersCount: 22,
    tags: ['AI', 'UX/UI Design', 'Startups'],
    location: 'Downtown Vancouver',
    distanceKm: 3.1,
    matchScore: 85,
  },
];

// ─── Skeleton Loaders ─────────────────────────────────────────
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

// ═══════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════
export const SocialView: React.FC = () => {
  const { user: currentUser } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabType>('meet');
  const [exploringCircle, setExploringCircle] = useState<CircleMatch | null>(null);
  const [actionStatus, setActionStatus] = useState<string>('');
  const [joinedCircleIds, setJoinedCircleIds] = useState<number[]>([]);
  const [matchedUserIds, setMatchedUserIds] = useState<number[]>([]);
  const [passedUserIds, setPassedUserIds] = useState<string[]>([]);
  const [fadingCardId, setFadingCardId] = useState<string | null>(null);

  // ─── GraphQL Queries ──────────────────────────────────────
  const { data: usersData, loading: usersLoading } = useQuery(GET_ALL_USERS, {
    fetchPolicy: 'cache-and-network',
  });
  const { data: matchesData, refetch: refetchMatches } = useQuery(MY_MATCHES, {
    fetchPolicy: 'cache-and-network',
  });
  const { data: requestsData, loading: requestsLoading, refetch: refetchRequests } = useQuery(MY_FRIEND_REQUESTS, {
    fetchPolicy: 'cache-and-network',
  });
  const { data: friendsData, loading: friendsLoading } = useQuery(MY_FRIENDS, {
    fetchPolicy: 'cache-and-network',
  });
  const { data: communitiesData } = useQuery(GET_ALL_COMMUNITIES, {
    fetchPolicy: 'cache-and-network',
  });

  // ─── Mutations ────────────────────────────────────────────
  const [createMatchMutation, { loading: isMatching }] = useMutation(CREATE_MATCH, {
    onCompleted: (res) => {
      if (res?.createMatch?.success) {
        setActionStatus(res.createMatch.message || 'Connection created! 🎉');
        refetchMatches();
      } else {
        setActionStatus(res?.createMatch?.message || 'Connection request sent.');
      }
    },
    onError: (err) => {
      setActionStatus(`Error: ${err.message}`);
    },
  });

  const [respondFriendRequest] = useMutation(RESPOND_FRIEND_REQUEST, {
    onCompleted: (res) => {
      setActionStatus(res?.respondFriendRequest?.message || 'Request updated.');
      refetchRequests();
    },
  });

  const [joinCommunity] = useMutation(JOIN_COMMUNITY, {
    onCompleted: (res) => {
      setActionStatus(res?.joinCommunity?.message || 'Joined circle!');
    },
  });

  // ─── Derived Data ─────────────────────────────────────────
  const recommendedUsers = usersData?.allUsers || [];
  const activeMatches = matchesData?.myMatches || [];
  const pendingRequests = requestsData?.myFriendRequests || [];
  const acceptedFriends = friendsData?.myFriends || [];
  const myHobbies = currentUser?.hobbies || [];

  // Filter suggestions: exclude self, already matched, and ignored users
  const suggestedUsers = useMemo(() => {
    const matchedIds = new Set([
      ...matchedUserIds.map(String),
      ...activeMatches.map((m: any) => {
        const partnerId = m.user1?.id === currentUser?.id ? m.user2?.id : m.user1?.id;
        return String(partnerId);
      }),
    ]);

    return recommendedUsers.filter((u: any) => {
      if (u.id === currentUser?.id || u.username === currentUser?.username) return false;
      if (matchedIds.has(String(u.id))) return false;
      if (passedUserIds.includes(String(u.id))) return false;
      if (isUserIgnored(String(u.id))) return false;
      return true;
    });
  }, [recommendedUsers, currentUser, matchedUserIds, activeMatches, passedUserIds]);

  // ─── Handlers ─────────────────────────────────────────────
  const handleConnect = useCallback((userId: string) => {
    const id = parseInt(userId, 10);
    if (!id) return;
    setFadingCardId(userId);
    setTimeout(() => {
      setMatchedUserIds((prev) => [...prev, id]);
      setFadingCardId(null);
      setActionStatus('');
      createMatchMutation({ variables: { user2Id: id } });
    }, 300);
  }, [createMatchMutation]);

  const handlePass = useCallback((userId: string) => {
    setFadingCardId(userId);
    setTimeout(() => {
      ignoreUser(userId);
      setPassedUserIds((prev) => [...prev, userId]);
      setFadingCardId(null);
    }, 300);
  }, []);

  const handleRespondRequest = (requestId: string | number, action: 'accepted' | 'rejected') => {
    setActionStatus('');
    respondFriendRequest({
      variables: {
        requestId: parseInt(String(requestId), 10),
        action,
      },
    });
  };

  const handleJoinCircle = (circleId: number) => {
    setJoinedCircleIds((prev) => [...prev, circleId]);
    joinCommunity({ variables: { communityId: circleId } });
  };

  // ─── Tab Counts ───────────────────────────────────────────
  const connectionsCount = pendingRequests.length;

  return (
    <div className="max-w-[1200px] mx-auto px-4 sm:px-6 py-8 space-y-6">
      {/* ── Header & Pill Tab Switcher ── */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <SectionHeading>Social Hub</SectionHeading>
          <p className="text-sm text-[#8a8278] mt-1">
            Meet new people, manage your connections, and explore local circles.
          </p>
        </div>

        {/* Pill Tabs */}
        <div className="flex items-center gap-1 p-1 bg-[#E2DBD0]/60 rounded-2xl w-full md:w-auto">
          {([
            { key: 'meet' as TabType, label: 'Meet', icon: '👋' },
            { key: 'connections' as TabType, label: 'Connections', icon: '🤝', badge: connectionsCount },
            { key: 'circles' as TabType, label: 'Circles', icon: '⭕' },
          ]).map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={`flex-1 md:flex-initial px-4 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                activeTab === tab.key
                  ? 'bg-white text-[#2D5A3D] shadow-xs'
                  : 'text-[#8a8278] hover:text-[#2C2C2C]'
              }`}
            >
              <span className="text-sm">{tab.icon}</span>
              {tab.label}
              {tab.badge && tab.badge > 0 ? (
                <span className="ml-1 px-1.5 py-0.5 text-[10px] bg-rose-500 text-white rounded-full font-bold leading-none">
                  {tab.badge}
                </span>
              ) : null}
            </button>
          ))}
        </div>
      </div>

      {/* Action Status Banner */}
      {actionStatus && (
        <div className="p-3 text-xs bg-[#eaf3ed] border border-[#7aaa8a]/40 text-[#2D5A3D] rounded-xl flex justify-between items-center">
          <span>{actionStatus}</span>
          <button type="button" onClick={() => setActionStatus('')} className="font-bold text-xs cursor-pointer">
            ✕
          </button>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════ */}
      {/* TAB 1: MEET — Suggested People                        */}
      {/* ═══════════════════════════════════════════════════════ */}
      {activeTab === 'meet' && (
        <div className="space-y-5">
          <div>
            <h3 className="text-lg font-serif font-semibold text-[#2D5A3D]">People You May Like</h3>
            <p className="text-xs text-[#8a8278] mt-0.5">
              Members matched by shared hobbies & location proximity. Connect or pass.
            </p>
          </div>

          {usersLoading ? (
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
                        <div className="w-12 h-12 rounded-full bg-[#2D5A3D] text-white flex items-center justify-center font-bold text-base shrink-0 overflow-hidden border-2 border-white shadow-xs">
                          {usr.photoUrl ? (
                            <img src={usr.photoUrl} alt={usr.username} className="w-full h-full object-cover" />
                          ) : (
                            usr.username?.charAt(0).toUpperCase() || 'U'
                          )}
                        </div>
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
                        onClick={() => handlePass(String(usr.id))}
                        className="flex-1 py-2.5 rounded-xl border border-[#E2DBD0] text-[#8a8278] hover:text-rose-500 hover:border-rose-200 hover:bg-rose-50/50 text-xs font-semibold transition-all cursor-pointer"
                      >
                        Pass
                      </button>
                      <button
                        type="button"
                        disabled={isMatching}
                        onClick={() => handleConnect(String(usr.id))}
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
      )}

      {/* ═══════════════════════════════════════════════════════ */}
      {/* TAB 2: CONNECTIONS — Requests + Friends + Matches      */}
      {/* ═══════════════════════════════════════════════════════ */}
      {activeTab === 'connections' && (
        <div className="space-y-8">

          {/* Section A: Pending Requests */}
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
                {pendingRequests.map((req: any) => (
                  <div
                    key={req.id}
                    className="bg-white border border-[#E2DBD0] rounded-2xl p-4 flex items-center justify-between shadow-xs"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 rounded-full bg-[#C47B5A] text-white flex items-center justify-center font-bold text-sm shrink-0 overflow-hidden">
                        {req.fromUser?.photoUrl ? (
                          <img src={req.fromUser.photoUrl} alt={req.fromUser.username} className="w-full h-full object-cover" />
                        ) : (
                          req.fromUser?.username?.charAt(0).toUpperCase() || 'U'
                        )}
                      </div>
                      <div>
                        <h4 className="text-sm font-semibold text-charcoal">@{req.fromUser?.username}</h4>
                        <p className="text-[11px] text-[#8a8278]">
                          Wants to connect • {req.fromUser?.neighbourhood || 'Havens Member'}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleRespondRequest(req.id, 'accepted')}
                        className="px-4 py-2 rounded-xl bg-[#2D5A3D] hover:bg-[#3d7a55] text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
                      >
                        ✓ Accept
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRespondRequest(req.id, 'rejected')}
                        className="px-3 py-2 rounded-xl border border-[#E2DBD0] hover:bg-rose-50 text-rose-600 text-xs font-medium transition-colors cursor-pointer"
                      >
                        ✕ Decline
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Section B: Your Friends (Accepted Connections) */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-serif font-semibold text-[#2D5A3D]">Your Friends</h3>
                <p className="text-xs text-[#8a8278] mt-0.5">People you've mutually connected with</p>
              </div>
              {acceptedFriends.length > 0 && (
                <span className="text-xs bg-[#eaf3ed] text-[#2D5A3D] px-3 py-1 rounded-full font-semibold">
                  {acceptedFriends.length} friends
                </span>
              )}
            </div>

            {friendsLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {[1, 2, 3].map((i) => <CardSkeleton key={i} />)}
              </div>
            ) : acceptedFriends.length === 0 ? (
              <div className="bg-white border border-[#E2DBD0] rounded-2xl p-8 text-center">
                <span className="text-3xl block mb-2">🤝</span>
                <p className="text-xs text-[#8a8278]">
                  No friends yet. Connect with people in the Meet tab to build your circle.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {acceptedFriends.map((friend: any) => (
                  <div
                    key={friend.id}
                    className="bg-white border border-[#E2DBD0] rounded-2xl p-4 flex items-center justify-between shadow-xs"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-full bg-[#2D5A3D] text-white flex items-center justify-center font-bold text-sm shrink-0 overflow-hidden">
                        {friend.photoUrl ? (
                          <img src={friend.photoUrl} alt={friend.username} className="w-full h-full object-cover" />
                        ) : (
                          friend.username?.charAt(0).toUpperCase() || 'U'
                        )}
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-sm font-semibold text-charcoal truncate">@{friend.username}</h4>
                        <p className="text-[11px] text-[#8a8278] truncate">{friend.neighbourhood || 'Havens Member'}</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => navigate('/chat')}
                      className="px-3 py-1.5 rounded-xl bg-[#eaf3ed] text-[#2D5A3D] hover:bg-[#2D5A3D] hover:text-white text-xs font-semibold transition-all cursor-pointer shrink-0 ml-2"
                    >
                      💬 Chat
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Section C: Active Match Connections */}
          {activeMatches.length > 0 && (
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-serif font-semibold text-[#2D5A3D]">Active Matches</h3>
                <p className="text-xs text-[#8a8278] mt-0.5">Your 1-on-1 match connections</p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {activeMatches.map((m: any) => {
                  const partner = m.user1?.id === currentUser?.id ? m.user2 : m.user1;
                  return (
                    <div
                      key={m.id}
                      className="bg-white border border-[#E2DBD0] rounded-2xl p-4 flex items-center justify-between shadow-xs"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-full bg-[#2D5A3D] text-white flex items-center justify-center font-bold text-sm shrink-0 overflow-hidden">
                          {partner?.photoUrl ? (
                            <img src={partner.photoUrl} alt={partner.username} className="w-full h-full object-cover" />
                          ) : (
                            partner?.username?.charAt(0).toUpperCase() || 'U'
                          )}
                        </div>
                        <div className="min-w-0">
                          <h4 className="text-sm font-semibold text-charcoal truncate">@{partner?.username || 'member'}</h4>
                          <p className="text-[11px] text-[#8a8278] truncate">{partner?.neighbourhood || 'Havens Member'}</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => navigate('/chat')}
                        className="px-3 py-1.5 rounded-xl bg-[#eaf3ed] text-[#2D5A3D] hover:bg-[#2D5A3D] hover:text-white text-xs font-semibold transition-all cursor-pointer shrink-0 ml-2"
                      >
                        💬 Chat
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════ */}
      {/* TAB 3: CIRCLES — Recommended Micro-Communities         */}
      {/* ═══════════════════════════════════════════════════════ */}
      {activeTab === 'circles' && (
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
                          onClick={() => handleJoinCircle(circle.id)}
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
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════ */}
      {/* CIRCLE EXPLORE MODAL                                   */}
      {/* ═══════════════════════════════════════════════════════ */}
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
                  handleJoinCircle(exploringCircle.id);
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
