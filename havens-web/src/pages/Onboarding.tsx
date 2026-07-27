import React, { useState } from 'react';
import { useQuery, useMutation } from '@apollo/client';
import { useNavigate } from 'react-router-dom';
import { GET_ALL_HOBBY_CATEGORIES, UPDATE_USER_HOBBIES } from '../graphql/operations';
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

export const OnboardingView: React.FC = () => {
  const navigate = useNavigate();
  const { refetchUser } = useAuth();

  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([]);
  const [selectedHobbyIds, setSelectedHobbyIds] = useState<string[]>([]);
  const [expandedCategoryIds, setExpandedCategoryIds] = useState<string[]>([]);
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

  // Toggle Category Selection (Max 3 Primary Categories)
  const toggleCategory = (catIdRaw: string | number) => {
    const catId = String(catIdRaw);
    setWarningMsg('');
    setErrorMsg('');

    if (selectedCategoryIds.includes(catId)) {
      // Unselect category and its associated sub-hobbies
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
      // Auto-expand newly selected category
      if (!expandedCategoryIds.includes(catId)) {
        setExpandedCategoryIds((prev) => [...prev, catId]);
      }
    }
  };

  // Toggle Accordion Expansion for Category Tree
  const toggleExpand = (catIdRaw: string | number) => {
    const catId = String(catIdRaw);
    setExpandedCategoryIds((prev) =>
      prev.includes(catId) ? prev.filter((id) => id !== catId) : [...prev, catId]
    );
  };

  // Toggle Sub-Hobby selection (Max 5 Sub-Hobbies PER Primary Category)
  const toggleHobby = (categoryName: string, categoryHobbyIds: string[], hobbyIdRaw: string | number) => {
    const hobbyId = String(hobbyIdRaw);
    setWarningMsg('');
    setErrorMsg('');

    if (selectedHobbyIds.includes(hobbyId)) {
      setSelectedHobbyIds((prev) => prev.filter((id) => id !== hobbyId));
    } else {
      // Count how many selected sub-hobbies belong to this specific category
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

  const handleFinishOnboarding = () => {
    if (selectedCategoryIds.length === 0) {
      setErrorMsg('Please select at least 1 Primary Category to continue.');
      return;
    }
    if (selectedHobbyIds.length === 0) {
      setErrorMsg('Please select at least 1 Subcategory under your chosen categories.');
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
          Loading categorized hobbies tree...
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

  return (
    <div className="min-h-screen bg-[#F4EEE2] text-[#2C2C2C] flex flex-col items-center justify-between p-6 antialiased">
      <div className="max-w-3xl w-full my-auto">
        
        {/* Header */}
        <div className="text-center mb-8">
          <span className="text-xs font-semibold tracking-wider text-[#C47B5A] uppercase">
            Personal Interest Tree • Affinity Setup
          </span>
          <h1 className="text-3xl md:text-4xl font-serif font-semibold tracking-tight text-[#2D5A3D] mt-2 lowercase">
            build your digital footprint
          </h1>
          <p className="text-sm text-[#8a8278] font-normal mt-2 max-w-lg mx-auto">
            Select up to <strong className="text-charcoal">{MAX_PRIMARY_CATEGORIES} Primary Categories</strong>. 
            For each selected category, pick up to <strong className="text-charcoal">{MAX_SUB_HOBBIES_PER_CATEGORY} Subcategories</strong> (up to 15 subcategories total).
          </p>
        </div>

        {/* Warning Alert Toast */}
        {warningMsg && (
          <div className="p-3.5 text-xs bg-amber-50 border border-amber-300 text-amber-900 rounded-xl mb-6 text-center max-w-lg mx-auto shadow-xs font-medium animate-bounce">
            ⚠️ {warningMsg}
          </div>
        )}

        {/* Error Alert */}
        {errorMsg && (
          <div className="p-3.5 text-xs bg-rose-50 border border-rose-200 text-rose-700 rounded-xl mb-6 text-center max-w-lg mx-auto font-medium">
            {errorMsg}
          </div>
        )}

        {/* Progress Counter Summary */}
        <div className="flex items-center justify-between bg-[#F0EAE0] border border-[#E2DBD0] rounded-2xl px-5 py-3 mb-6 text-xs text-[#5a5450] font-medium">
          <div>
            Primary Categories: <span className="text-[#2D5A3D] font-bold">{selectedCategoryIds.length} / {MAX_PRIMARY_CATEGORIES}</span>
          </div>
          <div>
            Subcategories Selected: <span className="text-[#2D5A3D] font-bold">{selectedHobbyIds.length} / {selectedCategoryIds.length * MAX_SUB_HOBBIES_PER_CATEGORY}</span>
          </div>
        </div>

        {/* Expandable Hobbies Tree Container */}
        <div className="space-y-4 mb-10 max-h-[55vh] overflow-y-auto pr-1">
          {categories.map((cat) => {
            const catIdStr = String(cat.id);
            const isCategorySelected = selectedCategoryIds.includes(catIdStr);
            const isExpanded = expandedCategoryIds.includes(catIdStr);

            const categoryHobbyIdStrs = cat.hobbies.map((h) => String(h.id));
            const selectedInThisCategoryCount = selectedHobbyIds.filter((id) =>
              categoryHobbyIdStrs.includes(id)
            ).length;

            return (
              <div
                key={catIdStr}
                className={`rounded-2xl border transition-all duration-200 overflow-hidden ${
                  isCategorySelected
                    ? 'bg-white border-[#2D5A3D] shadow-sm'
                    : 'bg-[#F0EAE0]/70 border-[#E2DBD0] hover:border-[#2D5A3D]/40'
                }`}
              >
                {/* Category Card Header */}
                <div className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={isCategorySelected}
                      onChange={() => toggleCategory(catIdStr)}
                      className="w-4 h-4 accent-[#2D5A3D] rounded cursor-pointer"
                    />
                    <div>
                      <h3
                        onClick={() => toggleCategory(catIdStr)}
                        className="text-sm font-semibold text-charcoal cursor-pointer hover:text-[#2D5A3D]"
                      >
                        {cat.name}
                      </h3>
                      <p className="text-[11px] text-[#8a8278]">
                        {cat.hobbies.length} subcategories available
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    {isCategorySelected && (
                      <span className="text-[11px] font-semibold bg-[#eaf3ed] text-[#2D5A3D] px-2.5 py-1 rounded-full border border-[#7aaa8a]/30">
                        {selectedInThisCategoryCount} / {MAX_SUB_HOBBIES_PER_CATEGORY} selected
                      </span>
                    )}

                    <button
                      type="button"
                      onClick={() => toggleExpand(catIdStr)}
                      className="px-3 py-1.5 rounded-lg border border-[#E2DBD0] text-xs font-medium text-[#5a5450] hover:bg-[#F4EEE2] transition-colors cursor-pointer"
                    >
                      {isExpanded ? '▲ Collapse' : '▼ Expand Subcategories'}
                    </button>
                  </div>
                </div>

                {/* Expanded Subcategories Chips Tree */}
                {isExpanded && (
                  <div className="px-5 pb-5 pt-2 border-t border-[#E2DBD0]/60 bg-[#F4EEE2]/40">
                    <div className="flex flex-wrap gap-2">
                      {cat.hobbies.map((hb) => {
                        const hbIdStr = String(hb.id);
                        const isSubSelected = selectedHobbyIds.includes(hbIdStr);

                        return (
                          <button
                            key={hbIdStr}
                            type="button"
                            onClick={() => {
                              if (!isCategorySelected) {
                                toggleCategory(catIdStr);
                              }
                              toggleHobby(cat.name, categoryHobbyIdStrs, hbIdStr);
                            }}
                            className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition-all cursor-pointer ${
                              isSubSelected
                                ? 'bg-[#2D5A3D] text-white shadow-xs scale-105'
                                : 'bg-white text-[#2C2C2C] border border-[#E2DBD0] hover:border-[#2D5A3D]'
                            }`}
                          >
                            {isSubSelected ? '✓ ' : '+ '}{hb.name}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Footer Navigation Button */}
        <div className="flex items-center justify-between pt-4 border-t border-[#E2DBD0]">
          <div className="text-xs text-[#8a8278]">
            Need help? You can update your digital footprint anytime in your Profile.
          </div>

          <button
            type="button"
            disabled={isSaving || selectedCategoryIds.length === 0}
            onClick={handleFinishOnboarding}
            className="px-8 py-3 rounded-xl bg-[#2D5A3D] text-white text-xs font-semibold shadow-sm hover:bg-[#3d7a55] transition-colors disabled:opacity-50 cursor-pointer"
          >
            {isSaving
              ? 'Saving Profile...'
              : `Complete Onboarding (${selectedHobbyIds.length} subcategories selected)`}
          </button>
        </div>
      </div>
    </div>
  );
};
