import React, { useState, useMemo, useCallback } from 'react';
import { useQuery, useMutation } from '@apollo/client';
import { useAuth } from '../../context/AuthContext';
import { SectionHeading } from '../../components/SectionHeading';
import {
  GET_ALL_USERS,
  CREATE_MATCH,
  MY_MATCHES,
  MY_FRIEND_REQUESTS,
  MY_FRIENDS,
  RESPOND_FRIEND_REQUEST,
  GET_ALL_COMMUNITIES,
  JOIN_COMMUNITY,
} from '../../graphql/operations';
import { TabType } from './types';
import { ignoreUser, isUserIgnored } from './utils/ignoreStorage';
import { MeetTab } from './components/MeetTab';
import { ConnectionsTab } from './components/ConnectionsTab';
import { CirclesTab } from './components/CirclesTab';

export const SocialView: React.FC = () => {
  const { user: currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>('meet');
  const [actionStatus, setActionStatus] = useState<string>('');
  const [joinedCircleIds, setJoinedCircleIds] = useState<number[]>([]);
  const [matchedUserIds, setMatchedUserIds] = useState<number[]>([]);
  const [passedUserIds, setPassedUserIds] = useState<string[]>([]);
  const [fadingCardId, setFadingCardId] = useState<string | null>(null);

  // ─── GraphQL Queries ───
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
  useQuery(GET_ALL_COMMUNITIES, {
    fetchPolicy: 'cache-and-network',
  });

  // ─── Mutations ───
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

  // ─── Derived Data ───
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

  // ─── Handlers ───
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

      {/* TAB 1: MEET */}
      {activeTab === 'meet' && (
        <MeetTab
          loading={usersLoading}
          suggestedUsers={suggestedUsers}
          myHobbies={myHobbies}
          fadingCardId={fadingCardId}
          isMatching={isMatching}
          onConnect={handleConnect}
          onPass={handlePass}
        />
      )}

      {/* TAB 2: CONNECTIONS */}
      {activeTab === 'connections' && (
        <ConnectionsTab
          requestsLoading={requestsLoading}
          pendingRequests={pendingRequests}
          friendsLoading={friendsLoading}
          acceptedFriends={acceptedFriends}
          activeMatches={activeMatches}
          currentUser={currentUser}
          onRespondRequest={handleRespondRequest}
        />
      )}

      {/* TAB 3: CIRCLES */}
      {activeTab === 'circles' && (
        <CirclesTab
          joinedCircleIds={joinedCircleIds}
          onJoinCircle={handleJoinCircle}
        />
      )}
    </div>
  );
};

export default SocialView;
