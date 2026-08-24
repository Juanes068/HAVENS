import React, { useState, useEffect, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@apollo/client';
import { useAuth } from '../../context/AuthContext';
import { GET_ALL_HOBBY_CATEGORIES, UPDATE_USER_HOBBIES } from '../../graphql/operations';
import {
  HobbyCategory,
  MAX_PRIMARY_CATEGORIES,
  MAX_SUB_HOBBIES_PER_CATEGORY,
} from './types';
import { Step1Account } from './components/Step1Account';
import { Step2Categories } from './components/Step2Categories';
import { Step3Hobbies } from './components/Step3Hobbies';
import { Step4ProfilePhoto } from './components/Step4ProfilePhoto';

export const OnboardingView: React.FC = () => {
  const { token, user: currentUser, refetchUser } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const isEditMode = Boolean(
    location.state?.editMode ||
    new URLSearchParams(location.search).get('mode') === 'edit' ||
    (currentUser?.hobbies && currentUser.hobbies.length > 0)
  );

  // Wizard Step (1: Account, 2: Main Categories, 3: Sub-categories, 4: Photo)
  const [wizardStep, setWizardStep] = useState<1 | 2 | 3 | 4>(() => (token ? 2 : 1));

  // Selection States
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([]);
  const [selectedHobbyIds, setSelectedHobbyIds] = useState<string[]>([]);

  // Alerts
  const [warningMsg, setWarningMsg] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string>('');

  // GraphQL
  const { data, loading: loadingTaxonomy, error: taxonomyError } = useQuery<{
    allHobbyCategories: HobbyCategory[];
  }>(GET_ALL_HOBBY_CATEGORIES);

  const [updateHobbies, { loading: isSavingHobbies }] = useMutation(UPDATE_USER_HOBBIES);

  const categories = useMemo(() => data?.allHobbyCategories || [], [data]);
  const activeCategories = useMemo(
    () => categories.filter((c) => selectedCategoryIds.includes(String(c.id))),
    [categories, selectedCategoryIds]
  );

  // Sync step with token availability
  useEffect(() => {
    if (token && wizardStep === 1) {
      setWizardStep(2);
    }
  }, [token, wizardStep]);

  // Robustly pre-populate existing user categories and sub-hobbies from taxonomy
  useEffect(() => {
    if (currentUser?.hobbies && currentUser.hobbies.length > 0) {
      const existingHobbyIds = currentUser.hobbies.map((h) => String(h.id));
      setSelectedHobbyIds((prev) => (prev.length === 0 ? existingHobbyIds : prev));

      const catIdsFromUser = currentUser.hobbies
        .map((h) => (h.category?.id ? String(h.category.id) : null))
        .filter(Boolean) as string[];

      const catIdsFromTaxonomy = categories
        .filter((cat) => cat.hobbies?.some((hb) => existingHobbyIds.includes(String(hb.id))))
        .map((cat) => String(cat.id));

      const allFoundCatIds = Array.from(new Set([...catIdsFromUser, ...catIdsFromTaxonomy]));
      setSelectedCategoryIds((prev) =>
        prev.length === 0 && allFoundCatIds.length > 0 ? allFoundCatIds : prev
      );
    }
  }, [currentUser, categories]);

  // Handlers
  const handleToggleCategory = (catIdRaw: string | number) => {
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
        setWarningMsg(`You can select a maximum of ${MAX_PRIMARY_CATEGORIES} main categories.`);
        return;
      }
      setSelectedCategoryIds((prev) => [...prev, catId]);
    }
  };

  const handleStep2Next = () => {
    if (selectedCategoryIds.length === 0) {
      setErrorMsg('Please select at least 1 main category to continue.');
      return;
    }
    setWarningMsg('');
    setErrorMsg('');
    setWizardStep(3);
  };

  const handleToggleHobby = (category: HobbyCategory, hobbyIdRaw: string | number) => {
    const hobbyId = String(hobbyIdRaw);
    setWarningMsg('');
    setErrorMsg('');

    if (selectedHobbyIds.includes(hobbyId)) {
      setSelectedHobbyIds((prev) => prev.filter((id) => id !== hobbyId));
    } else {
      const categoryHobbyIds = category.hobbies.map((h) => String(h.id));
      const countInThisCategory = selectedHobbyIds.filter((id) =>
        categoryHobbyIds.includes(id)
      ).length;

      if (countInThisCategory >= MAX_SUB_HOBBIES_PER_CATEGORY) {
        setWarningMsg(
          `You can select a maximum of ${MAX_SUB_HOBBIES_PER_CATEGORY} sub-hobbies for "${category.name}".`
        );
        return;
      }

      setSelectedHobbyIds((prev) => [...prev, hobbyId]);
    }
  };

  const handleSaveHobbies = async (goToPhoto: boolean = true) => {
    if (selectedHobbyIds.length === 0) {
      setErrorMsg('Please select at least 1 sub-category tag to personalize your circles.');
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
        await refetchUser().catch((err) => console.warn('refetchUser notice:', err));
        if (goToPhoto) {
          setWizardStep(4);
        } else {
          navigate('/profile');
        }
      } else {
        setErrorMsg(res?.data?.updateUserHobbies?.message || 'Failed to save sub-categories.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Error saving sub-categories.');
    }
  };

  return (
    <div className="min-h-screen bg-[#F4EEE2] text-[#2C2C2C] flex flex-col items-center justify-between p-6 antialiased">
      <div className="max-w-4xl w-full my-auto space-y-8">
        {/* Wizard Progress Header */}
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
            {isEditMode
              ? `Profile Settings • Edit Hobbies Taxonomy (Step ${wizardStep === 2 ? '1' : wizardStep === 3 ? '2' : '3'} of 3)`
              : token
              ? `Step ${wizardStep - 1} of 3 • Profile Setup`
              : `Step ${wizardStep} of 4 • Havens Onboarding`}
          </span>

          <h1 className="text-3xl md:text-4xl font-serif font-semibold tracking-tight text-[#2D5A3D] mt-1 lowercase">
            {wizardStep === 1 && 'create your account'}
            {wizardStep === 2 && 'choose main categories'}
            {wizardStep === 3 && 'select sub-categories'}
            {wizardStep === 4 && 'upload profile photo'}
          </h1>
          <p className="text-sm text-[#8a8278] font-normal mt-1.5 max-w-lg mx-auto">
            {wizardStep === 1 && 'Enter your details, 6-character invitation code, and location.'}
            {wizardStep === 2 && `Select up to ${MAX_PRIMARY_CATEGORIES} main categories that interest you.`}
            {wizardStep === 3 && `Select up to ${MAX_SUB_HOBBIES_PER_CATEGORY} sub-hobbies per category.`}
            {wizardStep === 4 && 'Add an optional profile picture or finish to enter your dashboard.'}
          </p>
        </div>

        {/* Global Warning Alert */}
        {warningMsg && (
          <div className="p-3 text-xs bg-amber-50 border border-amber-300 text-amber-900 rounded-xl text-center max-w-lg mx-auto shadow-xs font-medium">
            ⚠️ {warningMsg}
          </div>
        )}

        {/* Global Error Alert */}
        {errorMsg && (
          <div className="p-3 text-xs bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-center max-w-lg mx-auto font-medium">
            {errorMsg}
          </div>
        )}

        {/* STEP 1: ACCOUNT CREATION */}
        {wizardStep === 1 && (
          <Step1Account
            onSuccess={() => {
              setErrorMsg('');
              setWizardStep(2);
            }}
            onError={(msg) => setErrorMsg(msg)}
          />
        )}

        {/* STEP 2: MAIN CATEGORIES */}
        {wizardStep === 2 && (
          <Step2Categories
            categories={categories}
            selectedCategoryIds={selectedCategoryIds}
            loadingTaxonomy={loadingTaxonomy}
            taxonomyError={taxonomyError}
            token={token}
            isEditMode={isEditMode}
            onToggleCategory={handleToggleCategory}
            onNext={handleStep2Next}
            onBack={() => {
              if (isEditMode) {
                navigate('/profile');
              } else {
                setWizardStep(1);
              }
            }}
          />
        )}

        {/* STEP 3: SUB-CATEGORIES */}
        {wizardStep === 3 && (
          <Step3Hobbies
            activeCategories={activeCategories}
            selectedHobbyIds={selectedHobbyIds}
            isSavingHobbies={isSavingHobbies}
            isEditMode={isEditMode}
            onToggleHobby={handleToggleHobby}
            onNext={() => handleSaveHobbies(true)}
            onSaveAndExit={() => handleSaveHobbies(false)}
            onBack={() => setWizardStep(2)}
          />
        )}

        {/* STEP 4: PROFILE PHOTO */}
        {wizardStep === 4 && (
          <Step4ProfilePhoto
            currentUser={currentUser}
            refetchUser={refetchUser}
            isEditMode={isEditMode}
            onBack={() => setWizardStep(3)}
          />
        )}
      </div>
    </div>
  );
};

export default OnboardingView;
