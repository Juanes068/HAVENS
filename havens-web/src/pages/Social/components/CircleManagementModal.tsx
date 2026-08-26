import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@apollo/client';
import {
  GET_COMMUNITY_MEMBERS,
  UPDATE_COMMUNITY,
  DELETE_COMMUNITY,
  GET_ALL_HOBBY_CATEGORIES,
  GENERATE_CLOUDINARY_SIGNATURE,
  REMOVE_COMMUNITY_MEMBER,
  GET_ALL_COMMUNITIES,
  MY_COMMUNITIES,
} from '../../../graphql/operations';
import { useAuth } from '../../../context/AuthContext';
import { LocationInput, LocationData } from '../../../components/LocationInput';
import { Avatar } from '../../../components/Avatar';
import { AgeRangeSelector } from '../../../components/ui/AgeRangeSelector';
import {
  Users,
  Settings,
  Crown,
  Search,
  Calendar,
  MapPin,
  Trash2,
  Camera,
  Folder,
  Sparkles,
  Save,
  X,
  UserMinus,
} from 'lucide-react';
import { Circle } from '../types';

interface CircleManagementModalProps {
  isOpen: boolean;
  circle: Circle | null;
  onClose: () => void;
  onCircleUpdated: (message: string) => void;
  onCircleDeleted: (message: string) => void;
  onViewUserProfile?: (user: any) => void;
}

const CLOUDINARY_CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || 'g8jffrmx';
const MAX_MAIN_CATEGORIES = 3;
const MAX_SECONDARY_PER_CATEGORY = 5;

