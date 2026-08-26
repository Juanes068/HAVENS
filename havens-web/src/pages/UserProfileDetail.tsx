import React, { useState } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@apollo/client';
import { useAuth } from '../context/AuthContext';
import { useApp } from '../context/AppContext';
import { Avatar } from '../components/Avatar';
import {
  GET_USER_BY_ID,
  GET_USER_BY_USERNAME,
  GET_COMMUNITY_BY_ID,
  GET_COMMUNITY_MEMBERS,
  REMOVE_COMMUNITY_MEMBER,
  SEND_CONNECT_REQUEST,
  MY_PROFILE,
} from '../graphql/operations';
import {
  ArrowLeft,
  MapPin,
  Calendar,
  Sparkles,
  UserX,
  MessageCircle,
  UserPlus,
  ShieldCheck,
  Crown,
  HeartHandshake,
  Check,
  AlertCircle,
  Trash2,
  Users,
} from 'lucide-react';

export const UserProfileDetailView: React.FC = () => {
  const { username, userId } = useParams<{ username?: string; userId?: string }>();
  const [searchParams] = useSearchParams();
  const circleId = searchParams.get('circleId');
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();
  const { t } = useApp();

  const [isRemoving, setIsRemoving] = useState(false);
  const [showRemoveModal, setShowRemoveModal] = useState(false);
  const [actionSuccessMsg, setActionSuccessMsg] = useState<string | null>(null);
  const [actionErrorMsg, setActionErrorMsg] = useState<string | null>(null);
  const [hasRemovedMember, setHasRemovedMember] = useState(false);

  const rawParam = username || userId || '';
  const userIdentifier = rawParam.startsWith('@') ? rawParam.substring(1) : rawParam;
  const isNumericOnly = /^\d+$/.test(userIdentifier);
  const targetCircleId = circleId ? parseInt(circleId, 10) : 0;

  // 1. Fetch Target User Data by Username or Handle
  const {
    data: userByUsernameData,
    loading: userByUsernameLoading,
    error: userByUsernameError,
  } = useQuery(GET_USER_BY_USERNAME, {
    variables: { username: userIdentifier },
    skip: !userIdentifier,
    fetchPolicy: 'cache-and-network',
  });

  // Fallback query by numeric ID if needed
  const {
    data: userByIdData,
    loading: userByIdLoading,
  } = useQuery(GET_USER_BY_ID, {
    variables: { id: isNumericOnly ? parseInt(userIdentifier, 10) : 0 },
    skip: !isNumericOnly || Boolean(userByUsernameData?.userByUsername),
    fetchPolicy: 'cache-and-network',
  });

  // 2. Fetch Current User Profile for Shared Hobbies Comparison
  const { data: myProfileData } = useQuery(MY_PROFILE, {
    skip: !currentUser,
    fetchPolicy: 'cache-first',
  });

  // 3. Fetch Circle Data if circleId is present in URL
  const {
    data: circleData,
    loading: circleLoading,
    refetch: refetchCircle,
  } = useQuery(GET_COMMUNITY_BY_ID, {
    variables: { id: targetCircleId },
    skip: !targetCircleId,
    fetchPolicy: 'cache-and-network',
  });

  const targetUser = userByUsernameData?.userByUsername || userByIdData?.userById;
  const userLoading = userByUsernameLoading || (isNumericOnly && userByIdLoading && !targetUser);
  const userError = !targetUser && !userLoading;

  // 4. Remove Member from Circle Mutation
  const [removeMemberMutation] = useMutation(REMOVE_COMMUNITY_MEMBER, {
    refetchQueries: [
      { query: GET_COMMUNITY_MEMBERS, variables: { communityId: targetCircleId } },
      { query: GET_COMMUNITY_BY_ID, variables: { id: targetCircleId } },
    ],
    onCompleted: (res) => {
      setIsRemoving(false);
      setShowRemoveModal(false);
      if (res?.removeCommunityMember?.success) {
        setHasRemovedMember(true);
        setActionSuccessMsg(
          res.removeCommunityMember.message ||
            `Successfully removed @${targetUser?.username} from ${circle?.name}.`
        );
        refetchCircle();
      } else {
        setActionErrorMsg(res?.removeCommunityMember?.message || 'Failed to remove member.');
      }
    },
    onError: (err) => {
      setIsRemoving(false);
      setShowRemoveModal(false);
      setActionErrorMsg(err.message || 'An error occurred while removing the user.');
    },
  });

  // 5. Connect Request Mutation
  const [connectMutation, { loading: isConnecting }] = useMutation(SEND_CONNECT_REQUEST, {
    onCompleted: (res) => {
      if (res?.sendConnectRequest?.match) {
        setActionSuccessMsg(`Connection request sent to @${targetUser?.username}!`);
      }
    },
    onError: (err) => {
      setActionErrorMsg(err.message || 'Could not send connection request.');
    },
  });

  const circle = circleData?.communityById;

  const isSelf = currentUser && targetUser && String(currentUser.id) === String(targetUser.id);
  const isCircleCreator =
    circle && currentUser && String(circle.creator?.id) === String(currentUser.id);
  const isTargetCircleCreator =
    circle && targetUser && String(circle.creator?.id) === String(targetUser.id);

  // Compute shared hobbies between current user and target user
  const myHobbyIds = new Set(
    (myProfileData?.myProfile?.hobbies || []).map((h: any) => String(h.id))
  );
  const sharedHobbiesList = (targetUser?.hobbies || []).filter((h: any) =>
    myHobbyIds.has(String(h.id))
  );

  const handleConfirmRemove = () => {
    if (!targetCircleId || !targetUser?.id) return;
    setIsRemoving(true);
    setActionErrorMsg(null);
    removeMemberMutation({
      variables: {
        communityId: targetCircleId,
        userId: Number(targetUser.id),
      },
    });
  };

  const handleBack = () => {
    if (circleId) {
      navigate(`/circle/${circleId}`);
    } else {
      navigate(-1);
    }
  };

  if (userLoading) {
    return (
      <div className="max-w-[1000px] mx-auto px-4 sm:px-6 py-12">
        <div className="flex items-center gap-3 text-stone-500 animate-pulse text-sm">
          <div className="w-6 h-6 rounded-full bg-[#E2DBD0]" />
          <span>Loading user profile details...</span>
        </div>
      </div>
    );
  }

  if (userError || !targetUser) {
    return (
      <div className="max-w-[1000px] mx-auto px-4 sm:px-6 py-12 text-center space-y-4">
        <div className="w-16 h-16 rounded-2xl bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center mx-auto">
          <AlertCircle className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-serif font-bold text-stone-900">User Profile Not Found</h2>
        <p className="text-xs text-[#8a8278] max-w-md mx-auto">
          The requested member profile could not be loaded or may no longer exist.
        </p>
        <button
          type="button"
          onClick={handleBack}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#2D5A3D] text-white text-xs font-bold shadow-xs hover:bg-[#3d7a55] transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Return to Previous Page</span>
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-[1100px] mx-auto px-4 sm:px-6 py-8 antialiased text-[#2C2C2C] space-y-6">
      {/* Top Breadcrumb & Navigation Bar */}
      <div className="flex items-center justify-between gap-4 pb-4 border-b border-[#E2DBD0]/70">
        <button
          type="button"
          onClick={handleBack}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border border-[#E2DBD0] bg-white text-stone-700 hover:text-[#2D5A3D] hover:border-[#2D5A3D]/40 text-xs font-bold transition-colors cursor-pointer shadow-2xs group"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
          <span>{circle ? `Back to ${circle.name}` : 'Back'}</span>
        </button>

        {circle && (
          <div className="flex items-center gap-2 text-xs text-stone-500 font-medium">
            <span className="hidden sm:inline">Viewing member of</span>
            <span className="px-2.5 py-1 rounded-xl bg-[#eaf3ed] text-[#2D5A3D] font-bold border border-[#2D5A3D]/20 flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5" />
              <span>{circle.name}</span>
            </span>
          </div>
        )}
      </div>

      {/* Notifications */}
      {actionSuccessMsg && (
        <div className="p-4 rounded-2xl bg-[#eaf3ed] border border-[#2D5A3D]/30 text-[#2D5A3D] text-xs font-semibold flex items-center gap-2 shadow-2xs animate-in fade-in">
          <Check className="w-4 h-4 text-[#2D5A3D] shrink-0" />
          <span>{actionSuccessMsg}</span>
        </div>
      )}

      {actionErrorMsg && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center gap-2 shadow-2xs animate-in fade-in">
          <AlertCircle className="w-4 h-4 text-rose-700 shrink-0" />
          <span>{actionErrorMsg}</span>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* SECTION 1: HERO PROFILE CARD */}
      {/* ───────────────────────────────────────────────────────────── */}
      <div className="p-6 sm:p-8 rounded-3xl bg-white border border-[#E2DBD0] shadow-xs relative overflow-hidden">
        {/* Subtle Decorative Ambient Background */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-br from-[#2D5A3D]/5 via-[#F4EEE2]/40 to-[#C47B5A]/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />

        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative z-10">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
            {/* User Photo / Avatar */}
            <div className="relative shrink-0">
              <Avatar
                name={targetUser.username}
                photoUrl={targetUser.photoUrl}
                size="xl"
                className="w-24 h-24 sm:w-28 sm:h-28 rounded-3xl border-4 border-white shadow-md object-cover"
              />
              {isTargetCircleCreator && (
                <div
                  className="absolute -bottom-1.5 -right-1.5 p-1.5 rounded-full bg-amber-400 text-amber-900 border-2 border-white shadow-xs"
                  title="Circle Host"
                >
                  <Crown className="w-4 h-4" />
                </div>
              )}
            </div>

            {/* Profile Identity Details */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-2xl sm:text-3xl font-serif font-bold text-stone-900">
                  @{targetUser.username}
                </h1>

                {isSelf && (
                  <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-[#eaf3ed] text-[#2D5A3D] border border-[#2D5A3D]/20">
                    You
                  </span>
                )}

                {isTargetCircleCreator && (
                  <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300 flex items-center gap-1">
                    <Crown className="w-3 h-3 text-amber-800" />
                    <span>Circle Creator</span>
                  </span>
                )}
              </div>

              {/* Badges: Points, Age, Location */}
              <div className="flex items-center gap-2.5 flex-wrap">
                {/* Gamification Points Badge - Enhanced Size & Visibility */}
                <span className="text-xs font-bold text-amber-900 bg-amber-50/90 border border-amber-300 px-3 py-1 rounded-full shadow-2xs inline-flex items-center gap-1.5">
                  ⭐ +{targetUser.totalPoints || 0} pts
                </span>

                {targetUser.age ? (
                  <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-[#FAF8F5] border border-[#E2DBD0] text-stone-700">
                    🎂 {targetUser.age} years old
                  </span>
                ) : null}

                {(targetUser.neighbourhood || targetUser.cityName) && (
                  <span className="text-xs font-medium text-stone-600 px-2.5 py-1 rounded-full bg-[#FAF8F5] border border-[#E2DBD0] flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-[#C47B5A]" />
                    <span>{targetUser.neighbourhood || targetUser.cityName}</span>
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Action Buttons Toolbar */}
          <div className="flex items-center gap-2.5 self-stretch md:self-auto flex-wrap">
            {!isSelf ? (
              <>
                <button
                  type="button"
                  onClick={() => navigate(`/chat?user=${targetUser.id}`)}
                  className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-[#2D5A3D] hover:bg-[#3d7a55] text-white text-xs font-bold transition-all shadow-xs cursor-pointer"
                >
                  <MessageCircle className="w-4 h-4" />
                  <span>Message</span>
                </button>

                <button
                  type="button"
                  disabled={isConnecting}
                  onClick={() =>
                    connectMutation({
                      variables: { toUserId: targetUserId, user2Id: targetUserId },
                    })
                  }
                  className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-[#E2DBD0] bg-white hover:bg-[#FAF8F5] text-stone-800 text-xs font-bold transition-colors shadow-2xs cursor-pointer disabled:opacity-50"
                >
                  <UserPlus className="w-4 h-4 text-[#2D5A3D]" />
                  <span>Connect</span>
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => navigate('/profile')}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#2D5A3D] text-white text-xs font-bold hover:bg-[#3d7a55] transition-colors shadow-xs cursor-pointer"
              >
                <span>Edit Profile Settings</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* SECTION 2: CIRCLE MANAGEMENT CARD (REMOVE FROM CIRCLE) */}
      {/* ───────────────────────────────────────────────────────────── */}
      {circle && (
        <div
          className={`p-6 rounded-3xl border transition-all ${
            hasRemovedMember
              ? 'bg-stone-50 border-[#E2DBD0]'
              : 'bg-[#FDFBF7] border-[#E2DBD0] shadow-xs'
          }`}
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-[#8a8278]">
                  Circle Membership
                </span>
                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-[#FAF8F5] border border-[#E2DBD0] text-stone-700">
                  {circle.name}
                </span>
              </div>
              <p className="text-xs text-stone-600">
                {hasRemovedMember
                  ? `@${targetUser.username} is no longer a member of ${circle.name}.`
                  : isTargetCircleCreator
                  ? `@${targetUser.username} is the creator and organizer of this Circle.`
                  : `@${targetUser.username} is currently an active member of this Circle.`}
              </p>
            </div>

            {/* Remove from Circle Button (Only accessible by Circle Creator) */}
            {isCircleCreator && !isTargetCircleCreator && !hasRemovedMember && (
              <button
                type="button"
                onClick={() => setShowRemoveModal(true)}
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold transition-colors cursor-pointer shadow-2xs shrink-0"
              >
                <UserX className="w-4 h-4 text-rose-600" />
                <span>Remove from Circle</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* SECTION 3: BIO / ABOUT THE MEMBER */}
      {/* ───────────────────────────────────────────────────────────── */}
      <div className="p-6 sm:p-8 rounded-3xl bg-white border border-[#E2DBD0] shadow-xs space-y-4">
        <h3 className="text-lg font-serif font-bold text-stone-900 flex items-center gap-2">
          <span>About @{targetUser.username}</span>
        </h3>

        {targetUser.bio ? (
          <p className="text-sm text-stone-700 leading-relaxed italic bg-[#FDFBF7] p-5 rounded-2xl border border-[#E2DBD0]/70 whitespace-pre-wrap">
            "{targetUser.bio}"
          </p>
        ) : (
          <p className="text-xs text-[#8a8278] italic">
            This member has not written a personal bio yet.
          </p>
        )}
      </div>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* SECTION 4: PASSIONS & HOBBIES TAXONOMY */}
      {/* ───────────────────────────────────────────────────────────── */}
      <div className="p-6 sm:p-8 rounded-3xl bg-white border border-[#E2DBD0] shadow-xs space-y-5">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h3 className="text-lg font-serif font-bold text-stone-900">
              Passions & Hobbies
            </h3>
            <p className="text-xs text-[#8a8278] mt-0.5">
              Activities and interests @{targetUser.username} loves exploring
            </p>
          </div>

          {targetUser.hobbies && targetUser.hobbies.length > 0 && (
            <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-[#FAF8F5] border border-[#E2DBD0] text-stone-700">
              {targetUser.hobbies.length} Selected
            </span>
          )}
        </div>

        {/* Shared Hobbies Highlight Banner */}
        {!isSelf && sharedHobbiesList.length > 0 && (
          <div className="p-4 rounded-2xl bg-[#eaf3ed] border border-[#2D5A3D]/25 flex items-center gap-3">
            <div className="p-2 rounded-xl bg-white text-[#2D5A3D] shadow-2xs shrink-0">
              <Sparkles className="w-4 h-4 text-[#2D5A3D]" />
            </div>
            <div>
              <p className="text-xs font-bold text-[#2D5A3D]">
                Shared Mutual Passions ({sharedHobbiesList.length})
              </p>
              <p className="text-[11px] text-stone-600 mt-0.5">
                You both share: {sharedHobbiesList.map((h: any) => `#${h.name}`).join(', ')}
              </p>
            </div>
          </div>
        )}

        {/* Hobby Chips */}
        {targetUser.hobbies && targetUser.hobbies.length > 0 ? (
          <div className="flex flex-wrap gap-2 pt-1">
            {targetUser.hobbies.map((hobby: any) => {
              const isShared = myHobbyIds.has(String(hobby.id));
              return (
                <span
                  key={hobby.id}
                  className={`text-xs font-medium px-3.5 py-1.5 rounded-2xl border transition-colors flex items-center gap-1.5 shadow-2xs ${
                    isShared
                      ? 'bg-[#eaf3ed] border-[#2D5A3D]/40 text-[#2D5A3D] font-bold'
                      : 'bg-[#FAF8F5] border-[#E2DBD0] text-stone-700'
                  }`}
                >
                  {isShared && <span className="text-[10px]">✨</span>}
                  <span>#{hobby.name}</span>
                  {hobby.category?.name && (
                    <span className="text-[10px] text-stone-400 font-normal ml-0.5">
                      · {hobby.category.name}
                    </span>
                  )}
                </span>
              );
            })}
          </div>
        ) : (
          <p className="text-xs text-[#8a8278] italic">No hobbies or passions selected yet.</p>
        )}
      </div>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* MODAL: REMOVE MEMBER CONFIRMATION DIALOG */}
      {/* ───────────────────────────────────────────────────────────── */}
      {showRemoveModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white border border-[#E2DBD0] rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="p-3 bg-rose-50 rounded-2xl border border-rose-100 flex items-center justify-center">
                <Trash2 className="w-5 h-5 text-rose-600" />
              </div>
              <div>
                <h3 className="text-lg font-serif font-bold text-stone-900">
                  Remove from Circle?
                </h3>
                <p className="text-xs text-[#8a8278]">This action will revoke their membership</p>
              </div>
            </div>

            <p className="text-xs text-stone-700 leading-relaxed bg-[#FAF8F5] p-3.5 rounded-2xl border border-[#E2DBD0]">
              Are you sure you want to remove <span className="font-bold text-stone-900">@{targetUser.username}</span> from <span className="font-bold text-[#2D5A3D]">{circle?.name}</span>? They will no longer have access to circle-exclusive plans or group activities.
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                disabled={isRemoving}
                onClick={() => setShowRemoveModal(false)}
                className="px-4 py-2 rounded-xl border border-[#E2DBD0] text-xs font-semibold text-stone-700 hover:bg-[#FAF8F5] transition-colors cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="button"
                disabled={isRemoving}
                onClick={handleConfirmRemove}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-colors shadow-xs cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
              >
                {isRemoving ? (
                  <span>Removing...</span>
                ) : (
                  <>
                    <UserX className="w-3.5 h-3.5" />
                    <span>Confirm Removal</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserProfileDetailView;
