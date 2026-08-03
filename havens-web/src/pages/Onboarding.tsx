import React, { useState, useRef } from 'react';
import { useQuery, useMutation } from '@apollo/client';
import { useNavigate } from 'react-router-dom';
import {
  GET_ALL_HOBBY_CATEGORIES,
  UPDATE_USER_HOBBIES,
  GENERATE_CLOUDINARY_SIGNATURE,
  UPDATE_USER_PROFILE,
} from '../graphql/operations';
import { useAuth } from '../context/AuthContext';

interface Hobby {
  id: string | number;
  name: string;
}

interface HobbyCategory {
  id: string | number;
  name: string;
  hobbies: Hobby[];
}

const MAX_PRIMARY_CATEGORIES = 3;
const MAX_SUB_HOBBIES_PER_CATEGORY = 5;

// Spotify-inspired curated color gradients per category index
const CATEGORY_GRADIENTS = [
  'from-emerald-800/90 to-[#2D5A3D]',
  'from-amber-700/90 to-[#C47B5A]',
  'from-indigo-800/90 to-purple-900',
  'from-rose-800/90 to-pink-900',
  'from-teal-800/90 to-cyan-900',
  'from-amber-800/90 to-[#7a4931]',
  'from-[#2D5A3D] to-slate-900',
  'from-purple-800/90 to-indigo-900',
  'from-orange-800/90 to-amber-900',
  'from-blue-800/90 to-indigo-900',
];

