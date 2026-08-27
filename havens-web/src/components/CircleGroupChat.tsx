import React, { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation } from '@apollo/client';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { GET_CIRCLE_MESSAGES, SEND_CIRCLE_MESSAGE } from '../graphql/operations';
import { Avatar } from './Avatar';
import { getEarthyAvatarColor } from './Facepile';
import {
  MessageSquare,
  Send,
  Lock,
  Crown,
  Users,
  Sparkles,
  Loader2,
  Calendar,
} from 'lucide-react';

interface CircleGroupChatProps {
  circleId: number;
  circleName: string;
  isMember: boolean;
  isCreator: boolean;
  creatorId?: string | number;
  onJoinClick?: () => void;
  isJoining?: boolean;
}

export const CircleGroupChat: React.FC<CircleGroupChatProps> = ({
  circleId,
  circleName,
  isMember,
  isCreator,
  creatorId,
  onJoinClick,
  isJoining,
}) => {
  const { user: currentUser } = useAuth();
  const [content, setContent] = useState('');
  const [sendError, setSendError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const numericCircleId = parseInt(String(circleId), 10) || 0;
  const isAuthorized = Boolean(currentUser && (isMember || isCreator));

  // 1. Fetch group chat messages
  const {
    data,
    loading,
    error,
    refetch,
  } = useQuery(GET_CIRCLE_MESSAGES, {
    variables: { circleId: numericCircleId },
    skip: !numericCircleId || !isAuthorized,
    fetchPolicy: 'cache-and-network',
    pollInterval: isAuthorized ? 4000 : 0, // Live poll every 4s for new group messages
  });

  // 2. Send message mutation
  const [sendCircleMessageMutation, { loading: isSending }] = useMutation(SEND_CIRCLE_MESSAGE, {
    onCompleted: (res) => {
      if (res?.sendCircleMessage?.success) {
        setContent('');
        setSendError(null);
        refetch();
      } else {
        setSendError(res?.sendCircleMessage?.messageField || 'Failed to send message.');
      }
    },
    onError: (err) => {
      setSendError(err.message || 'Error sending message.');
    },
  });

  const messages = data?.getCircleMessages || [];

  // Scroll to bottom whenever message list updates
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages.length]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = content.trim();
    if (!text || isSending || !numericCircleId || (!isMember && !isCreator)) return;

    setSendError(null);
    try {
      await sendCircleMessageMutation({
        variables: {
          circleId: numericCircleId,
          content: text,
        },
      });
    } catch (err) {
      console.error('[SendCircleMessage error]', err);
    }
  };

  const formatTimestamp = (dateStr: string) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    const now = new Date();
    const isToday =
      d.getDate() === now.getDate() &&
      d.getMonth() === now.getMonth() &&
      d.getFullYear() === now.getFullYear();

    if (isToday) {
      return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    }
    return d.toLocaleDateString([], {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // NON-MEMBER / LOCKED STATE
  // ─────────────────────────────────────────────────────────────────────────────
  if (!isMember && !isCreator) {
    return (
      <div className="rounded-3xl border border-[#E2DBD0] bg-white p-8 sm:p-12 text-center shadow-xs flex flex-col items-center justify-center space-y-5">
        <div className="w-16 h-16 rounded-full bg-[#FAF8F5] border border-[#E2DBD0] flex items-center justify-center text-[#2D5A3D] shadow-2xs">
          <Lock className="w-8 h-8 text-[#2D5A3D]" />
        </div>

        <div className="max-w-md space-y-2">
          <h3 className="text-xl font-serif font-bold text-stone-900">
            Members-Only Group Chat
          </h3>
          <p className="text-sm text-[#8a8278] leading-relaxed">
            The group chat for <span className="font-semibold text-stone-800">{circleName}</span> is exclusive to confirmed circle members. Join the circle to participate in conversations and coordinate meetups.
          </p>
        </div>

        {onJoinClick && (
          <button
            type="button"
            disabled={isJoining}
            onClick={onJoinClick}
            className="px-6 py-3 rounded-2xl bg-[#2D5A3D] hover:bg-[#3d7a55] text-white text-xs font-bold transition-all shadow-xs flex items-center gap-2 cursor-pointer"
          >
            <Users className="w-4 h-4" />
            <span>{isJoining ? 'Joining...' : 'Join Circle to Access Chat'}</span>
          </button>
        )}
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // ACTIVE MEMBER CHAT INTERFACE
  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <div className="rounded-3xl border border-[#E2DBD0] bg-white shadow-xs overflow-hidden flex flex-col h-[620px] max-h-[75vh]">
      {/* Chat Header */}
      <div className="px-6 py-4 border-b border-[#E2DBD0] bg-[#FAF8F5] flex items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-[#eaf3ed] border border-[#7aaa8a]/30 flex items-center justify-center text-[#2D5A3D] shadow-2xs">
            <MessageSquare className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-stone-900 flex items-center gap-2">
              <span>{circleName} Chat</span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#eaf3ed] text-[#2D5A3D] text-[10px] font-bold border border-[#7aaa8a]/30">
                <span className="w-1.5 h-1.5 rounded-full bg-[#2D5A3D] animate-pulse" />
                Live
              </span>
            </h3>
            <p className="text-[11px] text-[#8a8278]">
              Connect, share ideas, and organize spontaneous activities with fellow members
            </p>
          </div>
        </div>

        <div className="hidden sm:flex items-center gap-2 text-xs text-[#8a8278]">
          <Users className="w-3.5 h-3.5 text-[#2D5A3D]" />
          <span>Members Only</span>
        </div>
      </div>

      {/* Message Stream */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 bg-gradient-to-b from-[#FAF8F5]/50 to-white">
        {loading && messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center gap-3 text-[#8a8278]">
            <Loader2 className="w-7 h-7 animate-spin text-[#2D5A3D]" />
            <p className="text-xs font-semibold">Loading conversation...</p>
          </div>
        ) : error ? (
          <div className="h-full flex flex-col items-center justify-center p-6 text-center space-y-2">
            <p className="text-xs font-bold text-rose-600">Failed to load messages</p>
            <p className="text-[11px] text-stone-500">{error.message}</p>
            <button
              type="button"
              onClick={() => refetch()}
              className="text-xs text-[#2D5A3D] font-bold underline cursor-pointer"
            >
              Try again
            </button>
          </div>
        ) : messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center p-8 text-center space-y-3 text-[#8a8278]">
            <div className="w-14 h-14 rounded-2xl bg-[#eaf3ed] flex items-center justify-center text-[#2D5A3D] mb-1 shadow-2xs">
              <Sparkles className="w-7 h-7 text-[#2D5A3D]" />
            </div>
            <h4 className="text-sm font-bold text-stone-800">
              Welcome to the {circleName} Group Chat!
            </h4>
            <p className="text-xs max-w-sm leading-relaxed">
              Be the first to say hello, introduce yourself, or suggest an idea for an upcoming circle meetup.
            </p>
          </div>
        ) : (
          messages.map((msg: any) => {
            const sender = msg.sender;
            const isSelf = currentUser && String(currentUser.id) === String(sender?.id);
            const isSenderCreator = creatorId && String(creatorId) === String(sender?.id);

            return (
              <div
                key={msg.id}
                className={`flex items-start gap-2.5 sm:gap-3 group ${
                  isSelf ? 'flex-row-reverse' : 'flex-row'
                }`}
              >
                {/* Sender Avatar with Link */}
                <Link
                  to={`/profile/${sender?.username || sender?.id}`}
                  className="shrink-0 transition-transform group-hover:scale-105"
                  title={`View @${sender?.username || 'user'}'s profile`}
                >
                  <Avatar
                    name={sender?.username || 'User'}
                    photoUrl={sender?.photoUrl}
                    color={getEarthyAvatarColor(sender?.username)}
                    size="sm"
                    className="w-8 h-8 sm:w-9 sm:h-9 rounded-full border border-[#E2DBD0] shadow-2xs cursor-pointer"
                  />
                </Link>

                {/* Message Bubble Container */}
                <div
                  className={`flex flex-col max-w-[80%] sm:max-w-[72%] ${
                    isSelf ? 'items-end' : 'items-start'
                  }`}
                >
                  {/* Sender Header info (Name, Badges, Timestamp) */}
                  <div
                    className={`flex items-center gap-1.5 mb-1 px-1 text-[11px] ${
                      isSelf ? 'flex-row-reverse' : 'flex-row'
                    }`}
                  >
                    <Link
                      to={`/profile/${sender?.username || sender?.id}`}
                      className="font-bold text-stone-800 hover:text-[#2D5A3D] transition-colors"
                    >
                      {isSelf ? 'You' : `@${sender?.username || 'anonymous'}`}
                    </Link>

                    {isSenderCreator && (
                      <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded-md bg-amber-100 border border-amber-300 text-amber-900 font-bold text-[9px]">
                        <Crown className="w-2.5 h-2.5 text-amber-700" />
                        Host
                      </span>
                    )}

                    <span className="text-[10px] text-[#8a8278]">
                      {formatTimestamp(msg.createdAt)}
                    </span>
                  </div>

                  {/* Message Bubble */}
                  <div
                    className={`px-4 py-2.5 rounded-2xl text-xs sm:text-sm leading-relaxed break-words shadow-2xs ${
                      isSelf
                        ? 'bg-[#2D5A3D] text-white rounded-tr-xs'
                        : 'bg-white border border-[#E2DBD0] text-stone-800 rounded-tl-xs'
                    }`}
                  >
                    {msg.content}
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input Bar */}
      <form
        onSubmit={handleSendMessage}
        className="p-3.5 sm:p-4 border-t border-[#E2DBD0] bg-white flex flex-col gap-2 shrink-0"
      >
        {sendError && (
          <div className="px-3 py-1.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center justify-between">
            <span>{sendError}</span>
            <button
              type="button"
              onClick={() => setSendError(null)}
              className="text-xs font-bold text-rose-500 cursor-pointer"
            >
              ✕
            </button>
          </div>
        )}

        <div className="flex items-center gap-2">
          <input
            ref={inputRef}
            type="text"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder={`Message #${circleName}...`}
            disabled={isSending}
            maxLength={1000}
            className="flex-1 px-4 py-2.5 rounded-2xl bg-[#FAF8F5] border border-[#E2DBD0] text-xs sm:text-sm text-stone-900 focus:outline-none focus:border-[#2D5A3D] focus:bg-white shadow-2xs transition-all"
          />

          <button
            type="submit"
            disabled={!content.trim() || isSending}
            className="px-4 sm:px-5 py-2.5 rounded-2xl bg-[#2D5A3D] hover:bg-[#3d7a55] disabled:bg-stone-200 disabled:text-stone-400 text-white text-xs sm:text-sm font-bold shadow-xs transition-all cursor-pointer flex items-center gap-1.5 shrink-0"
          >
            {isSending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <span className="hidden sm:inline">Send</span>
                <Send className="w-3.5 h-3.5" />
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};
