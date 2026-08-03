import React, { useState } from 'react';
import { useQuery, useMutation } from '@apollo/client';
import { useAuth } from '../context/AuthContext';
import { SectionHeading } from '../components/SectionHeading';
import {
  GET_ALL_USERS,
  CREATE_MATCH,
  MY_MATCHES,
  MY_FRIEND_REQUESTS,
  RESPOND_FRIEND_REQUEST,
  GET_ALL_COMMUNITIES,
  JOIN_COMMUNITY,
  MESSAGES_BY_MATCH,
  SEND_MESSAGE,
} from '../graphql/operations';

type TabType = 'circles_matches' | 'requests' | 'chats';

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

// Recommended Circle Matches dataset matching location and hobbies taxonomy
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

export const SocialView: React.FC = () => {
  const { user: currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>('circles_matches');
  const [selectedMatchForChat, setSelectedMatchForChat] = useState<any | null>(null);
  const [exploringCircle, setExploringCircle] = useState<CircleMatch | null>(null);
  const [messageInput, setMessageInput] = useState<string>('');
  const [actionStatus, setActionStatus] = useState<string>('');
  const [joinedCircleIds, setJoinedCircleIds] = useState<number[]>([]);
  const [matchedUserIds, setMatchedUserIds] = useState<number[]>([]);

  // GraphQL Queries
  const { data: usersData, loading: usersLoading } = useQuery(GET_ALL_USERS, {
    fetchPolicy: 'cache-and-network',
  });
  const { data: matchesData, refetch: refetchMatches } = useQuery(MY_MATCHES, {
    fetchPolicy: 'cache-and-network',
  });
  const { data: requestsData, refetch: refetchRequests } = useQuery(MY_FRIEND_REQUESTS, {
    fetchPolicy: 'cache-and-network',
  });
  const { data: communitiesData } = useQuery(GET_ALL_COMMUNITIES, {
    fetchPolicy: 'cache-and-network',
  });

  // Chat Messages Query
  const { data: chatData, refetch: refetchChat } = useQuery(MESSAGES_BY_MATCH, {
    variables: { matchId: selectedMatchForChat ? parseInt(selectedMatchForChat.id, 10) : 0 },
    skip: !selectedMatchForChat,
    fetchPolicy: 'network-only',
  });

  // CreateMatch Mutation
  const [createMatchMutation, { loading: isMatching }] = useMutation(CREATE_MATCH, {
    onCompleted: (res) => {
      if (res?.createMatch?.success) {
        setActionStatus(res.createMatch.message || 'Match connection created successfully!');
        refetchMatches();
      } else {
        setActionStatus(res?.createMatch?.message || 'Match request sent.');
      }
    },
    onError: (err) => {
      setActionStatus(`Error: ${err.message}`);
    },
  });

  // Mutations
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

  const [sendMessageMutation, { loading: isSendingMsg }] = useMutation(SEND_MESSAGE, {
    onCompleted: () => {
      setMessageInput('');
      refetchChat();
    },
  });

  const recommendedUsers = usersData?.allUsers || [];
  const activeMatches = matchesData?.myMatches || [];
  const pendingRequests = requestsData?.myFriendRequests || [];

  // Filter out current user from recommended profiles
  const otherUsers = recommendedUsers.filter(
    (u: any) => u.id !== currentUser?.id && u.username !== currentUser?.username
  );

  const handleConnectMatch = (user2IdStr: string) => {
    const user2Id = parseInt(user2IdStr, 10);
    if (!user2Id) return;
    setMatchedUserIds((prev) => [...prev, user2Id]);
    setActionStatus('');
    createMatchMutation({
      variables: { user2Id },
    });
  };

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
    joinCommunity({
      variables: { communityId: circleId },
    });
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageInput.trim() || !selectedMatchForChat) return;

    sendMessageMutation({
      variables: {
        matchId: parseInt(selectedMatchForChat.id, 10),
        content: messageInput.trim(),
      },
    });
  };

  return (
    <div className="max-w-[1200px] mx-auto px-6 py-8 space-y-8">
      {/* Header & Segmented Tab Switcher */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <SectionHeading>Exclusive social & matching hub</SectionHeading>
          <p className="text-sm text-[#8a8278] mt-1">
            Discover recommended circle matches, 1-on-1 member connections, friend requests, and active chats.
          </p>
        </div>

        {/* Segmented Top Control */}
        <div className="flex items-center gap-1 p-1 bg-[#E2DBD0]/60 rounded-2xl max-w-md w-full md:w-auto">
          <button
            type="button"
            onClick={() => setActiveTab('circles_matches')}
            className={`flex-1 md:flex-initial px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'circles_matches'
                ? 'bg-white text-[#2D5A3D] shadow-xs'
                : 'text-[#8a8278] hover:text-[#2C2C2C]'
            }`}
          >
            Circles & Matches
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('requests')}
            className={`flex-1 md:flex-initial px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer relative ${
              activeTab === 'requests'
                ? 'bg-white text-[#2D5A3D] shadow-xs'
                : 'text-[#8a8278] hover:text-[#2C2C2C]'
            }`}
          >
            Requests
            {pendingRequests.length > 0 && (
              <span className="ml-1.5 px-1.5 py-0.5 text-[10px] bg-rose-500 text-white rounded-full font-bold">
                {pendingRequests.length}
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('chats')}
            className={`flex-1 md:flex-initial px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'chats'
                ? 'bg-white text-[#2D5A3D] shadow-xs'
                : 'text-[#8a8278] hover:text-[#2C2C2C]'
            }`}
          >
            Chats ({activeMatches.length})
          </button>
        </div>
      </div>

      {/* Action Notification Status Banner */}
      {actionStatus && (
        <div className="p-3 text-xs bg-[#eaf3ed] border border-[#7aaa8a]/40 text-[#2D5A3D] rounded-xl flex justify-between items-center">
          <span>{actionStatus}</span>
          <button type="button" onClick={() => setActionStatus('')} className="font-bold text-xs cursor-pointer">
            ✕
          </button>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* TAB 1: RECOMMENDED CIRCLE MATCHES & INDIVIDUAL MATCHES */}
      {/* ───────────────────────────────────────────────────────────── */}
      {activeTab === 'circles_matches' && (
        <div className="space-y-10">
          
          {/* SECTION A: PRIORITY FEATURED - RECOMMENDED CIRCLE MATCHES */}
          <div className="bg-gradient-to-br from-[#2D5A3D]/5 via-[#F0EAE0]/80 to-[#F4EEE2] border border-[#2D5A3D]/30 rounded-3xl p-6 md:p-8 shadow-sm">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 border-b border-[#E2DBD0] pb-4">
              <div>
                <span className="text-[11px] font-bold tracking-wider text-[#C47B5A] uppercase">
                  ⭐ Featured Priority Section
                </span>
                <h3 className="text-2xl font-serif font-semibold text-[#2D5A3D] mt-0.5">
                  Recommended Circle Matches
                </h3>
                <p className="text-xs text-[#8a8278] mt-1">
                  Micro-groups matched to your geolocation coordinates & selected hobby affinity taxonomy.
                </p>
              </div>
              <span className="text-xs bg-[#2D5A3D] text-white px-3 py-1.5 rounded-full font-semibold self-start md:self-auto">
                🎯 {RECOMMENDED_CIRCLE_MATCHES.length} Circle Matches Nearby
              </span>
            </div>

            {/* Grid of Recommended Circle Matches Cards */}
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

          {/* SECTION B: INDIVIDUAL MATCHES & CONNECTIONS */}
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-serif font-semibold text-[#2D5A3D]">Individual Matches & Connections</h3>
              <p className="text-xs text-[#8a8278]">Connect with members sharing implicit hobby affinity & location proximity</p>
            </div>

            {/* Sub-Section 1: Recommended Members Ready for CreateMatch */}
            <div>
              <h4 className="text-xs font-bold text-[#8a8278] uppercase tracking-wider mb-3">
                Recommended Members Nearby
              </h4>

              {usersLoading ? (
                <div className="text-xs text-[#8a8278] animate-pulse py-4">Finding affinity matches...</div>
              ) : otherUsers.length === 0 ? (
                <div className="text-xs text-[#8a8278] py-2 bg-white border border-[#E2DBD0] p-4 rounded-xl">
                  No other members registered yet. Invite your friends!
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {otherUsers.map((usr: any) => {
                    const uId = parseInt(usr.id, 10);
                    const isMatched = matchedUserIds.includes(uId);
                    return (
                      <div key={usr.id} className="bg-white border border-[#E2DBD0] rounded-2xl p-4 flex flex-col justify-between shadow-xs">
                        <div>
                          <div className="flex items-center gap-3 mb-3">
                            <div className="w-10 h-10 rounded-full bg-[#2D5A3D] text-white flex items-center justify-center font-bold text-sm">
                              {usr.username ? usr.username.charAt(0).toUpperCase() : 'U'}
                            </div>
                            <div>
                              <h4 className="text-sm font-semibold text-charcoal">@{usr.username}</h4>
                              <span className="text-[11px] text-[#8a8278]">{usr.neighbourhood || 'Trusted Circle'}</span>
                            </div>
                          </div>

                          {usr.hobbies && usr.hobbies.length > 0 && (
                            <div className="flex flex-wrap gap-1 mb-4">
                              {usr.hobbies.slice(0, 3).map((hb: any) => (
                                <span key={hb.id} className="text-[10px] bg-[#F4EEE2] text-[#2D5A3D] px-2 py-0.5 rounded-md font-medium">
                                  {hb.name}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>

                        <button
                          type="button"
                          disabled={isMatched || isMatching}
                          onClick={() => handleConnectMatch(usr.id)}
                          className={`w-full py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                            isMatched
                              ? 'bg-[#eaf3ed] text-[#2D5A3D] border border-[#7aaa8a]/40'
                              : 'bg-[#2D5A3D] text-white hover:bg-[#3d7a55] shadow-xs'
                          }`}
                        >
                          {isMatched ? '✓ Match Connected' : 'Connect / Match'}
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Sub-Section 2: Active Matches List */}
            {activeMatches.length > 0 && (
              <div className="pt-4 border-t border-[#E2DBD0]">
                <h4 className="text-xs font-bold text-[#8a8278] uppercase tracking-wider mb-3">
                  Your Active Match Connections ({activeMatches.length})
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  {activeMatches.map((m: any) => {
                    const partner = m.user1?.id === currentUser?.id ? m.user2 : m.user1;
                    return (
                      <div
                        key={m.id}
                        className="bg-white border border-[#E2DBD0] rounded-2xl p-4 flex items-center justify-between shadow-xs"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-[#2D5A3D] text-white flex items-center justify-center font-bold text-sm">
                            {partner?.username ? partner.username.charAt(0).toUpperCase() : 'U'}
                          </div>
                          <div>
                            <h4 className="text-sm font-semibold text-charcoal">@{partner?.username || 'member'}</h4>
                            <p className="text-[11px] text-[#8a8278]">{partner?.neighbourhood || 'Trusted Circle'}</p>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            setSelectedMatchForChat({ ...m, partner });
                            setActiveTab('chats');
                          }}
                          className="px-3 py-1.5 rounded-xl bg-[#eaf3ed] text-[#2D5A3D] hover:bg-[#2D5A3D] hover:text-white text-xs font-semibold transition-all cursor-pointer"
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
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* TAB 2: FRIEND REQUESTS */}
      {/* ───────────────────────────────────────────────────────────── */}
      {activeTab === 'requests' && (
        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-serif font-semibold text-[#2D5A3D]">Pending Connection Requests</h3>
            <p className="text-xs text-[#8a8278]">Accept or decline incoming circle connection invitations</p>
          </div>

          {pendingRequests.length === 0 ? (
            <div className="bg-white border border-[#E2DBD0] rounded-2xl p-10 text-center text-[#8a8278] text-xs">
              🎉 You have no pending connection requests at this time.
            </div>
          ) : (
            <div className="space-y-3">
              {pendingRequests.map((req: any) => (
                <div
                  key={req.id}
                  className="bg-white border border-[#E2DBD0] rounded-2xl p-4 flex items-center justify-between shadow-xs"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-full bg-[#C47B5A] text-white flex items-center justify-center font-bold text-sm">
                      {req.fromUser?.username ? req.fromUser.username.charAt(0).toUpperCase() : 'U'}
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-charcoal">@{req.fromUser?.username}</h4>
                      <p className="text-[11px] text-[#8a8278]">
                        Wants to connect • {req.fromUser?.neighbourhood || 'Vancouver'}
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
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* TAB 3: CHATS & CONVERSATIONS */}
      {/* ───────────────────────────────────────────────────────────── */}
      {activeTab === 'chats' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 min-h-[500px]">
          {/* Conversations Thread Sidebar */}
          <div className="bg-white border border-[#E2DBD0] rounded-2xl p-4 space-y-3">
            <h3 className="text-sm font-semibold text-[#2D5A3D] px-2">Active Conversations</h3>

            {activeMatches.length === 0 ? (
              <div className="text-xs text-[#8a8278] px-2 py-4">No active conversations. Connect with members to unlock chat threads!</div>
            ) : (
              <div className="space-y-2">
                {activeMatches.map((m: any) => {
                  const partner = m.user1?.id === currentUser?.id ? m.user2 : m.user1;
                  const isSelected = selectedMatchForChat?.id === m.id;
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setSelectedMatchForChat({ ...m, partner })}
                      className={`w-full p-3 rounded-xl border text-left transition-all flex items-center justify-between cursor-pointer ${
                        isSelected
                          ? 'bg-[#F4EEE2] border-[#2D5A3D]'
                          : 'bg-white border-[#E2DBD0]/60 hover:bg-[#F4EEE2]/50'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-[#2D5A3D] text-white flex items-center justify-center font-bold text-xs">
                          {partner?.username ? partner.username.charAt(0).toUpperCase() : 'U'}
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-charcoal">@{partner?.username}</p>
                          <p className="text-[10px] text-[#8a8278]">Tap to view messages</p>
                        </div>
                      </div>
                      <span className="w-2 h-2 rounded-full bg-[#2D5A3D]" />
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Individual Chat Detail Thread */}
          <div className="lg:col-span-2 bg-white border border-[#E2DBD0] rounded-2xl flex flex-col justify-between overflow-hidden">
            {selectedMatchForChat ? (
              <>
                {/* Chat Header */}
                <div className="p-4 border-b border-[#E2DBD0] bg-[#F0EAE0]/50 flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-[#2D5A3D] text-white flex items-center justify-center font-bold text-xs">
                    {selectedMatchForChat.partner?.username
                      ? selectedMatchForChat.partner.username.charAt(0).toUpperCase()
                      : 'U'}
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-charcoal">
                      @{selectedMatchForChat.partner?.username}
                    </h4>
                    <p className="text-[10px] text-[#2D5A3D] font-medium">● Connected Member</p>
                  </div>
                </div>

                {/* Messages Box */}
                <div className="p-4 flex-1 overflow-y-auto space-y-3 max-h-[360px] min-h-[250px] bg-[#F4EEE2]/20">
                  {chatData?.messagesByMatch && chatData.messagesByMatch.length > 0 ? (
                    chatData.messagesByMatch.map((msg: any) => {
                      const isMe = msg.sender?.id === currentUser?.id;
                      return (
                        <div
                          key={msg.id}
                          className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
                        >
                          <div
                            className={`max-w-[75%] px-4 py-2.5 rounded-2xl text-xs ${
                              isMe
                                ? 'bg-[#2D5A3D] text-white rounded-br-none'
                                : 'bg-white border border-[#E2DBD0] text-[#2C2C2C] rounded-bl-none shadow-xs'
                            }`}
                          >
                            {msg.content}
                          </div>
                          <span className="text-[9px] text-[#8a8278] mt-1 px-1">
                            {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      );
                    })
                  ) : (
                    <div className="text-center text-xs text-[#8a8278] py-10 font-normal">
                      No messages yet in this thread. Say hi to @{selectedMatchForChat.partner?.username}!
                    </div>
                  )}
                </div>

                {/* Send Input Bar */}
                <form onSubmit={handleSendMessage} className="p-3 border-t border-[#E2DBD0] bg-white flex gap-2">
                  <input
                    type="text"
                    value={messageInput}
                    onChange={(e) => setMessageInput(e.target.value)}
                    placeholder={`Message @${selectedMatchForChat.partner?.username}...`}
                    className="flex-1 px-4 py-2 rounded-xl bg-[#F4EEE2] border border-[#E2DBD0] text-xs text-[#2C2C2C] focus:outline-none focus:border-[#2D5A3D]"
                  />
                  <button
                    type="submit"
                    disabled={isSendingMsg || !messageInput.trim()}
                    className="px-4 py-2 rounded-xl bg-[#2D5A3D] text-white text-xs font-semibold hover:bg-[#3d7a55] transition-colors disabled:opacity-50 cursor-pointer"
                  >
                    Send
                  </button>
                </form>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center h-full p-10 text-center text-[#8a8278]">
                <span className="text-3xl mb-2">💬</span>
                <p className="text-sm font-medium">Select a conversation thread on the left to start chatting</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* CIRCLE EXPLORE MODAL */}
      {/* ───────────────────────────────────────────────────────────── */}
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
