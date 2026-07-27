import React, { useState } from 'react';
import { useQuery, useMutation } from '@apollo/client';
import { useNavigate } from 'react-router-dom';
import { GET_ALL_HOBBY_CATEGORIES, UPDATE_USER_HOBBIES } from '../graphql/operations';
import { useAuth } from '../context/AuthContext';

interface Hobby {
  id: string;
  name: string;
}

interface HobbyCategory {
  id: string;
  name: string;
  hobbies: Hobby[];
}

const MAX_PRIMARY_CATEGORIES = 3;
const MAX_SECONDARY_HOBBIES = 5;

export const OnboardingView: React.FC = () => {
  const navigate = useNavigate();
  const { refetchUser } = useAuth();

  const [step, setStep] = useState<1 | 2>(1);
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([]);
  const [selectedHobbyIds, setSelectedHobbyIds] = useState<string[]>([]);
  const [warningMsg, setWarningMsg] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string>('');

  const { data, loading, error } = useQuery<{ allHobbyCategories: HobbyCategory[] }>(
    GET_ALL_HOBBY_CATEGORIES
  );

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

  // Toggle Category selection (Step 1 - Max 3 Primary Categories)
  const toggleCategory = (catId: string) => {
    setWarningMsg('');
    setErrorMsg('');
    if (selectedCategoryIds.includes(catId)) {
      setSelectedCategoryIds((prev) => prev.filter((id) => id !== catId));
    } else {
      if (selectedCategoryIds.length >= MAX_PRIMARY_CATEGORIES) {
        setWarningMsg(`You can select a maximum of ${MAX_PRIMARY_CATEGORIES} Primary categories.`);
        return;
      }
      setSelectedCategoryIds((prev) => [...prev, catId]);
    }
  };

  // Toggle Sub-Hobby selection (Step 2 - Max 5 Secondary Hobbies)
  const toggleHobby = (hobbyId: string) => {
    setWarningMsg('');
    setErrorMsg('');
    if (selectedHobbyIds.includes(hobbyId)) {
      setSelectedHobbyIds((prev) => prev.filter((id) => id !== hobbyId));
    } else {
      if (selectedHobbyIds.length >= MAX_SECONDARY_HOBBIES) {
        setWarningMsg(`You can select a maximum of ${MAX_SECONDARY_HOBBIES} Secondary hobbies.`);
        return;
      }
      setSelectedHobbyIds((prev) => [...prev, hobbyId]);
    }
  };

  const handleNextStep = () => {
    if (selectedCategoryIds.length === 0) {
      setErrorMsg('Please select at least 1 category to personalize your feed.');
      return;
    }
    setWarningMsg('');
    setErrorMsg('');
    setStep(2);
  };

  const handleFinishOnboarding = () => {
    if (selectedHobbyIds.length === 0) {
      setErrorMsg('Please choose at least 1 secondary hobby so we can personalize your recommendations.');
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
          Loading categorized hobbies...
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

  // Active categories for Step 2
  const activeCategories = categories.filter((c) => selectedCategoryIds.includes(c.id));

  return (
    <div className="min-h-screen bg-[#F4EEE2] text-[#2C2C2C] flex flex-col items-center justify-between p-6 antialiased">
      <div className="max-w-3xl w-full my-auto">
        
        {/* Header */}
        <div className="text-center mb-8">
          <span className="text-xs font-semibold tracking-wider text-[#C47B5A] uppercase">
            Step {step} of 2 • Personal Affinity Setup
          </span>
          <h1 className="text-3xl md:text-4xl font-serif font-semibold tracking-tight text-[#2D5A3D] mt-2 lowercase">
            {step === 1 ? 'choose primary categories' : 'choose secondary hobbies'}
          </h1>
          <p className="text-sm text-[#8a8278] font-normal mt-2 max-w-md mx-auto">
            {step === 1
              ? `Select up to ${MAX_PRIMARY_CATEGORIES} primary interest categories for your community.`
              : `Select up to ${MAX_SECONDARY_HOBBIES} specific hobbies to customize your affinity match.`}
          </p>
        </div>

        {/* Warning Toast / Alert */}
        {warningMsg && (
          <div className="p-3 text-xs bg-amber-50 border border-amber-300 text-amber-800 rounded-xl mb-6 text-center max-w-md mx-auto shadow-xs animate-bounce">
            ⚠️ {warningMsg}
          </div>
        )}

        {/* Error Alert */}
        {errorMsg && (
          <div className="p-3 text-xs bg-rose-50 border border-rose-200 text-rose-700 rounded-xl mb-6 text-center max-w-md mx-auto">
            {errorMsg}
          </div>
        )}

        {/* Step 1: Primary Category Selection (Max 3) */}
        {step === 1 && (
          <div>
            <div className="flex justify-between items-center mb-3 text-xs text-[#8a8278] font-medium">
              <span>Primary Categories</span>
              <span>{selectedCategoryIds.length} of {MAX_PRIMARY_CATEGORIES} selected</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 mb-10">
              {categories.map((cat) => {
                const isSelected = selectedCategoryIds.includes(cat.id);
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => toggleCategory(cat.id)}
                    className={`p-4 rounded-2xl border text-left transition-all duration-200 flex flex-col justify-between h-28 cursor-pointer ${
                      isSelected
                        ? 'bg-[#2D5A3D] text-white border-[#2D5A3D] shadow-md scale-[1.02]'
                        : 'bg-[#F0EAE0]/90 text-[#2C2C2C] border-[#E2DBD0] hover:border-[#2D5A3D]/40'
                    }`}
                  >
                    <span className="text-sm font-medium leading-snug">{cat.name}</span>
                    <span className={`text-[11px] font-normal ${isSelected ? 'text-white/80' : 'text-[#8a8278]'}`}>
                      {cat.hobbies?.length || 0} topics
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Step 2: Specific Secondary Hobbies (Max 5) */}
        {step === 2 && (
          <div>
            <div className="flex justify-between items-center mb-3 text-xs text-[#8a8278] font-medium">
              <span>Secondary Hobbies</span>
              <span>{selectedHobbyIds.length} of {MAX_SECONDARY_HOBBIES} selected</span>
            </div>
            <div className="space-y-6 mb-10">
              {activeCategories.map((cat) => (
                <div key={cat.id} className="bg-[#F0EAE0]/70 border border-[#E2DBD0] rounded-2xl p-5">
                  <h3 className="text-sm font-semibold text-[#2D5A3D] mb-3">{cat.name}</h3>
                  <div className="flex flex-wrap gap-2">
                    {cat.hobbies.map((hb) => {
                      const isSelected = selectedHobbyIds.includes(hb.id);
                      return (
                        <button
                          key={hb.id}
                          type="button"
                          onClick={() => toggleHobby(hb.id)}
                          className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition-all duration-150 cursor-pointer ${
                            isSelected
                              ? 'bg-[#2D5A3D] text-white shadow-xs'
                              : 'bg-white text-[#2C2C2C] border border-[#E2DBD0] hover:border-[#2D5A3D]'
                          }`}
                        >
                          {isSelected ? '✓ ' : '+ '}{hb.name}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
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
              Continue to Secondary Hobbies ({selectedCategoryIds.length}/{MAX_PRIMARY_CATEGORIES}) →
            </button>
          ) : (
            <button
              type="button"
              disabled={isSaving}
              onClick={handleFinishOnboarding}
              className="px-8 py-3 rounded-xl bg-[#2D5A3D] text-white text-xs font-semibold shadow-sm hover:bg-[#3d7a55] transition-colors disabled:opacity-50 cursor-pointer"
            >
              {isSaving ? 'Saving Profile...' : `Finish Setup (${selectedHobbyIds.length}/${MAX_SECONDARY_HOBBIES} hobbies)`}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
