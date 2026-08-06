import React, { useState, useRef } from 'react';
import { useQuery, useMutation } from '@apollo/client';
import { useNavigate } from 'react-router-dom';
import {
  TOKEN_AUTH,
  CREATE_USER,
  GET_ALL_HOBBY_CATEGORIES,
  UPDATE_USER_HOBBIES,
  GENERATE_CLOUDINARY_SIGNATURE,
  UPDATE_USER_PROFILE,
} from '../graphql/operations';
import { useAuth } from '../context/AuthContext';
import { LocationAutocomplete, LocationResult } from '../components/LocationAutocomplete';

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
  const { token, user: currentUser, login, refetchUser } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 4-Step Wizard State (Step 1: Account, Step 2: Primary Hobbies, Step 3: Secondary Hobbies, Step 4: Photo)
  const [wizardStep, setWizardStep] = useState<1 | 2 | 3 | 4>(() => (token ? 2 : 1));

  // Step 1: Account Creation State
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [invitationCode, setInvitationCode] = useState('');
  const [selectedLocation, setSelectedLocation] = useState<LocationResult | null>(null);

  // Step 2 & 3: Hobbies Selection State
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([]);
  const [selectedHobbyIds, setSelectedHobbyIds] = useState<string[]>([]);

  // Step 4: Profile Photo State
  const [selectedImageFile, setSelectedImageFile] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string>(currentUser?.photoUrl || '');
  const [isUploadingPhoto, setIsUploadingPhoto] = useState<boolean>(false);
  const [photoSuccessMsg, setPhotoSuccessMsg] = useState<string>('');

  // General Status & Alert Messages
  const [isProcessingStep1, setIsProcessingStep1] = useState(false);
  const [step1StatusText, setStep1StatusText] = useState('');
  const [warningMsg, setWarningMsg] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string>('');

  // GraphQL Queries & Mutations
  const { data, loading: loadingTaxonomy, error: taxonomyError } = useQuery<{
    allHobbyCategories: HobbyCategory[];
  }>(GET_ALL_HOBBY_CATEGORIES);

  const [createUserMutation] = useMutation(CREATE_USER);
  const [tokenAuthMutation] = useMutation(TOKEN_AUTH);
  const [generateCloudinarySignature] = useMutation(GENERATE_CLOUDINARY_SIGNATURE);
  const [updateUserProfileMutation] = useMutation(UPDATE_USER_PROFILE);
  const [updateHobbies, { loading: isSavingHobbies }] = useMutation(UPDATE_USER_HOBBIES);

  const categories = data?.allHobbyCategories || [];
  const activeCategories = categories.filter((c) => selectedCategoryIds.includes(String(c.id)));

  // ─────────────────────────────────────────────────────────────
  // STEP 1: ACCOUNT CREATION & PASSWORD MATCHING VALIDATION
  // ─────────────────────────────────────────────────────────────
  const handleStep1Submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!username || !email || !password || !confirmPassword || !invitationCode) {
      setErrorMsg('Please fill in all required fields.');
      return;
    }

    // Client-side Password Confirmation Validation
    if (password !== confirmPassword) {
      setErrorMsg('⚠️ Password and Password Confirmation do not match.');
      return;
    }

    if (!selectedLocation) {
      setErrorMsg('Please select a valid location from the Google Places autocomplete dropdown.');
      return;
    }

    setIsProcessingStep1(true);

    try {
      // 1. Execute createUser mutation
      setStep1StatusText('Step 1/4: Registering account...');
      const regRes = await createUserMutation({
        variables: {
          username,
          email,
          password,
          invitationCode,
          neighbourhood: selectedLocation.neighbourhood,
          cityName: selectedLocation.cityName,
          latitude: selectedLocation.latitude,
          longitude: selectedLocation.longitude,
        },
      });

      if (!regRes?.data?.createUser?.success) {
        throw new Error(regRes?.data?.createUser?.message || 'Registration failed.');
      }

      // 2. Execute tokenAuth mutation & save token
      setStep1StatusText('Authenticating session & injecting JWT headers...');
      const loginRes = await tokenAuthMutation({
        variables: { username, password },
      });

      const newToken = loginRes?.data?.tokenAuth?.token;
      if (!newToken) {
        throw new Error('Auto-login after registration failed.');
      }

      await login(newToken);
      setErrorMsg('');

      // Advance to Step 2
      setWizardStep(2);
    } catch (err: any) {
      console.error('[Step 1 Account Error]', err);
      setErrorMsg(err.message || 'Registration failed.');
    }  finally {
      setIsProcessingStep1(false);
    }
  };

  // ─────────────────────────────────────────────────────────────
  // STEP 2: PRIMARY HOBBIES CATEGORY TOGGLE (MAX 3)
  // ─────────────────────────────────────────────────────────────
  const toggleCategory = (catIdRaw: string | number) => {
    const catId = String(catIdRaw);
    setWarningMsg('');
    setErrorMsg('');

    if (selectedCategoryIds.includes(catId)) {
      const targetCategory = categories.find((c) => String(c.id) === catId);
      const catHobbyIds = targetCategory ? targetCategory.hobbies.map((h) => String(h.id)) : [];

      setSelectedCategoryIds((prev) => prev.filter((id) => id !== catId));
      setSelectedHobbyIds((prev) => prev.filter((id) => !catHobbyIds.includes(id)));
    } else {
      if (selectedCategoryIds.length >= MAX_PRIMARY_CATEGORIES) {
        setWarningMsg(`You can select a maximum of ${MAX_PRIMARY_CATEGORIES} Primary categories.`);
        return;
      }
      setSelectedCategoryIds((prev) => [...prev, catId]);
    }
  };

  const handleStep2Next = () => {
    if (selectedCategoryIds.length === 0) {
      setErrorMsg('Please select at least 1 primary category to personalize your feed.');
      return;
    }
    setWarningMsg('');
    setErrorMsg('');
    setWizardStep(3);
  };

  // ─────────────────────────────────────────────────────────────
  // STEP 3: SECONDARY HOBBIES SUBCATEGORIES TOGGLE (MAX 5 PER CAT)
  // ─────────────────────────────────────────────────────────────
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

  const handleStep3Next = async () => {
    if (selectedHobbyIds.length === 0) {
      setErrorMsg('Please select at least 1 subcategory so we can personalize your affinity match.');
      return;
    }
    setWarningMsg('');
    setErrorMsg('');

    try {
      const numericHobbyIds = selectedHobbyIds.map((id) => parseInt(id, 10));
      const res = await updateHobbies({
        variables: { hobbyIds: numericHobbyIds },
      });

      if (res?.data?.updateUserHobbies?.success) {
        await refetchUser();
        // Advance to Step 4
        setWizardStep(4);
      } else {
        setErrorMsg(res?.data?.updateUserHobbies?.message || 'Failed to save hobbies.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Error saving hobbies.');
    }
  };

  // ─────────────────────────────────────────────────────────────
  // STEP 4: PROFILE PHOTO UPLOAD (OPTIONAL WITH SKIP FOR NOW)
  // ─────────────────────────────────────────────────────────────
  const handleAvatarFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedImageFile(file);
      setImagePreviewUrl(URL.createObjectURL(file));
      setErrorMsg('');
    }
  };

  const handleStep4UploadAndFinish = async () => {
    if (!selectedImageFile) {
      // If no new photo selected, finish onboarding
      navigate('/discover');
      return;
    }

    setIsUploadingPhoto(true);
    setErrorMsg('');
    setPhotoSuccessMsg('');

    try {
      // 1. Get Cloudinary signature from backend (paramsToSign: "{}")
      const sigRes = await generateCloudinarySignature({
        variables: { paramsToSign: '{}' },
      });

      const sigData = sigRes?.data?.generateCloudinarySignature;
      if (!sigData || !sigData.success) {
        throw new Error(sigData?.message || 'Failed to obtain Cloudinary upload signature.');
      }

      const { signature, timestamp, apiKey } = sigData;
      const cloudName = 'g8jffrmx';

      // 2. Direct POST to Cloudinary API endpoint
      const formData = new FormData();
      formData.append('file', selectedImageFile);
      formData.append('api_key', String(apiKey));
      formData.append('timestamp', String(timestamp));
      formData.append('signature', String(signature));

      const cloudRes = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
        method: 'POST',
        body: formData,
      });

      if (!cloudRes.ok) {
        const errorText = await cloudRes.text();
        throw new Error(`Cloudinary upload failed (${cloudRes.status}): ${errorText}`);
      }

      const cloudJson = await cloudRes.json();
      const uploadedPhotoUrl = cloudJson?.secure_url ? String(cloudJson.secure_url).trim() : '';

      if (!uploadedPhotoUrl || !uploadedPhotoUrl.startsWith('http')) {
        throw new Error('Cloudinary response missing valid secure_url string.');
      }

      // 3. Execute updateUserProfile mutation with string URL
      const updateRes = await updateUserProfileMutation({
        variables: { photoUrl: uploadedPhotoUrl },
      });

      if (updateRes?.data?.updateUserProfile?.success) {
        setPhotoSuccessMsg('✓ Profile picture updated!');
        await refetchUser();
      }

      // Final Redirect to Dashboard
      navigate('/discover');
    } catch (err: any) {
      console.error('[Step 4 Upload Error]', err);
      setErrorMsg(err.message || 'Failed to upload photo.');
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  const handleSkipPhotoStep = () => {
    // Finish Onboarding and redirect to Dashboard without photo upload
    navigate('/discover');
  };

  return (
    <div className="min-h-screen bg-[#F4EEE2] text-[#2C2C2C] flex flex-col items-center justify-between p-6 antialiased">
      <div className="max-w-4xl w-full my-auto space-y-8">
        
        {/* Wizard Header & Progress Bar */}
        <div className="text-center">
          <div className="flex items-center justify-center gap-2 mb-3">
            {[1, 2, 3, 4].map((stepNum) => (
              <div
                key={stepNum}
                className={`h-2 rounded-full transition-all duration-300 ${
                  wizardStep === stepNum
                    ? 'w-10 bg-[#2D5A3D]'
                    : wizardStep > stepNum
                    ? 'w-6 bg-[#2D5A3D]/40'
                    : 'w-6 bg-[#E2DBD0]'
                }`}
              />
            ))}
          </div>

          <span className="text-xs font-semibold tracking-wider text-[#C47B5A] uppercase">
            Step {wizardStep} of 4 • Havens Onboarding Wizard
          </span>
          <h1 className="text-3xl md:text-4xl font-serif font-semibold tracking-tight text-[#2D5A3D] mt-1 lowercase">
            {wizardStep === 1 && 'create your account'}
            {wizardStep === 2 && 'choose primary categories'}
            {wizardStep === 3 && 'choose subcategory pills'}
            {wizardStep === 4 && 'upload profile photo'}
          </h1>
          <p className="text-sm text-[#8a8278] font-normal mt-1.5 max-w-lg mx-auto">
            {wizardStep === 1 && 'Enter your details, 6-character invitation code, and location.'}
            {wizardStep === 2 && `Select up to ${MAX_PRIMARY_CATEGORIES} Spotify-inspired interest categories.`}
            {wizardStep === 3 && `Select up to ${MAX_SUB_HOBBIES_PER_CATEGORY} subcategories per primary category.`}
            {wizardStep === 4 && 'Add an optional profile picture or skip to enter your dashboard.'}
          </p>
        </div>

        {/* Global Warning Alert */}
        {warningMsg && (
          <div className="p-3 text-xs bg-amber-50 border border-amber-300 text-amber-900 rounded-xl text-center max-w-lg mx-auto shadow-xs animate-bounce font-medium">
            ⚠️ {warningMsg}
          </div>
        )}

        {/* Global Error Alert */}
        {errorMsg && (
          <div className="p-3 text-xs bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-center max-w-lg mx-auto font-medium">
            {errorMsg}
          </div>
        )}

        {/* ───────────────────────────────────────────────────────────── */}
        {/* STEP 1: ACCOUNT CREATION & PASSWORD MATCHING VALIDATION */}
        {/* ───────────────────────────────────────────────────────────── */}
        {wizardStep === 1 && (
          <div className="bg-[#F0EAE0]/80 border border-[#E2DBD0] rounded-3xl p-8 max-w-md mx-auto shadow-xs relative">
            {isProcessingStep1 && (
              <div className="absolute inset-0 z-50 bg-[#F0EAE0]/95 backdrop-blur-xs rounded-3xl flex flex-col items-center justify-center p-6 text-center">
                <div className="w-10 h-10 border-4 border-[#2D5A3D] border-t-transparent rounded-full animate-spin mb-4" />
                <h3 className="text-sm font-semibold text-[#2D5A3D]">Creating your Havens account...</h3>
                <p className="text-xs text-[#8a8278] mt-1 font-mono">{step1StatusText}</p>
              </div>
            )}

            <form onSubmit={handleStep1Submit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-[#8a8278] mb-1">Username / Name</label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter username"
                  className="w-full px-4 py-2.5 rounded-xl bg-white border border-[#E2DBD0] text-[#2C2C2C] text-sm focus:outline-none focus:border-[#2D5A3D]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#8a8278] mb-1">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full px-4 py-2.5 rounded-xl bg-white border border-[#E2DBD0] text-[#2C2C2C] text-sm focus:outline-none focus:border-[#2D5A3D]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#8a8278] mb-1">Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter password"
                  className="w-full px-4 py-2.5 rounded-xl bg-white border border-[#E2DBD0] text-[#2C2C2C] text-sm focus:outline-none focus:border-[#2D5A3D]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#8a8278] mb-1">
                  Password Confirmation <span className="text-[#C47B5A]">*</span>
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter password to confirm"
                  className={`w-full px-4 py-2.5 rounded-xl bg-white border text-[#2C2C2C] text-sm focus:outline-none ${
                    confirmPassword && confirmPassword !== password
                      ? 'border-rose-400 focus:border-rose-500'
                      : 'border-[#E2DBD0] focus:border-[#2D5A3D]'
                  }`}
                />
                {confirmPassword && confirmPassword !== password && (
                  <p className="text-[11px] text-rose-600 mt-1 font-medium">
                    ⚠️ Passwords do not match.
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-medium text-[#8a8278] mb-1">
                  Invitation Code <span className="text-[#C47B5A]">*</span>
                </label>
                <input
                  type="text"
                  maxLength={6}
                  value={invitationCode}
                  onChange={(e) => setInvitationCode(e.target.value.toUpperCase())}
                  placeholder="Enter 6-character code (e.g. A8X9K2)"
                  className="w-full px-4 py-2.5 rounded-xl bg-white border border-[#E2DBD0] text-[#2C2C2C] text-sm tracking-wider font-mono focus:outline-none focus:border-[#2D5A3D] uppercase"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#8a8278] mb-1">
                  Location / Neighbourhood <span className="text-[#C47B5A]">*</span>
                </label>
                <LocationAutocomplete
                  onSelectLocation={(loc) => {
                    setSelectedLocation(loc);
                    if (loc) setErrorMsg('');
                  }}
                  placeholder="Type location (e.g. Milenta, Bogotá)"
                />
              </div>

              <button
                type="submit"
                disabled={isProcessingStep1 || (confirmPassword !== '' && password !== confirmPassword)}
                className="w-full py-3 px-4 rounded-xl bg-[#2D5A3D] hover:bg-[#3d7a55] text-white font-medium text-sm transition-colors shadow-xs disabled:opacity-50 mt-4 cursor-pointer"
              >
                Create Account & Continue (Step 1 of 4) →
              </button>
            </form>
          </div>
        )}

        {/* ───────────────────────────────────────────────────────────── */}
        {/* STEP 2: SPOTIFY-STYLE PRIMARY CATEGORY CARDS ONLY */}
        {/* ───────────────────────────────────────────────────────────── */}
        {wizardStep === 2 && (
          <div>
            <div className="flex justify-between items-center mb-4 text-xs text-[#8a8278] font-medium px-1">
              <span>Primary Interest Categories</span>
              <span>{selectedCategoryIds.length} of {MAX_PRIMARY_CATEGORIES} selected</span>
            </div>

            {loadingTaxonomy ? (
              <div className="text-center py-12 text-[#2D5A3D] animate-pulse text-sm">
                Loading Spotify taxonomy cards...
              </div>
            ) : taxonomyError ? (
              <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs text-center">
                {taxonomyError.message}
              </div>
            ) : (
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
            )}

            <div className="flex items-center justify-between pt-4 border-t border-[#E2DBD0]">
              <button
                type="button"
                onClick={() => setWizardStep(1)}
                className="px-5 py-2.5 rounded-xl border border-[#E2DBD0] text-[#2C2C2C] text-xs font-medium hover:bg-white transition-colors cursor-pointer"
              >
                ← Back to Account
              </button>

              <button
                type="button"
                onClick={handleStep2Next}
                className="px-8 py-3 rounded-xl bg-[#2D5A3D] text-white text-xs font-semibold shadow-sm hover:bg-[#3d7a55] transition-colors cursor-pointer"
              >
                Continue to Secondary Hobbies ({selectedCategoryIds.length}/{MAX_PRIMARY_CATEGORIES}) →
              </button>
            </div>
          </div>
        )}

        {/* ───────────────────────────────────────────────────────────── */}
        {/* STEP 3: NETFLIX-STYLE SECONDARY SUBCATEGORY PILLS ONLY */}
        {/* ───────────────────────────────────────────────────────────── */}
        {wizardStep === 3 && (
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

            <div className="flex items-center justify-between pt-4 border-t border-[#E2DBD0]">
              <button
                type="button"
                onClick={() => setWizardStep(2)}
                className="px-5 py-2.5 rounded-xl border border-[#E2DBD0] text-[#2C2C2C] text-xs font-medium hover:bg-white transition-colors cursor-pointer"
              >
                ← Back to Primary Categories
              </button>

              <button
                type="button"
                disabled={isSavingHobbies}
                onClick={handleStep3Next}
                className="px-8 py-3 rounded-xl bg-[#2D5A3D] text-white text-xs font-semibold shadow-sm hover:bg-[#3d7a55] transition-colors disabled:opacity-50 cursor-pointer"
              >
                {isSavingHobbies ? 'Saving Preferences...' : 'Save & Continue to Profile Photo (Step 3 of 4) →'}
              </button>
            </div>
          </div>
        )}

        {/* ───────────────────────────────────────────────────────────── */}
        {/* STEP 4: ISOLATED PROFILE PHOTO UPLOAD (OPTIONAL WITH SKIP) */}
        {/* ───────────────────────────────────────────────────────────── */}
        {wizardStep === 4 && (
          <div className="bg-white border border-[#E2DBD0] rounded-3xl p-8 max-w-lg mx-auto shadow-xs text-center space-y-6">
            <div>
              <span className="text-[10px] font-bold text-[#C47B5A] uppercase tracking-wider">
                Step 4 of 4 • Optional Profile Picture
              </span>
              <h3 className="text-2xl font-serif font-semibold text-[#2D5A3D] mt-1">
                Add a Face to Your Profile
              </h3>
              <p className="text-xs text-[#8a8278] mt-1">
                Helps trusted members recognize you in local circles. You can also skip this step!
              </p>
            </div>

            {/* Avatar Preview & File Input */}
            <div className="flex flex-col items-center justify-center">
              <div
                onClick={() => fileInputRef.current?.click()}
                className="relative w-28 h-28 rounded-full bg-[#2D5A3D] text-white flex items-center justify-center font-bold text-3xl cursor-pointer overflow-hidden border-4 border-[#F4EEE2] shadow-md group transition-transform hover:scale-105"
              >
                {imagePreviewUrl ? (
                  <img src={imagePreviewUrl} alt="Avatar Preview" className="w-full h-full object-cover" />
                ) : (
                  <span>{currentUser?.username?.charAt(0).toUpperCase() || '📷'}</span>
                )}
                <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-white text-xs font-semibold">
                  Choose Photo
                </div>
              </div>

              <input
                type="file"
                ref={fileInputRef}
                onChange={handleAvatarFileSelect}
                accept="image/*"
                className="hidden"
              />

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="mt-3 text-xs text-[#2D5A3D] font-semibold hover:underline cursor-pointer"
              >
                {selectedImageFile ? `Selected: ${selectedImageFile.name}` : '+ Choose Image File'}
              </button>

              {photoSuccessMsg && (
                <p className="text-xs text-[#2D5A3D] font-medium mt-2">
                  {photoSuccessMsg}
                </p>
              )}
            </div>

            {/* Step 4 Action Buttons (Upload vs Skip for Now) */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-4 border-t border-[#E2DBD0]">
              <button
                type="button"
                onClick={handleSkipPhotoStep}
                className="w-full sm:w-auto px-6 py-2.5 rounded-xl border border-[#E2DBD0] text-[#5a5450] hover:bg-[#F4EEE2] text-xs font-semibold transition-colors cursor-pointer"
              >
                Skip for now
              </button>

              <button
                type="button"
                disabled={isUploadingPhoto}
                onClick={handleStep4UploadAndFinish}
                className="w-full sm:w-auto px-8 py-2.5 rounded-xl bg-[#2D5A3D] hover:bg-[#3d7a55] text-white text-xs font-semibold transition-colors shadow-xs disabled:opacity-50 cursor-pointer"
              >
                {isUploadingPhoto ? 'Uploading to Cloudinary...' : selectedImageFile ? 'Upload Photo & Finish' : 'Finish Onboarding'}
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
