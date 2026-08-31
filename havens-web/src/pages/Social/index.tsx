import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useQuery, useMutation } from '@apollo/client';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useApp } from '../../context/AppContext';
import { SectionHeading } from '../../components/SectionHeading';
import {
  GET_ALL_USERS,
  SEND_CONNECT_REQUEST,
  RESPOND_CONNECT_REQUEST,
  MY_MATCHES,
  PENDING_CONNECTION_REQUESTS,
  MY_FRIENDS,
  GET_ALL_COMMUNITIES,
  JOIN_COMMUNITY,
  MY_COMMUNITIES,
} from '../../graphql/operations';
import { TabType } from './types';
import { ignoreUser, isUserIgnored } from './utils/ignoreStorage';
import { MeetTab } from './components/MeetTab';
import { ConnectionsTab } from './components/ConnectionsTab';
import { CirclesTab } from './components/CirclesTab';
import { Sparkles, UserCheck, Users } from 'lucide-react';

export const SocialView: React.FC = () => {
  const { user: currentUser } = useAuth();
  const { t } = useApp();
  const [activeTab, setActiveTab] = useState<TabType>('meet');
  const [actionStatus, setActionStatus] = useState<string>('');
  const [optimisticJoinedCircleIds, setOptimisticJoinedCircleIds] = useState<number[]>([]);
  const [sentRequestIds, setSentRequestIds] = useState<number[]>([]);
  const [passedUserIds, setPassedUserIds] = useState<string[]>([]);
  const [fadingCardId, setFadingCardId] = useState<string | null>(null);
  const [connectingUserId, setConnectingUserId] = useState<number | null>(null);

  // ─── Pagination State for Meet / Recommended Users ───
  const PAGE_SIZE = 10;
  const [hasMoreUsers, setHasMoreUsers] = useState(true);
  const [loadingMoreUsers, setLoadingMoreUsers] = useState(false);

  // ─── GraphQL Queries ───
  const {
    data: usersData,
    loading: usersLoading,
    fetchMore: fetchMoreUsers,
    refetch: refetchUsers,
  } = useQuery(GET_ALL_USERS, {
    variables: { limit: PAGE_SIZE, offset: 0 },
    fetchPolicy: 'cache-and-network',
    notifyOnNetworkStatusChange: true,
  });

  useEffect(() => {
    if (usersData?.allUsers) {
      if (usersData.allUsers.length < PAGE_SIZE) {
        setHasMoreUsers(false);
      }
    }
  }, [usersData?.allUsers, PAGE_SIZE]);

  const handleLoadMoreUsers = async () => {
    if (loadingMoreUsers || !hasMoreUsers) return;
    setLoadingMoreUsers(true);
    try {
      const currentOffset = usersData?.allUsers?.length || 0;
      const res = await fetchMoreUsers({
        variables: {
          offset: currentOffset,
          limit: PAGE_SIZE,
        },
        updateQuery: (prev: any, { fetchMoreResult }: any) => {
          if (!fetchMoreResult || !fetchMoreResult.allUsers || fetchMoreResult.allUsers.length === 0) {
            setHasMoreUsers(false);
            return prev;
          }
          if (fetchMoreResult.allUsers.length < PAGE_SIZE) {
            setHasMoreUsers(false);
          }
          return {
            ...prev,
            allUsers: [...(prev.allUsers || []), ...fetchMoreResult.allUsers],
          };
        },
      });
      if (!res.data?.allUsers || res.data.allUsers.length < PAGE_SIZE) {
        setHasMoreUsers(false);
      }
    } catch (err) {
      console.error('Failed to load more recommended users', err);
    } finally {
      setLoadingMoreUsers(false);
    }
  };

  // ─── Pagination State for Connections & Friends ───
  const CONNECTIONS_PAGE_SIZE = 10;
  const [hasMoreRequests, setHasMoreRequests] = useState(true);
  const [loadingMoreRequests, setLoadingMoreRequests] = useState(false);
  const [hasMoreFriends, setHasMoreFriends] = useState(true);
  const [loadingMoreFriends, setLoadingMoreFriends] = useState(false);

  const {
    data: matchesData,
    refetch: refetchMatches,
    fetchMore: fetchMoreMatches,
  } = useQuery(MY_MATCHES, {
    variables: { status: 'accepted', limit: CONNECTIONS_PAGE_SIZE, offset: 0 },
    fetchPolicy: 'cache-and-network',
    skip: !currentUser,
  });

  const {
    data: pendingData,
    loading: requestsLoading,
    refetch: refetchPending,
    fetchMore: fetchMorePending,
  } = useQuery(PENDING_CONNECTION_REQUESTS, {
    variables: { limit: CONNECTIONS_PAGE_SIZE, offset: 0 },
    fetchPolicy: 'cache-and-network',
    skip: !currentUser,
  });

  useEffect(() => {
    if (pendingData?.pendingConnectionRequests) {
      const items = pendingData.pendingConnectionRequests || [];
      setHasMoreRequests(items.length >= CONNECTIONS_PAGE_SIZE);
    }
  }, [pendingData]);

  const {
    data: friendsData,
    loading: friendsLoading,
    refetch: refetchFriends,
    fetchMore: fetchMoreFriends,
  } = useQuery(MY_FRIENDS, {
    variables: { limit: CONNECTIONS_PAGE_SIZE, offset: 0 },
    fetchPolicy: 'cache-and-network',
    skip: !currentUser,
  });

  useEffect(() => {
    if (friendsData?.myFriends) {
      const items = friendsData.myFriends || [];
      setHasMoreFriends(items.length >= CONNECTIONS_PAGE_SIZE);
    }
  }, [friendsData]);

  const handleLoadMoreRequests = async () => {
    if (loadingMoreRequests || !hasMoreRequests) return;
    setLoadingMoreRequests(true);
    try {
      const currentOffset = pendingData?.pendingConnectionRequests?.length || 0;
      await fetchMorePending({
        variables: {
          offset: currentOffset,
          limit: CONNECTIONS_PAGE_SIZE,
        },
        updateQuery: (prev: any, { fetchMoreResult }: any) => {
          if (!fetchMoreResult || !fetchMoreResult.pendingConnectionRequests || fetchMoreResult.pendingConnectionRequests.length === 0) {
            setHasMoreRequests(false);
            return prev;
          }
          if (fetchMoreResult.pendingConnectionRequests.length < CONNECTIONS_PAGE_SIZE) {
            setHasMoreRequests(false);
          }
          return {
            ...prev,
            pendingConnectionRequests: [...(prev.pendingConnectionRequests || []), ...fetchMoreResult.pendingConnectionRequests],
          };
        },
      });
    } catch (err) {
      console.error('Failed to load more connection requests', err);
    } finally {
      setLoadingMoreRequests(false);
    }
  };

  const handleLoadMoreFriends = async () => {
    if (loadingMoreFriends || !hasMoreFriends) return;
    setLoadingMoreFriends(true);
    try {
      const currentOffset = friendsData?.myFriends?.length || 0;
      await fetchMoreFriends({
        variables: {
          offset: currentOffset,
          limit: CONNECTIONS_PAGE_SIZE,
        },
        updateQuery: (prev: any, { fetchMoreResult }: any) => {
          if (!fetchMoreResult || !fetchMoreResult.myFriends || fetchMoreResult.myFriends.length === 0) {
            setHasMoreFriends(false);
            return prev;
          }
          if (fetchMoreResult.myFriends.length < CONNECTIONS_PAGE_SIZE) {
            setHasMoreFriends(false);
          }
          return {
            ...prev,
            myFriends: [...(prev.myFriends || []), ...fetchMoreResult.myFriends],
          };
        },
      });
    } catch (err) {
      console.error('Failed to load more friends', err);
    } finally {
      setLoadingMoreFriends(false);
    }
  };

  const { refetch: refetchAllCommunities } = useQuery(GET_ALL_COMMUNITIES, {
    fetchPolicy: 'cache-and-network',
  });

  const { data: myCommunitiesData, refetch: refetchMyCommunities } = useQuery(MY_COMMUNITIES, {
    fetchPolicy: 'cache-and-network',
    skip: !currentUser,
  });

  // ─── Mutations ───
  const [sendConnectRequestMutation] = useMutation(SEND_CONNECT_REQUEST, {
    onCompleted: (res) => {
      setConnectingUserId(null);
      if (res?.sendConnectRequest?.success) {
        setActionStatus(res.sendConnectRequest.message || 'Connection request sent!');
        refetchMatches();
        refetchPending();
        refetchFriends();
      } else {
        setActionStatus(res?.sendConnectRequest?.message || 'Notice on connection request.');
      }
    },
    onError: (err) => {
      setConnectingUserId(null);
      setActionStatus(`Error: ${err.message}`);
    },
  });

  const [respondConnectRequestMutation] = useMutation(RESPOND_CONNECT_REQUEST, {
    onCompleted: (res) => {
      if (res?.respondConnectRequest?.success) {
        setActionStatus(res.respondConnectRequest.message || 'Connection updated.');
        refetchPending();
        refetchMatches();
        refetchFriends();
      } else {
        setActionStatus(res?.respondConnectRequest?.message || 'Error updating connection.');
      }
    },
    onError: (err) => {
      setActionStatus(`Error: ${err.message}`);
    },
  });

  const [joinCommunity] = useMutation(JOIN_COMMUNITY, {
    onCompleted: (res) => {
      if (res?.joinCommunity?.success) {
        setActionStatus(res.joinCommunity.message || 'Joined circle!');
        refetchMyCommunities();
        refetchAllCommunities();
      } else {
        setActionStatus(res?.joinCommunity?.message || 'Notice on joining circle.');
        refetchMyCommunities();
      }
    },
    onError: (err) => {
      setActionStatus(`Error: ${err.message}`);
      refetchMyCommunities();
    },
  });

  // ─── Derived Data ───
  const joinedCircleIds = useMemo(() => {
    const fromServer = (myCommunitiesData?.myCommunities || [])
      .map((m: any) => Number(m.community?.id))
      .filter((id: number) => !isNaN(id));
    return Array.from(new Set([...fromServer, ...optimisticJoinedCircleIds]));
  }, [myCommunitiesData, optimisticJoinedCircleIds]);
  const recommendedUsers = usersData?.allUsers || [];
  const acceptedMatches = matchesData?.myMatches || [];
  const pendingRequests = pendingData?.pendingConnectionRequests || [];
  const acceptedFriendsList = friendsData?.myFriends || [];

  // Combine accepted friends with accepted match partners to provide rich directory
  const allFriends = useMemo(() => {
    const friendMap = new Map<string, any>();

    // 1. Add from myFriends
    acceptedFriendsList.forEach((f: any) => {
      friendMap.set(String(f.id), { ...f });
    });

    // 2. Add from accepted matches
    acceptedMatches.forEach((m: any) => {
      const partner = m.user1?.id === currentUser?.id ? m.user2 : m.user1;
      if (partner) {
        const id = String(partner.id);
        if (!friendMap.has(id)) {
          friendMap.set(id, {
            ...partner,
            matchId: m.id,
          });
        } else {
          friendMap.set(id, {
            ...friendMap.get(id),
            matchId: m.id,
          });
        }
      }
    });

    return Array.from(friendMap.values());
  }, [acceptedFriendsList, acceptedMatches, currentUser]);

  const myHobbies = currentUser?.hobbies || [];

  // Filter suggestions: exclude self, already connected/requested friends, and ignored users
  const suggestedUsers = useMemo(() => {
    const connectedIds = new Set([
      ...allFriends.map((f: any) => String(f.id)),
      ...pendingRequests.map((r: any) => {
        const other = r.initiator || r.fromUser || (r.user1?.id === currentUser?.id ? r.user2 : r.user1);
        return String(other?.id);
      }),
    ]);

    return recommendedUsers.filter((u: any) => {
      if (u.id === currentUser?.id || u.username === currentUser?.username) return false;
      if (connectedIds.has(String(u.id))) return false;
      if (passedUserIds.includes(String(u.id))) return false;
      if (isUserIgnored(String(u.id))) return false;
      return true;
    });
  }, [recommendedUsers, currentUser, allFriends, pendingRequests, passedUserIds]);

  // ─── Handlers ───
  const handleConnect = useCallback((userId: string) => {
    const id = parseInt(userId, 10);
    if (!id) return;
    setConnectingUserId(id);
    setSentRequestIds((prev) => [...prev, id]);
    sendConnectRequestMutation({ variables: { toUserId: id } });
  }, [sendConnectRequestMutation]);

  const handleIgnore = useCallback((userId: string) => {
    setFadingCardId(userId);
    setTimeout(() => {
      ignoreUser(userId);
      setPassedUserIds((prev) => [...prev, userId]);
      setFadingCardId(null);
    }, 300);
  }, []);

  const handleRespondRequest = (requestId: string | number, action: 'accepted' | 'rejected') => {
    setActionStatus('');
    respondConnectRequestMutation({
      variables: {
        matchId: parseInt(String(requestId), 10),
        action: action === 'accepted' ? 'accept' : 'reject',
      },
    });
  };

  const navigate = useNavigate();

  const handleJoinCircle = (circleId: number) => {
    setOptimisticJoinedCircleIds((prev) => [...prev, circleId]);
    joinCommunity({ variables: { communityId: circleId } });
  };

  const handleOpenChat = (userId: string, matchId?: string) => {
    if (matchId) {
      navigate(`/chat?match=${matchId}`);
    } else {
      navigate('/chat');
    }
  };

  const connectionsCount = pendingRequests.length;

  return (
    <div className="max-w-[1200px] mx-auto px-4 sm:px-6 py-8 space-y-6">
      {/* ── Header & Pill Tab Switcher ── */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <SectionHeading>{t('socialTitle')}</SectionHeading>
          <p className="text-sm text-[#8a8278] mt-1">
            {t('socialSubtitle')}
          </p>
        </div>

        {/* Pill Tabs */}
        <div className="flex items-center gap-1 p-1 bg-[#E2DBD0]/60 rounded-2xl w-full md:w-auto">
          {([
            { key: 'meet' as TabType, label: t('meetTab'), icon: <Sparkles className="w-3.5 h-3.5" /> },
            { key: 'connections' as TabType, label: t('connectionsTab'), icon: <UserCheck className="w-3.5 h-3.5" />, badge: connectionsCount },
            { key: 'circles' as TabType, label: t('circlesTab'), icon: <Users className="w-3.5 h-3.5" /> },
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
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
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

      {/* TAB 1: MEET */}
      {activeTab === 'meet' && (
        <MeetTab
          loading={usersLoading && !loadingMoreUsers}
          suggestedUsers={suggestedUsers}
          myHobbies={myHobbies}
          fadingCardId={fadingCardId}
          sentRequestUserIds={sentRequestIds}
          connectingUserId={connectingUserId}
          hasMore={hasMoreUsers}
          loadingMore={loadingMoreUsers}
          onLoadMore={handleLoadMoreUsers}
          onConnect={handleConnect}
          onIgnore={handleIgnore}
          onOpenChat={handleOpenChat}
        />
      )}

      {/* TAB 2: CONNECTIONS */}
      {activeTab === 'connections' && (
        <ConnectionsTab
          requestsLoading={requestsLoading && !loadingMoreRequests}
          pendingRequests={pendingRequests}
          friendsLoading={friendsLoading && !loadingMoreFriends}
          acceptedFriends={allFriends}
          currentUser={currentUser}
          myHobbies={myHobbies}
          hasMoreRequests={hasMoreRequests}
          loadingMoreRequests={loadingMoreRequests}
          onLoadMoreRequests={handleLoadMoreRequests}
          hasMoreFriends={hasMoreFriends}
          loadingMoreFriends={loadingMoreFriends}
          onLoadMoreFriends={handleLoadMoreFriends}
          onRespondRequest={handleRespondRequest}
          onOpenChat={handleOpenChat}
        />
      )}

      {/* TAB 3: CIRCLES */}
      {activeTab === 'circles' && (
        <CirclesTab
          joinedCircleIds={joinedCircleIds}
          onJoinCircle={handleJoinCircle}
          myHobbies={myHobbies}
          onActionStatus={(msg: string) => setActionStatus(msg)}
        />
      )}
    </div>
  );
};

export default SocialView;