export const OnboardingView: React.FC = () => {
  const navigate = useNavigate();
  const { user: currentUser, refetchUser } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState<1 | 2>(1);
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([]);
  const [selectedHobbyIds, setSelectedHobbyIds] = useState<string[]>([]);
  const [expandedCategoryIds, setExpandedCategoryIds] = useState<string[]>([]);
  
  // Profile Picture Upload State
  const [avatarUrl, setAvatarUrl] = useState<string>(currentUser?.photoUrl || '');
  const [isUploadingPhoto, setIsUploadingPhoto] = useState<boolean>(false);
  const [photoSuccessMsg, setPhotoSuccessMsg] = useState<string>('');

  const [warningMsg, setWarningMsg] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string>('');

  // GraphQL Queries & Mutations
  const { data, loading, error } = useQuery<{ allHobbyCategories: HobbyCategory[] }>(
    GET_ALL_HOBBY_CATEGORIES
  );

  const [generateCloudinarySignature] = useMutation(GENERATE_CLOUDINARY_SIGNATURE);
  const [updateUserProfileMutation] = useMutation(UPDATE_USER_PROFILE);

  const [updateHobbies, { loading: isSaving }] = useMutation(UPDATE_USER_HOBBIES, {
    onCompleted: async (res) => {
      if (res?.updateUserHobbies?.success) {
        await refetchUser();
        // Programmatically navigate to Main Home Screen of Havens (/discover)
        navigate('/discover');
      } else {
        setErrorMsg(res?.updateUserHobbies?.message || 'Failed to save onboarding preferences.');
      }
    },
    onError: (err) => {
      setErrorMsg(err.message || 'Error saving hobbies.');
    },
  });

  const categories = data?.allHobbyCategories || [];

  // Authenticated Cloudinary Image Upload Process:
  // Signature (JWT Header active!) -> Direct Cloudinary POST -> Extract String URL -> Execute updateUserProfile(photoUrl)
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingPhoto(true);
    setErrorMsg('');
    setPhotoSuccessMsg('');

    try {
      // Step 1: Request Cloudinary signature from authenticated backend
      const sigRes = await generateCloudinarySignature({
        variables: { paramsToSign: "{}" },
      });

      const sigData = sigRes?.data?.generateCloudinarySignature;
      if (!sigData || !sigData.success) {
        throw new Error(sigData?.message || 'Failed to generate secure upload signature.');
      }

      const { signature, timestamp, apiKey } = sigData;
      const cloudName = 'g8jffrmx';

      // Step 2: Use signature to upload image file directly to Cloudinary
      const formData = new FormData();
      formData.append('file', file);
      formData.append('api_key', String(apiKey));
      formData.append('timestamp', String(timestamp));
      formData.append('signature', String(signature));

      const cloudRes = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
        method: 'POST',
        body: formData,
      });

      if (!cloudRes.ok) {
        const errorText = await cloudRes.text();
        console.error('[Cloudinary Upload Error Details]', {
          status: cloudRes.status,
          statusText: cloudRes.statusText,
          responseBody: errorText,
        });
        throw new Error(`Cloudinary upload error (${cloudRes.status}): ${errorText}`);
      }

      const cloudJson = await cloudRes.json();
      const uploadedPhotoUrl = cloudJson?.secure_url ? String(cloudJson.secure_url).trim() : '';

      if (!uploadedPhotoUrl || typeof uploadedPhotoUrl !== 'string' || !uploadedPhotoUrl.startsWith('http')) {
        throw new Error('Cloudinary response missing valid secure_url string.');
      }

      setAvatarUrl(uploadedPhotoUrl);
      console.log('[Authenticated Cloudinary Upload Success]', uploadedPhotoUrl);

      // Step 3: Execute updateUserProfile mutation with authenticated JWT header
      const updateRes = await updateUserProfileMutation({
        variables: {
          photoUrl: uploadedPhotoUrl,
        },
      });

      if (updateRes?.data?.updateUserProfile?.success) {
        setPhotoSuccessMsg('✓ Profile picture updated successfully!');
        await refetchUser();
      } else {
        setPhotoSuccessMsg('Photo saved to profile.');
      }
    } catch (err: any) {
      console.error('[ProfilePhotoUpload Error]', err);
      setErrorMsg(err.message || 'Failed to upload profile picture.');
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  // Toggle Category selection (Step 1 - Max 3 Primary Categories)
  const toggleCategory = (catIdRaw: string | number) => {
    const catId = String(catIdRaw);
    setWarningMsg('');
    setErrorMsg('');

    if (selectedCategoryIds.includes(catId)) {
      const targetCategory = categories.find((c) => String(c.id) === catId);
      const catHobbyIds = targetCategory ? targetCategory.hobbies.map((h) => String(h.id)) : [];
      
      setSelectedCategoryIds((prev) => prev.filter((id) => id !== catId));
      setSelectedHobbyIds((prev) => prev.filter((id) => !catHobbyIds.includes(id)));
      setExpandedCategoryIds((prev) => prev.filter((id) => id !== catId));
    } else {
      if (selectedCategoryIds.length >= MAX_PRIMARY_CATEGORIES) {
        setWarningMsg(`You can select a maximum of ${MAX_PRIMARY_CATEGORIES} Primary categories.`);
        return;
      }
      setSelectedCategoryIds((prev) => [...prev, catId]);
      if (!expandedCategoryIds.includes(catId)) {
        setExpandedCategoryIds((prev) => [...prev, catId]);
      }
    }
  };

  // Toggle Sub-Hobby selection (Step 2 - Max 5 Sub-Hobbies PER Primary Category)
  const toggleHobby = (categoryName: string, categoryHobbyIds: string[], hobbyIdRaw: string | number) => {
    const hobbyId = String(hobbyIdRaw);
    setWarningMsg('');
    setErrorMsg('');

    if (selectedHobbyIds.includes(hobbyId)) {
      setSelectedHobbyIds((prev) => prev.filter((id) => id !== hobbyId));
    } else {
      const currentCategoryHobbiesCount = selectedHobbyIds.filter((id) =>
        categoryHobbyIds.includes(id)
      ).length;

      if (currentCategoryHobbiesCount >= MAX_SUB_HOBBIES_PER_CATEGORY) {
        setWarningMsg(
          `You can select a maximum of ${MAX_SUB_HOBBIES_PER_CATEGORY} subcategories for "${categoryName}".`
        );
        return;
      }
      setSelectedHobbyIds((prev) => [...prev, hobbyId]);
    }
  };

  const handleNextStep = () => {
    if (selectedCategoryIds.length === 0) {
      setErrorMsg('Please select at least 1 primary category to personalize your feed.');
      return;
    }
    setWarningMsg('');
    setErrorMsg('');
    setStep(2);
  };

  const handleFinishOnboarding = () => {
    if (selectedHobbyIds.length === 0) {
      setErrorMsg('Please choose at least 1 subcategory so we can personalize your affinity match.');
      return;
    }
    setWarningMsg('');
    setErrorMsg('');
    const numericHobbyIds = selectedHobbyIds.map((id) => parseInt(id, 10));
    updateHobbies({
      variables: { hobbyIds: numericHobbyIds },
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F4EEE2] text-[#2C2C2C] flex items-center justify-center font-serif">
        <div className="text-center animate-pulse text-[#2D5A3D] text-lg">
          Loading Spotify-style interest taxonomy...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#F4EEE2] flex items-center justify-center p-6">
        <div className="p-6 bg-rose-50 border border-rose-200 text-rose-700 rounded-2xl max-w-md text-center">
          <p className="font-semibold text-sm">Failed to load onboarding taxonomy</p>
          <p className="text-xs mt-1">{error.message}</p>
        </div>
      </div>
    );
  }

  const activeCategories = categories.filter((c) => selectedCategoryIds.includes(String(c.id)));

  return (
    <div className="min-h-screen bg-[#F4EEE2] text-[#2C2C2C] flex flex-col items-center justify-between p-6 antialiased">
      <div className="max-w-4xl w-full my-auto space-y-8">
        
        {/* Header & Step Indicator */}
        <div className="text-center">
          <span className="text-xs font-semibold tracking-wider text-[#C47B5A] uppercase">
            Step 2 of 2 • Profile Setup & Affinity Personalization
          </span>
          <h1 className="text-3xl md:text-4xl font-serif font-semibold tracking-tight text-[#2D5A3D] mt-2 lowercase">
            customize your digital footprint
          </h1>
          <p className="text-sm text-[#8a8278] font-normal mt-2 max-w-lg mx-auto">
            Upload your avatar and select interest categories heavily inspired by Spotify & Netflix onboarding.
          </p>
        </div>

        {/* ───────────────────────────────────────────────────────────── */}
        {/* EXACTLY ONE ISOLATED PROFILE PHOTO CARD AT TOP OF CONTAINER */}
        {/* ───────────────────────────────────────────────────────────── */}
        <div className="bg-white border border-[#E2DBD0] rounded-3xl p-6 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
              <div className="w-16 h-16 rounded-full bg-[#2D5A3D] text-white flex items-center justify-center font-bold text-xl overflow-hidden border-2 border-[#E2DBD0] shadow-sm">
                {avatarUrl ? (
                  <img src={avatarUrl} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  currentUser?.username?.charAt(0).toUpperCase() || 'U'
                )}
              </div>
              <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-white text-xs font-semibold">
                📷 Edit
              </div>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-charcoal">
                @{currentUser?.username || 'member'}'s Profile Photo
              </h3>
              <p className="text-xs text-[#8a8278] mt-0.5">
                Upload your avatar via authenticated Cloudinary signature
              </p>
              {photoSuccessMsg && (
                <p className="text-xs text-[#2D5A3D] font-medium mt-1 animate-fade-in">
                  {photoSuccessMsg}
                </p>
              )}
            </div>
          </div>

          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept="image/*"
            className="hidden"
          />

          <button
            type="button"
            disabled={isUploadingPhoto}
            onClick={() => fileInputRef.current?.click()}
            className="px-5 py-2.5 rounded-xl bg-[#F0EAE0] hover:bg-[#E2DBD0] text-[#2C2C2C] text-xs font-semibold border border-[#E2DBD0] transition-colors disabled:opacity-50 cursor-pointer"
          >
            {isUploadingPhoto ? 'Uploading to Cloudinary...' : 'Upload Photo'}
          </button>
        </div>

        {/* Warning Toast / Alert */}
        {warningMsg && (
          <div className="p-3 text-xs bg-amber-50 border border-amber-300 text-amber-900 rounded-xl text-center max-w-lg mx-auto shadow-xs animate-bounce font-medium">
            ⚠️ {warningMsg}
          </div>
        )}

        {/* Error Alert */}
        {errorMsg && (
          <div className="p-3 text-xs bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-center max-w-lg mx-auto font-medium">
            {errorMsg}
          </div>
        )}

        {/* ───────────────────────────────────────────────────────────── */}
        {/* SEPARATE SPOTIFY/NETFLIX HOBBIES SELECTION BLOCK */}
        {/* ───────────────────────────────────────────────────────────── */}
        {step === 1 && (
          <div>
            <div className="flex justify-between items-center mb-4 text-xs text-[#8a8278] font-medium px-1">
              <span>Primary Interest Categories</span>
              <span>{selectedCategoryIds.length} of {MAX_PRIMARY_CATEGORIES} selected</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 mb-8">
              {categories.map((cat, idx) => {
                const catIdStr = String(cat.id);
                const isSelected = selectedCategoryIds.includes(catIdStr);
                const gradientClass = CATEGORY_GRADIENTS[idx % CATEGORY_GRADIENTS.length];

                return (
                  <div
                    key={catIdStr}
                    onClick={() => toggleCategory(catIdStr)}
                    className={`relative rounded-3xl p-5 cursor-pointer transition-all duration-300 transform flex flex-col justify-between h-36 overflow-hidden shadow-sm hover:scale-[1.03] active:scale-95 ${
                      isSelected
                        ? 'bg-gradient-to-br from-[#2D5A3D] to-slate-900 text-white ring-4 ring-[#2D5A3D]/40 shadow-lg'
                        : `bg-gradient-to-br ${gradientClass} text-white/90 opacity-90 hover:opacity-100`
                    }`}
                  >
                    {/* Top Badge */}
                    <div className="flex justify-between items-start">
                      <span className="text-[10px] uppercase font-bold tracking-widest text-white/70">
                        {cat.hobbies?.length || 0} Topics
                      </span>
                      {isSelected && (
                        <span className="w-6 h-6 rounded-full bg-white text-[#2D5A3D] flex items-center justify-center text-xs font-bold shadow-xs">
                          ✓
                        </span>
                      )}
                    </div>

                    {/* Category Title */}
                    <div>
                      <h3 className="text-base font-serif font-bold leading-tight text-white">
                        {cat.name}
                      </h3>
                      <p className="text-[11px] text-white/80 mt-1 font-light">
                        {isSelected ? 'Selected Category' : 'Tap to select'}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {step === 2 && (
          <div>
            <div className="flex justify-between items-center mb-4 text-xs text-[#8a8278] font-medium px-1">
              <span>Subcategories (Max {MAX_SUB_HOBBIES_PER_CATEGORY} per category)</span>
              <span>{selectedHobbyIds.length} total selected</span>
            </div>

            <div className="space-y-6 mb-8">
              {activeCategories.map((cat) => {
                const categoryHobbyIdStrs = cat.hobbies.map((h) => String(h.id));
                const selectedInThisCategoryCount = selectedHobbyIds.filter((id) =>
                  categoryHobbyIdStrs.includes(id)
                ).length;

                return (
                  <div
                    key={String(cat.id)}
                    className="bg-white border border-[#E2DBD0] rounded-3xl p-6 shadow-xs"
                  >
                    <div className="flex justify-between items-center mb-4 border-b border-[#E2DBD0]/60 pb-3">
                      <h3 className="text-base font-serif font-semibold text-[#2D5A3D]">
                        {cat.name}
                      </h3>
                      <span className="text-xs font-semibold bg-[#eaf3ed] text-[#2D5A3D] px-3 py-1 rounded-full border border-[#7aaa8a]/30">
                        {selectedInThisCategoryCount} / {MAX_SUB_HOBBIES_PER_CATEGORY} selected
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-2.5">
                      {cat.hobbies.map((hb) => {
                        const hbIdStr = String(hb.id);
                        const isSelected = selectedHobbyIds.includes(hbIdStr);

                        return (
                          <button
                            key={hbIdStr}
                            type="button"
                            onClick={() => toggleHobby(cat.name, categoryHobbyIdStrs, hbIdStr)}
                            className={`px-4 py-2 rounded-full text-xs font-semibold transition-all duration-200 transform cursor-pointer hover:scale-[1.04] active:scale-95 ${
                              isSelected
                                ? 'bg-[#2D5A3D] text-white shadow-sm ring-2 ring-[#2D5A3D]/40'
                                : 'bg-[#F4EEE2] text-[#2C2C2C] border border-[#E2DBD0] hover:border-[#2D5A3D] hover:bg-white'
                            }`}
                          >
                            {isSelected ? '✓ ' : '+ '}{hb.name}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Footer Navigation Buttons */}
        <div className="flex items-center justify-between pt-4 border-t border-[#E2DBD0]">
          {step === 2 ? (
            <button
              type="button"
              onClick={() => setStep(1)}
              className="px-5 py-2.5 rounded-xl border border-[#E2DBD0] text-[#2C2C2C] text-xs font-medium hover:bg-white transition-colors cursor-pointer"
            >
              ← Back to Categories
            </button>
          ) : (
            <div />
          )}

          {step === 1 ? (
            <button
              type="button"
              onClick={handleNextStep}
              className="ml-auto px-8 py-3 rounded-xl bg-[#2D5A3D] text-white text-xs font-semibold shadow-sm hover:bg-[#3d7a55] transition-colors cursor-pointer"
            >
              Continue to Subcategories ({selectedCategoryIds.length}/{MAX_PRIMARY_CATEGORIES}) →
            </button>
          ) : (
            <button
              type="button"
              disabled={isSaving}
              onClick={handleFinishOnboarding}
              className="px-8 py-3 rounded-xl bg-[#2D5A3D] text-white text-xs font-semibold shadow-sm hover:bg-[#3d7a55] transition-colors disabled:opacity-50 cursor-pointer"
            >
              {isSaving ? 'Saving Profile...' : `Finish Setup (${selectedHobbyIds.length} subcategories selected)`}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