export const CircleManagementModal: React.FC<CircleManagementModalProps> = ({
  isOpen,
  circle,
  onClose,
  onCircleUpdated,
  onCircleDeleted,
  onViewUserProfile,
}) => {
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState<'members' | 'edit'>('members');
  const [memberSearchQuery, setMemberSearchQuery] = useState('');

  // Edit Form States
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isVirtual, setIsVirtual] = useState(false);
  const [locationName, setLocationName] = useState('');
  const [ageRange, setAgeRange] = useState('All Ages');
  const [coordinates, setCoordinates] = useState<{ latitude: number | null; longitude: number | null }>({
    latitude: null,
    longitude: null,
  });
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<number[]>([]);
  const [selectedHobbyIds, setSelectedHobbyIds] = useState<number[]>([]);
  const [selectedImageFile, setSelectedImageFile] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string>('');

  // UI state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);

  // Queries & Mutations
  const {
    data: membersData,
    loading: loadingMembers,
    refetch: refetchMembers,
  } = useQuery(GET_COMMUNITY_MEMBERS, {
    variables: { communityId: circle ? Number(circle.id) : 0 },
    skip: !circle || !isOpen,
    fetchPolicy: 'cache-and-network',
  });

  const { data: taxonomyData } = useQuery(GET_ALL_HOBBY_CATEGORIES);
  const categories = useMemo(() => taxonomyData?.allHobbyCategories || [], [taxonomyData]);

  const [updateCommunityMutation] = useMutation(UPDATE_COMMUNITY);
  const [deleteCommunityMutation, { loading: isDeleting }] = useMutation(DELETE_COMMUNITY);
  const [generateCloudinarySignature] = useMutation(GENERATE_CLOUDINARY_SIGNATURE);

  const [removingMemberId, setRemovingMemberId] = useState<number | null>(null);
  const [confirmRemoveId, setConfirmRemoveId] = useState<number | null>(null);

  const [removeMemberMutation] = useMutation(REMOVE_COMMUNITY_MEMBER, {
    refetchQueries: [
      { query: GET_COMMUNITY_MEMBERS, variables: { communityId: circle ? Number(circle.id) : 0 } },
      { query: GET_ALL_COMMUNITIES },
      { query: MY_COMMUNITIES },
    ],
    onCompleted: (res) => {
      setRemovingMemberId(null);
      setConfirmRemoveId(null);
      if (res?.removeCommunityMember?.success) {
        setStatusMessage({ type: 'success', text: 'Member removed from Circle successfully.' });
        refetchMembers();
      } else {
        setStatusMessage({
          type: 'error',
          text: res?.removeCommunityMember?.message || 'Failed to remove member from Circle.',
        });
      }
    },
    onError: (err) => {
      setRemovingMemberId(null);
      setConfirmRemoveId(null);
      setStatusMessage({ type: 'error', text: err.message || 'Error removing member.' });
    },
  });

  const handleRemoveMember = async (userId: number) => {
    if (!circle) return;
    setRemovingMemberId(userId);
    try {
      await removeMemberMutation({
        variables: {
          communityId: Number(circle.id),
          userId,
        },
      });
    } catch (e) {
      console.error(e);
    }
  };

  // Populate form with circle data when opened
  useEffect(() => {
    if (circle) {
      setName(circle.name || '');
      setDescription(circle.description || '');
      setIsVirtual(Boolean(circle.isVirtual));
      setLocationName(circle.locationName || '');
      setAgeRange(circle.ageRange || 'All Ages');
      setCoordinates({
        latitude: circle.latitude ?? null,
        longitude: circle.longitude ?? null,
      });
      setImagePreviewUrl(circle.imageUrl || '');
      setSelectedImageFile(null);
      setStatusMessage(null);
      setIsConfirmingDelete(false);

      if (circle.hobbies && circle.hobbies.length > 0) {
        const hIds = circle.hobbies.map((h: any) => Number(h.id));
        setSelectedHobbyIds(hIds);

        const catIds = categories
          .filter((cat: any) => cat.hobbies?.some((hb: any) => hIds.includes(Number(hb.id))))
          .map((cat: any) => Number(cat.id));
        setSelectedCategoryIds(Array.from(new Set(catIds)));
      } else {
        setSelectedHobbyIds([]);
        setSelectedCategoryIds([]);
      }
    }
  }, [circle, categories]);

  if (!isOpen || !circle) return null;

  const isCreator = Boolean(
    currentUser && circle.creator && String(circle.creator.id) === String(currentUser.id)
  );

  const memberships = membersData?.communityMembers || [];

  // Filtered members by search query
  const filteredMembers = memberships.filter((m: any) => {
    if (!memberSearchQuery.trim()) return true;
    const q = memberSearchQuery.trim().toLowerCase();
    const u = m.user;
    const usernameMatch = u?.username?.toLowerCase().includes(q);
    const bioMatch = u?.bio?.toLowerCase().includes(q);
    const locMatch = (u?.neighbourhood || u?.cityName || '').toLowerCase().includes(q);
    const hobbyMatch = (u?.hobbies || []).some((h: any) => h.name?.toLowerCase().includes(q));
    return usernameMatch || bioMatch || locMatch || hobbyMatch;
  });

  const handleLocationSelect = (loc: LocationData | null) => {
    setStatusMessage(null);
    if (loc) {
      const address = loc.formatted_address || loc.formattedAddress || loc.address || loc.name || '';
      setLocationName(address);
      const lat = loc.lat ?? loc.latitude ?? null;
      const lng = loc.lng ?? loc.longitude ?? null;
      setCoordinates({
        latitude: typeof lat === 'number' && !isNaN(lat) ? lat : null,
        longitude: typeof lng === 'number' && !isNaN(lng) ? lng : null,
      });
    } else {
      setLocationName('');
      setCoordinates({ latitude: null, longitude: null });
    }
  };

  const handleToggleVirtual = (checked: boolean) => {
    setIsVirtual(checked);
    setStatusMessage(null);
    if (checked) {
      setLocationName('Virtual Group');
      setCoordinates({ latitude: null, longitude: null });
    } else {
      setLocationName('');
      setCoordinates({ latitude: null, longitude: null });
    }
  };

  const handleCategoryToggle = (categoryId: number) => {
    setStatusMessage(null);
    if (selectedCategoryIds.includes(categoryId)) {
      setSelectedCategoryIds((prev) => prev.filter((id) => id !== categoryId));
      const targetCategory = categories.find((c: any) => Number(c.id) === categoryId);
      const catHobbyIds = new Set((targetCategory?.hobbies || []).map((h: any) => Number(h.id)));
      setSelectedHobbyIds((prev) => prev.filter((id) => !catHobbyIds.has(id)));
    } else {
      if (selectedCategoryIds.length >= MAX_MAIN_CATEGORIES) {
        setStatusMessage({
          type: 'error',
          text: `You can select a maximum of ${MAX_MAIN_CATEGORIES} main categories.`,
        });
        return;
      }
      setSelectedCategoryIds((prev) => [...prev, categoryId]);
    }
  };

  const handleHobbyToggle = (categoryId: number, hobbyId: number) => {
    setStatusMessage(null);
    if (selectedHobbyIds.includes(hobbyId)) {
      setSelectedHobbyIds((prev) => prev.filter((id) => id !== hobbyId));
    } else {
      const targetCategory = categories.find((c: any) => Number(c.id) === categoryId);
      const catHobbyIds = new Set((targetCategory?.hobbies || []).map((h: any) => Number(h.id)));
      const countInThisCat = selectedHobbyIds.filter((id) => catHobbyIds.has(id)).length;

      if (countInThisCat >= MAX_SECONDARY_PER_CATEGORY) {
        setStatusMessage({
          type: 'error',
          text: `Maximum ${MAX_SECONDARY_PER_CATEGORY} sub-hobbies allowed for "${targetCategory?.name}".`,
        });
        return;
      }

      setSelectedHobbyIds((prev) => [...prev, hobbyId]);
    }
  };

  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedImageFile(file);
      setImagePreviewUrl(URL.createObjectURL(file));
      setStatusMessage(null);
    }
  };

  const handleSaveCircle = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatusMessage(null);

    if (!name.trim()) {
      setStatusMessage({ type: 'error', text: 'Circle name is required.' });
      return;
    }

    if (!isVirtual && !locationName.trim()) {
      setStatusMessage({ type: 'error', text: 'Please specify a location or set to Virtual Group.' });
      return;
    }

    setIsSubmitting(true);

    try {
      let finalImageUrl = circle.imageUrl || '';

      if (selectedImageFile) {
        try {
          const timestamp = Math.round(new Date().getTime() / 1000);
          const paramsToSign = JSON.stringify({ timestamp });

          const sigRes = await generateCloudinarySignature({
            variables: { paramsToSign, folder: 'havens_communities' },
          });

          const sigData = sigRes?.data?.generateCloudinarySignature;
          if (sigData?.success) {
            const { signature, apiKey } = sigData;
            const formData = new FormData();
            formData.append('file', selectedImageFile);
            formData.append('api_key', String(apiKey));
            formData.append('timestamp', String(timestamp));
            formData.append('signature', String(signature));
            formData.append('folder', 'havens_communities');

            const cloudRes = await fetch(
              `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
              { method: 'POST', body: formData }
            );

            if (cloudRes.ok) {
              const cloudJson = await cloudRes.json();
              if (cloudJson.secure_url) {
                finalImageUrl = cloudJson.secure_url;
              }
            }
          }
        } catch (uploadErr) {
          console.warn('Cloudinary upload notice:', uploadErr);
        }
      }

      const res = await updateCommunityMutation({
        variables: {
          id: Number(circle.id),
          name: name.trim(),
          description: description.trim(),
          locationName: isVirtual ? 'Virtual Group' : locationName.trim(),
          latitude: isVirtual ? null : coordinates.latitude,
          longitude: isVirtual ? null : coordinates.longitude,
          isVirtual,
          imageUrl: finalImageUrl,
          ageRange: ageRange || 'All Ages',
          hobbyIds: selectedHobbyIds,
        },
      });

      const data = res?.data?.updateCommunity;
      if (data?.success) {
        onCircleUpdated(data.message || 'Circle updated successfully!');
        setStatusMessage({ type: 'success', text: data.message || 'Circle updated successfully!' });
      } else {
        setStatusMessage({ type: 'error', text: data?.message || 'Failed to update circle.' });
      }
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message || 'An error occurred while updating.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteCircle = async () => {
    try {
      const res = await deleteCommunityMutation({
        variables: { id: Number(circle.id) },
      });

      if (res?.data?.deleteCommunity?.success) {
        onCircleDeleted(res.data.deleteCommunity.message || 'Circle deleted.');
        onClose();
      } else {
        setStatusMessage({
          type: 'error',
          text: res?.data?.deleteCommunity?.message || 'Failed to delete circle.',
        });
      }
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message || 'Error deleting circle.' });
    }
  };

  const selectedCategoriesList = categories.filter((c: any) =>
    selectedCategoryIds.includes(Number(c.id))
  );

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white border border-[#E2DBD0] rounded-3xl p-6 md:p-8 max-w-3xl w-full shadow-2xl space-y-6 animate-in fade-in zoom-in-95 duration-150 max-h-[92vh] flex flex-col justify-between overflow-y-auto">
        
        {/* Modal Top Header */}
        <div>
          <div className="flex items-center justify-between pb-4 border-b border-[#E2DBD0]">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-[#eaf3ed] border border-[#2D5A3D]/20 flex items-center justify-center text-[#2D5A3D]">
                <Users className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold text-[#C47B5A] uppercase tracking-wider">
                    Circle Management & Hub
                  </span>
                  {isCreator && (
                    <span className="text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200 px-2 py-0.5 rounded-full flex items-center gap-1">
                      <Crown className="w-3 h-3 text-amber-700" />
                      <span>Host</span>
                    </span>
                  )}
                </div>
                <h2 className="text-xl font-serif font-bold text-[#2D5A3D]">{circle.name}</h2>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="text-xs font-bold text-[#8a8278] hover:text-charcoal bg-[#F4EEE2] p-2 rounded-full cursor-pointer transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Navigation Tab Bar */}
          <div className="flex items-center gap-2 mt-4 p-1 bg-[#F4EEE2] rounded-2xl">
            <button
              type="button"
              onClick={() => {
                setActiveTab('members');
                setStatusMessage(null);
              }}
              className={`flex-1 py-2 px-4 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2 ${
                activeTab === 'members'
                  ? 'bg-white text-[#2D5A3D] shadow-xs'
                  : 'text-[#8a8278] hover:text-charcoal'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Circle Members ({memberships.length})</span>
            </button>

            {isCreator && (
              <button
                type="button"
                onClick={() => {
                  setActiveTab('edit');
                  setStatusMessage(null);
                }}
                className={`flex-1 py-2 px-4 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2 ${
                  activeTab === 'edit'
                    ? 'bg-white text-[#2D5A3D] shadow-xs'
                    : 'text-[#8a8278] hover:text-charcoal'
                }`}
              >
                <Settings className="w-3.5 h-3.5" />
                <span>Edit Circle Details</span>
              </button>
            )}
          </div>
        </div>

        {/* Global Feedback Banner */}
        {statusMessage && (
          <div
            className={`p-3.5 rounded-2xl text-xs font-semibold flex items-center justify-between shadow-2xs ${
              statusMessage.type === 'success'
                ? 'bg-[#eaf3ed] text-[#2D5A3D] border border-[#7aaa8a]/40'
                : 'bg-rose-50 text-rose-700 border border-rose-200'
            }`}
          >
            <span>{statusMessage.text}</span>
            <button
              type="button"
              onClick={() => setStatusMessage(null)}
              className="text-xs font-bold opacity-70 hover:opacity-100"
            >
              ✕
            </button>
          </div>
        )}

        {/* ───────────────────────────────────────────────────────────── */}
        {/* TAB 1: MEMBERS MONITORING VIEW */}
        {/* ───────────────────────────────────────────────────────────── */}
        {activeTab === 'members' && (
          <div className="space-y-4">
            {/* Search Bar for Members */}
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8a8278]" />
              <input
                type="text"
                value={memberSearchQuery}
                onChange={(e) => setMemberSearchQuery(e.target.value)}
                placeholder="Search joined members by username, location, or hobbies..."
                className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-[#FAF8F5] border border-[#E2DBD0] text-xs text-[#2C2C2C] focus:outline-none focus:border-[#2D5A3D] transition-colors"
              />
              {memberSearchQuery && (
                <button
                  type="button"
                  onClick={() => setMemberSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-[#8a8278] hover:text-charcoal"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Members Directory */}
            {loadingMembers ? (
              <div className="py-16 text-center text-xs text-[#8a8278] font-serif animate-pulse">
                Loading circle members...
              </div>
            ) : filteredMembers.length === 0 ? (
              <div className="p-10 bg-[#FAF8F5] border border-[#E2DBD0] rounded-2xl text-center space-y-2">
                <Users className="w-8 h-8 text-[#8a8278] mx-auto opacity-50" />
                <h4 className="text-sm font-semibold text-[#2D5A3D]">No members found</h4>
                <p className="text-xs text-[#8a8278]">
                  {memberSearchQuery
                    ? `No members matching "${memberSearchQuery}".`
                    : 'Be the first to invite connections to join your circle!'}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[46vh] overflow-y-auto pr-1">
                {filteredMembers.map((membership: any) => {
                  const u = membership.user;
                  const isHost = circle.creator && String(circle.creator.id) === String(u?.id);
                  const isSelf = currentUser && String(currentUser.id) === String(u?.id);
                  const joinedDate = membership.joinedAt
                    ? new Date(membership.joinedAt).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })
                    : null;

                  return (
                    <div
                      key={membership.id}
                      onClick={() => {
                        onClose();
                        navigate(`/profile/${u?.username || u?.id}?circleId=${circle.id}`);
                      }}
                      className="p-3.5 rounded-2xl border border-[#E2DBD0] bg-white hover:border-[#2D5A3D]/50 hover:shadow-2xs transition-all flex flex-col justify-between gap-3 cursor-pointer group"
                    >
                      <div className="flex items-start gap-3">
                        <Avatar
                          name={u?.username || 'Member'}
                          photoUrl={u?.photoUrl}
                          size="md"
                          className="w-11 h-11 border border-[#E2DBD0] rounded-full shrink-0 shadow-2xs"
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <h4 className="text-xs font-bold text-stone-900 truncate group-hover:text-[#2D5A3D] transition-colors">
                              @{u?.username}
                            </h4>
                            {isHost && (
                              <span className="text-[9px] font-bold bg-amber-100 text-amber-900 border border-amber-300 px-1.5 py-0.2 rounded-md">
                                Host
                              </span>
                            )}
                            {isSelf && (
                              <span className="text-[9px] font-bold bg-[#eaf3ed] text-[#2D5A3D] px-1.5 py-0.2 rounded-md">
                                You
                              </span>
                            )}
                            {u?.age ? (
                              <span className="text-[10px] font-semibold text-stone-700 bg-[#FAF8F5] border border-[#E2DBD0] px-1.5 py-0.2 rounded-md">
                                {u.age} yrs
                              </span>
                            ) : null}
                          </div>

                          {(u?.neighbourhood || u?.cityName) && (
                            <p className="text-[11px] text-[#8a8278] truncate mt-0.5 flex items-center gap-1">
                              <MapPin className="w-3 h-3 shrink-0" />
                              <span>{u.neighbourhood || u.cityName}</span>
                            </p>
                          )}

                          {u?.bio && (
                            <p className="text-[11px] text-stone-600 line-clamp-1 italic mt-1 bg-[#FAF8F5] p-1.5 rounded-lg border border-[#E2DBD0]/60">
                              "{u.bio}"
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Footer with Joined Date & Member Actions */}
                      <div className="pt-2 border-t border-[#E2DBD0]/60 flex items-center justify-between text-[10px] text-[#8a8278] gap-2">
                        {joinedDate && (
                          <span className="flex items-center gap-1 truncate">
                            <Calendar className="w-3 h-3 text-[#8a8278] shrink-0" />
                            <span className="truncate">Joined {joinedDate}</span>
                          </span>
                        )}

                        <div className="flex items-center gap-2 ml-auto" onClick={(e) => e.stopPropagation()}>
                          {isCreator && !isHost && !isSelf && (
                            confirmRemoveId === u?.id ? (
                              <div className="flex items-center gap-1 animate-in fade-in">
                                <button
                                  type="button"
                                  disabled={removingMemberId === u?.id}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleRemoveMember(Number(u.id));
                                  }}
                                  className="px-2 py-0.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-bold text-[10px] transition-colors cursor-pointer shadow-2xs"
                                >
                                  {removingMemberId === u?.id ? 'Removing...' : 'Yes, Remove'}
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
            )}
          </div>
        )}

        {/* ───────────────────────────────────────────────────────────── */}
        {/* TAB 2: EDIT CIRCLE DETAILS FORM */}
        {/* ───────────────────────────────────────────────────────────── */}
        {activeTab === 'edit' && isCreator && (
          <form onSubmit={handleSaveCircle} className="space-y-4 max-h-[52vh] overflow-y-auto pr-1">
            {/* Circle Title */}
            <div>
              <label className="block text-xs font-bold text-charcoal mb-1">
                Circle Title <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Circle title..."
                required
                className="w-full px-4 py-2.5 rounded-2xl bg-white border border-[#E2DBD0] text-xs font-semibold text-[#2C2C2C] focus:outline-none focus:border-[#2D5A3D] transition-colors"
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-xs font-bold text-charcoal mb-1">
                Description & Mission <span className="text-rose-500">*</span>
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                placeholder="Describe your circle's activities, vibe, and schedule..."
                required
                className="w-full px-4 py-2.5 rounded-2xl bg-white border border-[#E2DBD0] text-xs text-[#2C2C2C] focus:outline-none focus:border-[#2D5A3D] transition-colors resize-none leading-relaxed"
              />
            </div>

            {/* Target Age Range with Reusable AgeRangeSelector */}
            <AgeRangeSelector
              value={ageRange}
              onChange={(val) => setAgeRange(val)}
              label="Circle Age Requirement"
              description="Target age bracket for circle members or choose All Ages"
            />

            {/* Virtual Group Switch */}
            <div className="flex items-center justify-between p-3.5 bg-[#FAF8F5] border border-[#E2DBD0] rounded-2xl">
              <div>
                <p className="text-xs font-bold text-[#2C2C2C]">Virtual Group / Online Circle</p>
                <p className="text-[11px] text-[#8a8278]">Bypass physical geolocation distance filters</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer shrink-0">
                <input
                  type="checkbox"
                  checked={isVirtual}
                  onChange={(e) => handleToggleVirtual(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-10 h-5.5 bg-[#E2DBD0] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[3px] after:left-[3px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#2D5A3D]"></div>
              </label>
            </div>

            {/* Location Input (Google Maps) */}
            {!isVirtual && (
              <div>
                <label className="block text-xs font-bold text-charcoal mb-1">
                  Location / Neighbourhood <span className="text-rose-500">*</span>
                </label>
                <LocationInput
                  initialValue={locationName}
                  onSelectLocation={handleLocationSelect}
                  placeholder="Search neighbourhood or city (e.g. Kitsilano Beach, Vancouver)"
                  className="rounded-2xl"
                />
              </div>
            )}

            {/* Cover Photo Upload */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-charcoal mb-1">
                Circle Cover Photo
              </label>
              <div className="flex items-center gap-4">
                {imagePreviewUrl ? (
                  <div className="w-20 h-20 rounded-2xl overflow-hidden border border-[#E2DBD0] shrink-0 bg-[#FAF8F5]">
                    <img
                      src={imagePreviewUrl}
                      alt="Cover Preview"
                      className="w-full h-full object-cover"
                    />
                  </div>
                ) : (
                  <div className="w-20 h-20 rounded-2xl border-2 border-dashed border-[#E2DBD0] flex items-center justify-center text-[#8a8278] shrink-0">
                    <Camera className="w-6 h-6" />
                  </div>
                )}
                <div className="flex-1">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageFileChange}
                    className="w-full text-xs text-stone-500 file:mr-3 file:py-2 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-[#2D5A3D] file:text-white hover:file:bg-[#3d7a55] cursor-pointer"
                  />
                  <p className="text-[11px] text-[#8a8278] mt-1">
                    Upload a vibrant high-resolution photo representing your micro-community.
                  </p>
                </div>
              </div>
            </div>

            {/* 2-Tier Hobbies Taxonomy Editor */}
            <div className="space-y-3 pt-3 border-t border-[#E2DBD0]/60">
              <div>
                <h4 className="text-xs font-bold text-charcoal uppercase tracking-wider">
                  Select Main Categories (Max {MAX_MAIN_CATEGORIES})
                </h4>
                <p className="text-[11px] text-[#8a8278]">
                  Select the core pillars that define this circle.
                </p>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {categories.map((cat: any) => {
                  const isSelected = selectedCategoryIds.includes(Number(cat.id));
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => handleCategoryToggle(Number(cat.id))}
                      className={`p-2.5 rounded-xl border text-left text-xs font-semibold transition-all cursor-pointer flex items-center justify-between ${
                        isSelected
                          ? 'bg-[#2D5A3D] text-white border-[#2D5A3D] shadow-2xs'
                          : 'bg-[#FAF8F5] text-stone-800 border-[#E2DBD0] hover:border-[#2D5A3D]/40'
                      }`}
                    >
                      <span className="truncate">{cat.name}</span>
                      <span className="text-[11px]">{isSelected ? '✓' : '+'}</span>
                    </button>
                  );
                })}
              </div>

              {/* Sub-hobbies per selected category */}
              {selectedCategoriesList.length > 0 && (
                <div className="space-y-3 pt-2">
                  <h4 className="text-xs font-bold text-charcoal uppercase tracking-wider">
                    Select Sub-Hobbies (Max {MAX_SECONDARY_PER_CATEGORY} per category)
                  </h4>
                  {selectedCategoriesList.map((category: any) => (
                    <div key={category.id} className="p-3 bg-[#FAF8F5] border border-[#E2DBD0] rounded-2xl space-y-2">
                      <span className="text-xs font-serif font-bold text-[#2D5A3D] block">
                        {category.name}
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {(category.hobbies || []).map((hobby: any) => {
                          const isHobbySelected = selectedHobbyIds.includes(Number(hobby.id));
                          return (
                            <button
                              key={hobby.id}
                              type="button"
                              onClick={() => handleHobbyToggle(Number(category.id), Number(hobby.id))}
                              className={`px-3 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                                isHobbySelected
                                  ? 'bg-[#2D5A3D] text-white shadow-2xs'
                                  : 'bg-white border border-[#E2DBD0] text-stone-700 hover:bg-[#F0EAE0]'
                              }`}
                            >
                              {isHobbySelected ? '✓ ' : '+ '}{hobby.name}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Action Buttons & Dangerous Zone */}
            <div className="pt-4 border-t border-[#E2DBD0] flex flex-col sm:flex-row items-center justify-between gap-3">
              <div>
                {!isConfirmingDelete ? (
                  <button
                    type="button"
                    onClick={() => setIsConfirmingDelete(true)}
                    className="text-xs font-bold text-rose-600 hover:text-rose-800 flex items-center gap-1.5 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete this Circle</span>
                  </button>
                ) : (
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-rose-700">Are you sure?</span>
                    <button
                      type="button"
                      disabled={isDeleting}
                      onClick={handleDeleteCircle}
                      className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold cursor-pointer disabled:opacity-50"
                    >
                      {isDeleting ? 'Deleting...' : 'Yes, Delete'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsConfirmingDelete(false)}
                      className="px-2 py-1 text-xs text-stone-600 hover:text-stone-900 cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 sm:flex-initial px-4 py-2 rounded-xl border border-[#E2DBD0] text-stone-700 text-xs font-bold hover:bg-[#FAF8F5] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 sm:flex-initial px-5 py-2 rounded-xl bg-[#2D5A3D] hover:bg-[#3d7a55] text-white text-xs font-bold shadow-xs transition-colors cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{isSubmitting ? 'Saving...' : 'Save Changes'}</span>
                </button>
              </div>
            </div>
          </form>
        )}

      </div>
    </div>
  );
};
