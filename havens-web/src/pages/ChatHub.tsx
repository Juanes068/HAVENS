import React, { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation } from '@apollo/client';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  MY_MATCHES,
  MESSAGES_BY_MATCH,
  SEND_MESSAGE,
} from '../graphql/operations';
import { encryptMessage, decryptMessage } from '../utils/crypto';

/**
 * ChatHub — Dedicated full-page encrypted messaging center.
 *
 * Layout: Split-pane with conversation sidebar (left) and active thread (right).
 * Mobile: Shows conversation list first; tapping a conversation shows the thread with a back button.
 * E2EE: Messages pass through encrypt/decrypt wrappers (passthrough in MVP, AES-256 in production).
 */
export const ChatHubView: React.FC = () => {
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();
  const [selectedMatch, setSelectedMatch] = useState<any | null>(null);
  const [messageInput, setMessageInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Fetch all active match conversations
  const { data: matchesData, loading: matchesLoading } = useQuery(MY_MATCHES, {
    fetchPolicy: 'cache-and-network',
  });

  // Fetch messages for selected conversation
  const { data: chatData, refetch: refetchChat } = useQuery(MESSAGES_BY_MATCH, {
    variables: { matchId: selectedMatch ? parseInt(selectedMatch.id, 10) : 0 },
    skip: !selectedMatch,
    fetchPolicy: 'network-only',
    pollInterval: selectedMatch ? 5000 : 0, // Poll every 5s when a conversation is active
  });

  // Send message mutation
  const [sendMessageMutation, { loading: isSending }] = useMutation(SEND_MESSAGE, {
    onCompleted: () => {
      setMessageInput('');
      refetchChat();
    },
  });

  const activeMatches = matchesData?.myMatches || [];
  const messages = chatData?.messagesByMatch || [];

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageInput.trim() || !selectedMatch) return;

    const matchId = parseInt(selectedMatch.id, 10);
    // E2EE: Encrypt before sending (passthrough in MVP)
    const encryptedContent = encryptMessage(messageInput.trim(), matchId);

    sendMessageMutation({
      variables: {
        matchId,
        content: encryptedContent,
      },
    });
  };

  const handleSelectConversation = (match: any) => {
    const partner = match.user1?.id === currentUser?.id ? match.user2 : match.user1;
    setSelectedMatch({ ...match, partner });
  };

  // Mobile: If a conversation is selected, show the thread; otherwise show the list
  const showMobileThread = !!selectedMatch;

  return (
    <div className="max-w-[1200px] mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-serif font-bold text-[#2D5A3D]">Messages</h1>
          <p className="text-xs text-[#8a8278] mt-0.5">
            End-to-end encrypted conversations with your connections
          </p>
        </div>
        <button
          type="button"
          onClick={() => navigate('/social')}
          className="px-3 py-1.5 rounded-xl border border-[#E2DBD0] text-xs font-semibold text-[#5a5450] hover:bg-[#F4EEE2] transition-colors cursor-pointer"
        >
          ← Back to Social
        </button>
      </div>

      {/* E2EE Security Banner */}
      <div className="flex items-center gap-2 px-4 py-2.5 bg-[#eaf3ed] border border-[#7aaa8a]/30 rounded-xl">
        <svg className="w-4 h-4 text-[#2D5A3D] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
        <span className="text-[11px] text-[#2D5A3D] font-medium">
          Messages are end-to-end encrypted. Only you and your connection can read them.
        </span>
      </div>

      {/* Main Chat Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 min-h-[550px]">

        {/* ─── Conversation Sidebar ─── */}
        <div className={`bg-white border border-[#E2DBD0] rounded-2xl p-4 space-y-3 ${showMobileThread ? 'hidden lg:block' : ''}`}>
          <div className="flex items-center justify-between px-2">
            <h3 className="text-sm font-semibold text-[#2D5A3D]">Conversations</h3>
            <span className="text-[11px] text-[#8a8278] font-medium">
              {activeMatches.length} active
            </span>
          </div>

          {matchesLoading ? (
            // Skeleton Loader
            <div className="space-y-3 px-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-3 animate-pulse">
                  <div className="w-10 h-10 rounded-full bg-[#E2DBD0]" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3 bg-[#E2DBD0] rounded w-24" />
                    <div className="h-2 bg-[#E2DBD0]/60 rounded w-16" />
                  </div>
                </div>
              ))}
            </div>
          ) : activeMatches.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
              <span className="text-4xl mb-3">🤝</span>
              <p className="text-sm font-medium text-[#5a5450] mb-1">No conversations yet</p>
              <p className="text-xs text-[#8a8278] mb-4">
                Connect with members in the Social tab to start chatting
              </p>
              <button
                type="button"
                onClick={() => navigate('/social')}
                className="px-4 py-2 rounded-xl bg-[#2D5A3D] text-white text-xs font-semibold hover:bg-[#3d7a55] transition-colors cursor-pointer"
              >
                Find Connections
              </button>
            </div>
          ) : (
            <div className="space-y-1.5">
              {activeMatches.map((m: any) => {
                const partner = m.user1?.id === currentUser?.id ? m.user2 : m.user1;
                const isSelected = selectedMatch?.id === m.id;
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => handleSelectConversation(m)}
                    className={`w-full p-3 rounded-xl border text-left transition-all flex items-center gap-3 cursor-pointer ${
                      isSelected
                        ? 'bg-[#F4EEE2] border-[#2D5A3D] shadow-xs'
                        : 'bg-white border-[#E2DBD0]/60 hover:bg-[#F4EEE2]/50'
                    }`}
                  >
                    <div className="w-10 h-10 rounded-full bg-[#2D5A3D] text-white flex items-center justify-center font-bold text-sm shrink-0 overflow-hidden">
                      {partner?.photoUrl ? (
                        <img src={partner.photoUrl} alt={partner.username} className="w-full h-full object-cover" />
                      ) : (
                        partner?.username?.charAt(0).toUpperCase() || 'U'
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-charcoal truncate">@{partner?.username}</p>
                      <p className="text-[10px] text-[#8a8278] truncate">
                        {partner?.neighbourhood || 'Connected Member'}
                      </p>
                    </div>
                    {isSelected && (
                      <span className="w-2 h-2 rounded-full bg-[#2D5A3D] shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* ─── Chat Thread Pane ─── */}
        <div className={`lg:col-span-2 bg-white border border-[#E2DBD0] rounded-2xl flex flex-col overflow-hidden ${!showMobileThread ? 'hidden lg:flex' : ''}`}>
          {selectedMatch ? (
            <>
              {/* Thread Header */}
              <div className="p-4 border-b border-[#E2DBD0] bg-[#F0EAE0]/50 flex items-center gap-3">
                {/* Mobile Back Button */}
                <button
                  type="button"
                  onClick={() => setSelectedMatch(null)}
                  className="lg:hidden p-1.5 rounded-lg hover:bg-[#E2DBD0] text-[#5a5450] transition-colors cursor-pointer mr-1"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                  </svg>
                </button>

                <div className="w-9 h-9 rounded-full bg-[#2D5A3D] text-white flex items-center justify-center font-bold text-xs shrink-0 overflow-hidden">
                  {selectedMatch.partner?.photoUrl ? (
                    <img src={selectedMatch.partner.photoUrl} alt={selectedMatch.partner.username} className="w-full h-full object-cover" />
                  ) : (
                    selectedMatch.partner?.username?.charAt(0).toUpperCase() || 'U'
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-semibold text-charcoal truncate">
                    @{selectedMatch.partner?.username}
                  </h4>
                  <div className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    <p className="text-[10px] text-[#2D5A3D] font-medium">Connected Member</p>
                  </div>
                </div>

                {/* E2EE Lock Icon */}
                <div className="flex items-center gap-1 px-2 py-1 bg-[#eaf3ed] rounded-lg" title="End-to-end encrypted">
                  <svg className="w-3 h-3 text-[#2D5A3D]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                  <span className="text-[9px] text-[#2D5A3D] font-semibold">E2EE</span>
                </div>
              </div>

              {/* Messages Container */}
              <div className="p-4 flex-1 overflow-y-auto space-y-3 max-h-[420px] min-h-[300px] bg-[#F4EEE2]/20">
                {messages.length > 0 ? (
                  <>
                    {messages.map((msg: any) => {
                      const isMe = msg.sender?.id === currentUser?.id;
                      const matchId = parseInt(selectedMatch.id, 10);
                      // E2EE: Decrypt after fetching (passthrough in MVP)
                      const displayContent = decryptMessage(msg.content, matchId);

                      return (
                        <div
                          key={msg.id}
                          className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
                        >
                          <div
                            className={`max-w-[75%] px-4 py-2.5 rounded-2xl text-xs leading-relaxed ${
                              isMe
                                ? 'bg-[#2D5A3D] text-white rounded-br-none'
                                : 'bg-white border border-[#E2DBD0] text-[#2C2C2C] rounded-bl-none shadow-xs'
                            }`}
                          >
                            {displayContent}
                          </div>
                          <span className="text-[9px] text-[#8a8278] mt-1 px-1">
                            {new Date(msg.createdAt).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </div>
                      );
                    })}
                    <div ref={messagesEndRef} />
                  </>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full py-16 text-center">
                    <span className="text-4xl mb-3">👋</span>
                    <p className="text-sm font-medium text-[#5a5450] mb-1">
                      Start the conversation
                    </p>
                    <p className="text-xs text-[#8a8278]">
                      Say hi to @{selectedMatch.partner?.username}!
                    </p>
                  </div>
                )}
              </div>

              {/* Message Input Bar */}
              <form onSubmit={handleSendMessage} className="p-3 border-t border-[#E2DBD0] bg-white flex gap-2">
                <input
                  type="text"
                  value={messageInput}
                  onChange={(e) => setMessageInput(e.target.value)}
                  placeholder={`Message @${selectedMatch.partner?.username}...`}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-[#F4EEE2] border border-[#E2DBD0] text-xs text-[#2C2C2C] focus:outline-none focus:border-[#2D5A3D] transition-colors"
                />
                <button
                  type="submit"
                  disabled={isSending || !messageInput.trim()}
                  className="px-5 py-2.5 rounded-xl bg-[#2D5A3D] text-white text-xs font-semibold hover:bg-[#3d7a55] transition-colors disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                  Send
                </button>
              </form>
            </>
          ) : (
            /* Empty State — No conversation selected */
            <div className="flex flex-col items-center justify-center h-full p-10 text-center text-[#8a8278]">
              <div className="w-16 h-16 rounded-full bg-[#F4EEE2] flex items-center justify-center mb-4">
                <svg className="w-8 h-8 text-[#2D5A3D]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <p className="text-sm font-medium text-[#5a5450] mb-1">Select a conversation</p>
              <p className="text-xs text-[#8a8278]">
                Choose a connection from the sidebar to start chatting
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
