import React from 'react';
import { useNavigate } from 'react-router-dom';

interface ConnectionsTabProps {
  requestsLoading: boolean;
  pendingRequests: any[];
  friendsLoading: boolean;
  acceptedFriends: any[];
  activeMatches: any[];
  currentUser: any;
  onRespondRequest: (requestId: string | number, action: 'accepted' | 'rejected') => void;
}

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

const CardSkeleton: React.FC = () => (
  <div className="bg-white border border-[#E2DBD0] rounded-2xl p-4 flex items-center justify-between animate-pulse">
    <div className="flex items-center gap-3">
      <div className="w-10 h-10 rounded-full bg-[#E2DBD0]" />
      <div className="space-y-2">
        <div className="h-3.5 bg-[#E2DBD0] rounded w-24" />
        <div className="h-2.5 bg-[#E2DBD0]/60 rounded w-20" />
      </div>
    </div>
    <div className="h-7 w-16 bg-[#E2DBD0]/50 rounded-xl" />
  </div>
);

export const ConnectionsTab: React.FC<ConnectionsTabProps> = ({
  requestsLoading,
  pendingRequests,
  friendsLoading,
  acceptedFriends,
  activeMatches,
  currentUser,
  onRespondRequest,
}) => {
  const navigate = useNavigate();

  return (
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
                    onClick={() => onRespondRequest(req.id, 'accepted')}
                    className="px-4 py-2 rounded-xl bg-[#2D5A3D] hover:bg-[#3d7a55] text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
                  >
                    ✓ Accept
                  </button>
                  <button
                    type="button"
                    onClick={() => onRespondRequest(req.id, 'rejected')}
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
  );
};
