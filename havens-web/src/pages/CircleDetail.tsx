import React, { useState, useMemo } from 'react';
import { useParams, useNavigate, Link, useSearchParams } from 'react-router-dom';
import { useQuery, useMutation } from '@apollo/client';
import { useAuth } from '../context/AuthContext';
import { useApp } from '../context/AppContext';
import { Avatar } from '../components/Avatar';
import { CircleGroupChat } from '../components/CircleGroupChat';
import {
  GET_COMMUNITY_BY_ID,
  JOIN_COMMUNITY,
  LEAVE_COMMUNITY,
  MY_COMMUNITIES,
  GET_ALL_COMMUNITIES,
  REMOVE_COMMUNITY_MEMBER,
} from '../graphql/operations';
import { CircleManagementModal } from './Social/components/CircleManagementModal';
import {
  Users,
  Crown,
  Calendar,
  MapPin,
  Sparkles,
  ArrowLeft,
  Share2,
  Settings,
  PlusCircle,
  Check,
  Search,
  UserMinus,
  Globe,
  Tag,
  Clock,
  Compass,
  MessageSquare,
} from 'lucide-react';

export const CircleDetailPageView: React.FC = () => {
  const { circleId } = useParams<{ circleId: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user: currentUser } = useAuth();
  const { t } = useApp();

  const tabParam = searchParams.get('tab');
  const [activeTab, setActiveTabState] = useState<'overview' | 'chat' | 'gatherings' | 'members'>(
    tabParam === 'chat' || tabParam === 'gatherings' || tabParam === 'members' ? tabParam : 'overview'
  );

  const handleTabChange = (tab: 'overview' | 'chat' | 'gatherings' | 'members') => {
    setActiveTabState(tab);
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        if (tab === 'overview') {
          next.delete('tab');
        } else {
          next.set('tab', tab);
        }
        return next;
      },
      { replace: true }
    );
  };

  const [managingCircle, setManagingCircle] = useState<any | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [memberSearchQuery, setMemberSearchQuery] = useState('');
  const [removingMemberId, setRemovingMemberId] = useState<number | null>(null);
  const [confirmRemoveId, setConfirmRemoveId] = useState<number | null>(null);
  const [actionStatusMsg, setActionStatusMsg] = useState<string | null>(null);

  const parsedCircleId = circleId ? parseInt(circleId, 10) : 0;

  // 1. Fetch Circle Details
  const {
    data: circleData,
    loading: circleLoading,
    error: circleError,
    refetch: refetchCircle,
  } = useQuery(GET_COMMUNITY_BY_ID, {
    variables: { id: parsedCircleId },
    skip: !parsedCircleId,
    fetchPolicy: 'cache-and-network',
  });

  // 2. Fetch User Joined Communities
  const { data: myCommunitiesData, refetch: refetchMyCommunities } = useQuery(MY_COMMUNITIES, {
    skip: !currentUser,
    fetchPolicy: 'cache-and-network',
  });

  // 3. Join / Leave Mutations
  const [joinCommunityMutation, { loading: isJoining }] = useMutation(JOIN_COMMUNITY, {
    refetchQueries: [
      { query: GET_COMMUNITY_BY_ID, variables: { id: parsedCircleId } },
      { query: MY_COMMUNITIES },
      { query: GET_ALL_COMMUNITIES },
    ],
    onCompleted: (res) => {
      if (res?.joinCommunity?.success) {
        setActionStatusMsg('You have successfully joined this Circle! 🌿');
        setTimeout(() => setActionStatusMsg(null), 4000);
      }
    },
  });

  const [leaveCommunityMutation, { loading: isLeaving }] = useMutation(LEAVE_COMMUNITY, {
    refetchQueries: [
      { query: GET_COMMUNITY_BY_ID, variables: { id: parsedCircleId } },
      { query: MY_COMMUNITIES },
      { query: GET_ALL_COMMUNITIES },
    ],
    onCompleted: (res) => {
      if (res?.leaveCommunity?.success) {
        setActionStatusMsg('You have left this Circle.');
        setTimeout(() => setActionStatusMsg(null), 4000);
      }
    },
  });

  // 4. Remove Member Mutation (For Creator)
  const [removeMemberMutation] = useMutation(REMOVE_COMMUNITY_MEMBER, {
    refetchQueries: [
      { query: GET_COMMUNITY_BY_ID, variables: { id: parsedCircleId } },
      { query: MY_COMMUNITIES },
    ],
    onCompleted: (res) => {
      setRemovingMemberId(null);
      setConfirmRemoveId(null);
      if (res?.removeCommunityMember?.success) {
        setActionStatusMsg('Member removed from Circle successfully.');
        setTimeout(() => setActionStatusMsg(null), 4000);
        refetchCircle();
      }
    },
  });

  const circle = circleData?.communityById;

  // Membership status
  const isJoined = useMemo(() => {
    if (!currentUser || !circle) return false;
    const joinedList = (myCommunitiesData?.myCommunities || []).map((m: any) => String(m.community?.id));
    if (joinedList.includes(String(circle.id))) return true;
    return (circle.memberships || []).some(
      (m: any) => String(m.user?.id) === String(currentUser.id)
    );
  }, [currentUser, circle, myCommunitiesData]);

  const isCreator = Boolean(
    currentUser && circle?.creator && String(circle.creator.id) === String(currentUser.id)
  );

  const handleJoinToggle = async () => {
    if (!currentUser) {
      navigate('/auth');
      return;
    }
    try {
      if (isJoined) {
        await leaveCommunityMutation({
          variables: {
            communityId: parsedCircleId,
            userId: Number(currentUser.id),
          },
        });
      } else {
        await joinCommunityMutation({ variables: { communityId: parsedCircleId } });
      }
    } catch (err) {
      console.error('[CircleDetail Join Error]', err);
    }
  };

  const handleShare = async () => {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({
          title: circle?.name || 'Havens Circle',
          text: circle?.description || `Join ${circle?.name} on Havens!`,
          url,
        });
      } catch (err) {
        console.warn('Share dismissed:', err);
      }
    } else {
      await navigator.clipboard.writeText(url);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 3000);
    }
  };

  const handleRemoveMember = async (userId: number) => {
    setRemovingMemberId(userId);
    try {
      await removeMemberMutation({
        variables: {
          communityId: parsedCircleId,
          userId,
        },
      });
    } catch (err) {
      console.error(err);
      setRemovingMemberId(null);
    }
  };

  // Filtered members by search query
  const memberships = circle?.memberships || [];
  const filteredMembers = useMemo(() => {
    if (!memberSearchQuery.trim()) return memberships;
    const q = memberSearchQuery.trim().toLowerCase();
    return memberships.filter((m: any) => {
      const u = m.user;
      return (
        u?.username?.toLowerCase().includes(q) ||
        u?.bio?.toLowerCase().includes(q) ||
        (u?.neighbourhood || u?.cityName || '').toLowerCase().includes(q)
      );
    });
  }, [memberships, memberSearchQuery]);

  // Loading Skeleton State
  if (circleLoading && !circle) {
    return (
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-6 animate-pulse">
        <div className="h-6 w-32 bg-[#E2DBD0] rounded-xl" />
        <div className="h-72 bg-[#E2DBD0]/60 rounded-3xl" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 h-44 bg-[#E2DBD0]/50 rounded-3xl" />
          <div className="h-44 bg-[#E2DBD0]/50 rounded-3xl" />
        </div>
      </div>
    );
  }

  // Not Found State
  if (circleError || !circle) {
    return (
      <div className="max-w-xl mx-auto px-4 py-16 text-center space-y-4">
        <div className="w-16 h-16 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
          <Users className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-serif font-bold text-stone-900">Circle Not Found</h2>
        <p className="text-sm text-stone-600">
          This community circle might have been archived, removed, or you might not have access to view it.
        </p>
        <button
          type="button"
          onClick={() => navigate('/social')}
          className="px-5 py-2.5 rounded-2xl bg-[#2D5A3D] text-white text-xs font-bold hover:bg-[#3d7a55] transition-colors cursor-pointer shadow-sm"
        >
          Explore All Circles
        </button>
      </div>
    );
  }

  const createdDateFormatted = circle.createdAt
    ? new Date(circle.createdAt).toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      })
    : null;

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-8 antialiased pb-24">
      {/* ───────────────────────────────────────────────────────────── */}
      {/* TOP NAVIGATION & ACTIONS BAR */}
      {/* ───────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => navigate('/social')}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-white border border-[#E2DBD0] hover:border-[#2D5A3D]/40 text-stone-700 text-xs font-semibold shadow-2xs hover:shadow-xs transition-all cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4 text-[#2D5A3D]" />
          <span>Back to Circles</span>
        </button>

        <div className="flex items-center gap-2">
          {/* Share Button */}
          <button
            type="button"
            onClick={handleShare}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-2xl bg-white border border-[#E2DBD0] hover:border-[#2D5A3D]/40 text-stone-700 text-xs font-semibold shadow-2xs hover:shadow-xs transition-all cursor-pointer"
          >
            <Share2 className="w-3.5 h-3.5 text-[#2D5A3D]" />
            <span>{copiedLink ? 'Link Copied! ✓' : 'Share'}</span>
          </button>

          {/* Host / Creator Management Button */}
          {isCreator && (
            <button
              type="button"
              onClick={() => setManagingCircle(circle)}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-2xl bg-[#2D5A3D] hover:bg-[#3d7a55] text-white text-xs font-bold shadow-xs transition-all cursor-pointer"
            >
              <Settings className="w-3.5 h-3.5" />
              <span>Manage Circle</span>
            </button>
          )}
        </div>
      </div>

      {/* Action Notification Alert */}
      {actionStatusMsg && (
        <div className="p-3.5 rounded-2xl bg-[#eaf3ed] border border-[#2D5A3D]/40 text-[#2D5A3D] text-xs font-semibold flex items-center justify-between shadow-2xs animate-in fade-in">
          <span>{actionStatusMsg}</span>
          <button type="button" onClick={() => setActionStatusMsg(null)} className="font-bold text-xs cursor-pointer">
            ✕
          </button>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* HERO SECTION: COVER PHOTO & HEADER */}
      {/* ───────────────────────────────────────────────────────────── */}
      <div className="rounded-3xl border border-[#E2DBD0] bg-white overflow-hidden shadow-sm">
        {/* Banner Image / Fallback Header */}
        <div className="relative w-full h-56 sm:h-72 bg-gradient-to-br from-[#eaf3ed] via-[#FAF8F5] to-[#F0EAE0] overflow-hidden flex items-center justify-center">
          {circle.imageUrl ? (
            <img
              src={circle.imageUrl}
              alt={circle.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="flex flex-col items-center justify-center text-[#2D5A3D]/50 gap-2">
              <Users className="w-16 h-16 opacity-60" />
              <span className="text-sm font-serif font-semibold text-stone-600">Havens Micro-Community Circle</span>
            </div>
          )}

          {/* Top Floating Badges */}
          <div className="absolute top-4 left-4 right-4 flex items-center justify-between gap-2 pointer-events-none">
            <span className="text-xs font-semibold px-3 py-1 rounded-full bg-white/95 backdrop-blur-xs text-[#2D5A3D] shadow-2xs flex items-center gap-1.5">
              {circle.isVirtual ? (
                <>
                  <Globe className="w-3.5 h-3.5 text-[#2D5A3D]" />
                  <span>Virtual Group</span>
                </>
              ) : (
                <>
                  <MapPin className="w-3.5 h-3.5 text-[#C47B5A]" />
                  <span>{circle.locationName || 'Local Chapter'}</span>
                </>
              )}
            </span>

            {isCreator && (
              <span className="text-xs font-bold px-3 py-1 rounded-full bg-amber-100/95 backdrop-blur-xs border border-amber-300 text-amber-900 shadow-2xs flex items-center gap-1">
                <Crown className="w-3.5 h-3.5 text-amber-700" />
                <span>You are the Host</span>
              </span>
            )}
          </div>
        </div>

        {/* Header Details Body */}
        <div className="p-6 sm:p-8 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 flex-wrap mb-1.5">
                {circle.subdomain && (
                  <span className="text-xs font-bold text-[#2D5A3D] bg-[#eaf3ed] px-2.5 py-0.5 rounded-full border border-[#2D5A3D]/20">
                    @{circle.subdomain}
                  </span>
                )}
                {circle.ageRange && (
                  <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-[#FAF8F5] border border-[#E2DBD0] text-stone-700">
                    🎂 {circle.ageRange}
                  </span>
                )}
                {createdDateFormatted && (
                  <span className="text-xs text-[#8a8278] flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>Established {createdDateFormatted}</span>
                  </span>
                )}
              </div>

              <h1 className="text-2xl sm:text-3xl font-serif font-bold text-stone-900">
                {circle.name}
              </h1>
            </div>

            {/* Main Interactive Action Buttons */}
            <div className="flex items-center gap-2.5 flex-wrap shrink-0">
              <button
                type="button"
                disabled={isJoining || isLeaving}
                onClick={handleJoinToggle}
                className={`px-5 py-2.5 rounded-2xl text-xs font-bold transition-all cursor-pointer shadow-xs flex items-center gap-2 ${
                  isJoined
                    ? 'bg-[#eaf3ed] text-[#2D5A3D] border border-[#2D5A3D]/30 hover:bg-rose-50 hover:text-rose-700 hover:border-rose-300'
                    : 'bg-[#2D5A3D] text-white hover:bg-[#3d7a55]'
                }`}
              >
                {isJoining || isLeaving ? (
                  <span>Updating...</span>
                ) : isJoined ? (
                  <>
                    <Check className="w-4 h-4" />
                    <span>Joined Member</span>
                  </>
                ) : (
                  <>
                    <PlusCircle className="w-4 h-4" />
                    <span>Join Circle</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => handleTabChange('chat')}
                className={`px-4 py-2.5 rounded-2xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-2xs ${
                  activeTab === 'chat'
                    ? 'bg-[#2D5A3D] text-white shadow-xs'
                    : 'bg-[#FAF8F5] hover:bg-[#F4EEE2] border border-[#E2DBD0] text-stone-800'
                }`}
              >
                <MessageSquare className={`w-3.5 h-3.5 ${activeTab === 'chat' ? 'text-white' : 'text-[#2D5A3D]'}`} />
                <span>Group Chat</span>
              </button>

              <button
                type="button"
                onClick={() => navigate(`/plans?create=true&circleId=${circle.id}`)}
                className="px-4 py-2.5 rounded-2xl bg-[#FAF8F5] hover:bg-[#F4EEE2] border border-[#E2DBD0] text-stone-800 text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-2xs"
              >
                <PlusCircle className="w-3.5 h-3.5 text-[#2D5A3D]" />
                <span>Host Plan</span>
              </button>
            </div>
          </div>

          {/* Description */}
          {circle.description && (
            <div className="p-4 sm:p-5 rounded-2xl bg-[#FAF8F5] border border-[#E2DBD0]/70 text-sm text-stone-700 leading-relaxed">
              {circle.description}
            </div>
          )}

          {/* Topics & Passions */}
          {circle.hobbies && circle.hobbies.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#8a8278]">
                Associated Passions & Topics
              </h3>
              <div className="flex flex-wrap gap-2">
                {circle.hobbies.map((h: any) => (
                  <span
                    key={h.id}
                    className="text-xs font-semibold px-3 py-1.5 rounded-xl bg-[#eaf3ed] text-[#2D5A3D] border border-[#7aaa8a]/30"
                  >
                    #{h.name}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* SECTION TABS NAVIGATION */}
      {/* ───────────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-2 p-1.5 bg-white border border-[#E2DBD0] rounded-2xl shadow-2xs overflow-x-auto">
        <button
          type="button"
          onClick={() => handleTabChange('overview')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 shrink-0 ${
            activeTab === 'overview'
              ? 'bg-[#2D5A3D] text-white shadow-2xs'
              : 'text-stone-600 hover:text-stone-900 hover:bg-[#FAF8F5]'
          }`}
        >
          <Compass className="w-3.5 h-3.5" />
          <span>Overview</span>
        </button>

        <button
          type="button"
          onClick={() => handleTabChange('chat')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 shrink-0 ${
            activeTab === 'chat'
              ? 'bg-[#2D5A3D] text-white shadow-2xs'
              : 'text-stone-600 hover:text-stone-900 hover:bg-[#FAF8F5]'
          }`}
        >
          <MessageSquare className="w-3.5 h-3.5" />
          <span>Group Chat</span>
          {isJoined && (
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
          )}
        </button>

        <button
          type="button"
          onClick={() => handleTabChange('gatherings')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 shrink-0 ${
            activeTab === 'gatherings'
              ? 'bg-[#2D5A3D] text-white shadow-2xs'
              : 'text-stone-600 hover:text-stone-900 hover:bg-[#FAF8F5]'
          }`}
        >
          <Calendar className="w-3.5 h-3.5" />
          <span>Gatherings ({circle.events?.length || 0})</span>
        </button>

        <button
          type="button"
          onClick={() => handleTabChange('members')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 shrink-0 ${
            activeTab === 'members'
              ? 'bg-[#2D5A3D] text-white shadow-2xs'
              : 'text-stone-600 hover:text-stone-900 hover:bg-[#FAF8F5]'
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          <span>Members ({memberships.length})</span>
        </button>
      </div>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* TAB CONTENT: GROUP CHAT */}
      {/* ───────────────────────────────────────────────────────────── */}
      {activeTab === 'chat' && (
        <CircleGroupChat
          circleId={circle.id}
          circleName={circle.name}
          isMember={isJoined}
          isCreator={isCreator}
          creatorId={circle.creator?.id}
          onJoinClick={handleJoinToggle}
          isJoining={isJoining}
        />
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* TAB CONTENT: ORGANIZER & HOST CARD (Overview only) */}
      {/* ───────────────────────────────────────────────────────────── */}
      {activeTab === 'overview' && circle.creator && (
        <div className="p-6 rounded-3xl bg-white border border-[#E2DBD0] shadow-xs space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-[#8a8278]">
            Circle Founder & Organizer
          </h3>

          <Link
            to={`/profile/${circle.creator.username || circle.creator.id}`}
            className="p-4 rounded-2xl border border-[#E2DBD0] bg-[#FAF8F5] hover:border-[#2D5A3D]/50 hover:bg-white transition-all flex items-center justify-between gap-4 group cursor-pointer shadow-2xs"
          >
            <div className="flex items-center gap-3.5 min-w-0">
              <Avatar
                name={circle.creator.username}
                photoUrl={circle.creator.photoUrl}
                size="lg"
                className="w-12 h-12 rounded-full border-2 border-white shadow-2xs shrink-0"
              />
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-bold text-stone-900 truncate group-hover:text-[#2D5A3D] transition-colors">
                    @{circle.creator.username}
                  </h4>
                  <span className="text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300 px-2 py-0.5 rounded-full flex items-center gap-1">
                    <Crown className="w-3 h-3 text-amber-700" />
                    <span>Host</span>
                  </span>
                  {circle.creator.age && (
                    <span className="text-[11px] font-semibold text-stone-600 bg-white border border-[#E2DBD0] px-2 py-0.5 rounded-full">
                      {circle.creator.age} yrs
                    </span>
                  )}
                </div>
                {(circle.creator.neighbourhood || circle.creator.cityName) && (
                  <p className="text-xs text-[#8a8278] truncate mt-0.5">
                    📍 {circle.creator.neighbourhood || circle.creator.cityName}
                  </p>
                )}
                {circle.creator.bio && (
                  <p className="text-xs text-stone-600 line-clamp-1 italic mt-1">
                    "{circle.creator.bio}"
                  </p>
                )}
              </div>
            </div>

            <span className="text-xs font-bold text-[#2D5A3D] group-hover:underline shrink-0">
              View Profile →
            </span>
          </Link>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* TAB CONTENT: CIRCLE GATHERINGS & PLANS */}
      {/* ───────────────────────────────────────────────────────────── */}
      {(activeTab === 'overview' || activeTab === 'gatherings') && (
        <div className="p-6 sm:p-8 rounded-3xl bg-white border border-[#E2DBD0] shadow-xs space-y-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-serif font-bold text-stone-900">
                Circle Gatherings & Plans
              </h3>
              <p className="text-xs text-[#8a8278] mt-0.5">
                Exclusive meetups and gatherings organized by members of {circle.name}
              </p>
            </div>

            <button
              type="button"
              onClick={() => navigate(`/plans?create=true&circleId=${circle.id}`)}
              className="px-4 py-2 rounded-2xl bg-[#2D5A3D] hover:bg-[#3d7a55] text-white text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 shadow-2xs"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>Create Plan</span>
            </button>
          </div>

          {circle.events && circle.events.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {circle.events.map((ev: any) => {
                const eventDate = ev.scheduledDate
                  ? new Date(ev.scheduledDate).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      hour: 'numeric',
                      minute: '2-digit',
                    })
                  : 'Date TBD';

                return (
                  <div
                    key={ev.id}
                    onClick={() => navigate(`/event/${ev.id}`)}
                    className="rounded-2xl border border-[#E2DBD0] bg-[#FAF8F5] hover:border-[#2D5A3D]/50 hover:bg-white p-4.5 flex flex-col justify-between gap-3 shadow-2xs hover:shadow-xs transition-all cursor-pointer group"
                  >
                    <div className="space-y-2.5">
                      {ev.imageUrl && (
                        <div className="w-full h-32 rounded-xl overflow-hidden bg-stone-100">
                          <img src={ev.imageUrl} alt={ev.title} className="w-full h-full object-cover group-hover:scale-103 transition-transform" />
                        </div>
                      )}
                      <div className="flex items-center gap-1.5 text-xs text-[#2D5A3D] font-bold">
                        <Clock className="w-3.5 h-3.5" />
                        <span>{eventDate}</span>
                      </div>

                      <h4 className="text-sm font-bold text-stone-900 truncate group-hover:text-[#2D5A3D] transition-colors">
                        {ev.title}
                      </h4>

                      {ev.locationName && (
                        <p className="text-xs text-[#8a8278] truncate flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-[#C47B5A] shrink-0" />
                          <span className="truncate">{ev.locationName}</span>
                        </p>
                      )}
                    </div>

                    <div className="pt-2.5 border-t border-[#E2DBD0]/60 flex items-center justify-between text-xs">
                      <span className="font-semibold text-stone-700">
                        👥 {ev.goingCount || 0} attending
                      </span>
                      <span className="font-bold text-[#2D5A3D] group-hover:underline">
                        Details →
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-10 px-4 rounded-2xl bg-[#FAF8F5] border border-[#E2DBD0]/60 space-y-2">
              <Calendar className="w-8 h-8 text-[#8a8278] mx-auto opacity-60" />
              <p className="text-xs font-semibold text-stone-800">No gatherings currently scheduled.</p>
              <p className="text-xs text-[#8a8278]">
                Be the first to schedule a coffee chat, workshop, or outdoor meetup for this circle!
              </p>
              <button
                type="button"
                onClick={() => navigate(`/plans?create=true&circleId=${circle.id}`)}
                className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#2D5A3D] text-white text-xs font-bold hover:bg-[#3d7a55] transition-colors cursor-pointer shadow-2xs"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                <span>Schedule Gathering</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* TAB CONTENT: MEMBERS DIRECTORY */}
      {/* ───────────────────────────────────────────────────────────── */}
      {(activeTab === 'overview' || activeTab === 'members') && (
        <div className="p-6 sm:p-8 rounded-3xl bg-white border border-[#E2DBD0] shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-serif font-bold text-stone-900">
                Members Directory ({memberships.length})
              </h3>
              <p className="text-xs text-[#8a8278] mt-0.5">
                People who have joined {circle.name}
              </p>
            </div>

            {/* Member Search Bar */}
            {memberships.length > 2 && (
              <div className="relative max-w-xs w-full">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8a8278]" />
                <input
                  type="text"
                  value={memberSearchQuery}
                  onChange={(e) => setMemberSearchQuery(e.target.value)}
                  placeholder="Filter members by name..."
                  className="w-full pl-10 pr-8 py-2 rounded-2xl bg-[#FAF8F5] border border-[#E2DBD0] text-xs text-stone-900 focus:outline-none focus:border-[#2D5A3D] shadow-2xs transition-colors"
                />
                {memberSearchQuery && (
                  <button
                    type="button"
                    onClick={() => setMemberSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700 text-xs font-bold cursor-pointer"
                  >
                    ✕
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Members Grid */}
          {filteredMembers.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5">
              {filteredMembers.map((m: any) => {
                const u = m.user;
                if (!u) return null;
                const isMemberHost = circle.creator && String(circle.creator.id) === String(u.id);
                const isSelf = currentUser && String(currentUser.id) === String(u.id);
                const joinedFormatted = m.joinedAt
                  ? new Date(m.joinedAt).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                    })
                  : null;

                return (
                  <div
                    key={m.id}
                    onClick={() => navigate(`/profile/${u.username || u.id}?circleId=${circle.id}`)}
                    className="p-4 rounded-2xl border border-[#E2DBD0] bg-[#FAF8F5] hover:border-[#2D5A3D]/50 hover:bg-white transition-all flex flex-col justify-between gap-3 shadow-2xs hover:shadow-xs cursor-pointer group"
                  >
                    <div className="flex items-start gap-3 min-w-0">
                      <Avatar
                        name={u.username}
                        photoUrl={u.photoUrl}
                        size="md"
                        className="w-11 h-11 rounded-full border border-white shadow-2xs shrink-0"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <h4 className="text-xs font-bold text-stone-900 truncate group-hover:text-[#2D5A3D] transition-colors">
                            @{u.username}
                          </h4>
                          {isMemberHost && (
                            <span className="text-[9px] font-bold bg-amber-100 text-amber-900 border border-amber-300 px-1.5 py-0.2 rounded-md">
                              Host
                            </span>
                          )}
                          {isSelf && (
                            <span className="text-[9px] font-bold bg-[#eaf3ed] text-[#2D5A3D] px-1.5 py-0.2 rounded-md">
                              You
                            </span>
                          )}
                        </div>

                        {(u.neighbourhood || u.cityName) && (
                          <p className="text-[11px] text-[#8a8278] truncate mt-0.5">
                            📍 {u.neighbourhood || u.cityName}
                          </p>
                        )}

                        {u.bio && (
                          <p className="text-[11px] text-stone-600 line-clamp-1 italic mt-1">
                            "{u.bio}"
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Footer with Joined Date & Creator Controls */}
                    <div className="pt-2 border-t border-[#E2DBD0]/60 flex items-center justify-between text-[10px] text-[#8a8278] gap-2">
                      {joinedFormatted && (
                        <span className="flex items-center gap-1 truncate">
                          <Calendar className="w-3 h-3 text-[#8a8278] shrink-0" />
                          <span className="truncate">Joined {joinedFormatted}</span>
                        </span>
                      )}

                      <div className="flex items-center gap-2 ml-auto" onClick={(e) => e.stopPropagation()}>
                        {isCreator && !isMemberHost && !isSelf && (
                          confirmRemoveId === u.id ? (
                            <div className="flex items-center gap-1 animate-in fade-in">
                              <button
                                type="button"
                                disabled={removingMemberId === u.id}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleRemoveMember(Number(u.id));
                                }}
                                className="px-2 py-0.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-bold text-[10px] transition-colors cursor-pointer shadow-2xs"
                              >
                                {removingMemberId === u.id ? 'Removing...' : 'Confirm'}
                              </button>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setConfirmRemoveId(null);
                                }}
                                className="px-1.5 py-0.5 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-700 text-[10px] transition-colors cursor-pointer"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setConfirmRemoveId(u.id);
                              }}
                              className="px-2 py-0.5 rounded-lg bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 font-semibold text-[10px] transition-colors cursor-pointer flex items-center gap-1 shadow-2xs"
                              title="Remove member from circle"
                            >
                              <UserMinus className="w-2.5 h-2.5" />
                              <span>Remove</span>
                            </button>
                          )
                        )}

                        <span className="font-bold text-[#2D5A3D] group-hover:underline">
                          View Profile →
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-10 px-4 rounded-2xl bg-[#FAF8F5] border border-[#E2DBD0]/60 space-y-1">
              <p className="text-xs text-[#8a8278]">
                {memberSearchQuery ? `No members found matching "${memberSearchQuery}".` : 'No members joined yet.'}
              </p>
            </div>
          )}
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* MANAGEMENT MODAL (If Host wants to edit details) */}
      {/* ───────────────────────────────────────────────────────────── */}
      {managingCircle && (
        <CircleManagementModal
          isOpen={Boolean(managingCircle)}
          circle={managingCircle}
          onClose={() => {
            setManagingCircle(null);
            refetchCircle();
          }}
          onCircleUpdated={(msg) => {
            setActionStatusMsg(msg);
            setManagingCircle(null);
            refetchCircle();
          }}
          onCircleDeleted={(msg) => {
            setManagingCircle(null);
            navigate('/social');
          }}
        />
      )}
    </div>
  );
};
