import React from 'react';
import { HobbyCategory, CATEGORY_GRADIENTS, MAX_PRIMARY_CATEGORIES } from '../types';

interface Step2CategoriesProps {
  categories: HobbyCategory[];
  selectedCategoryIds: string[];
  loadingTaxonomy: boolean;
  taxonomyError: any;
  token: string | null;
  isEditMode?: boolean;
  onToggleCategory: (catId: string | number) => void;
  onNext: () => void;
  onBack: () => void;
}

export const Step2Categories: React.FC<Step2CategoriesProps> = ({
  categories,
  selectedCategoryIds,
  loadingTaxonomy,
  taxonomyError,
  token,
  isEditMode = false,
  onToggleCategory,
  onNext,
  onBack,
}) => {
  return (
    <div>
      <div className="flex justify-between items-center mb-4 text-xs text-[#8a8278] font-medium px-1">
        <span className="font-semibold uppercase tracking-wider text-charcoal">
          Main Categories ({selectedCategoryIds.length}/{MAX_PRIMARY_CATEGORIES} selected)
        </span>
        <span>Select up to {MAX_PRIMARY_CATEGORIES}</span>
      </div>

      {loadingTaxonomy ? (
        <div className="text-center py-12 text-[#2D5A3D] animate-pulse text-sm">
          Loading categories...
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
                onClick={() => onToggleCategory(catIdStr)}
                className={`relative rounded-3xl p-5 cursor-pointer transition-all duration-200 transform flex flex-col justify-between h-36 overflow-hidden shadow-xs hover:scale-[1.02] active:scale-95 ${
                  isSelected
                    ? 'bg-gradient-to-br from-[#2D5A3D] to-slate-900 text-white ring-4 ring-[#2D5A3D]/40 shadow-lg'
                    : `bg-gradient-to-br ${gradientClass} text-white/90 opacity-85 hover:opacity-100`
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
        {isEditMode ? (
          <button
            type="button"
            onClick={onBack}
            className="px-5 py-2.5 rounded-xl border border-[#E2DBD0] text-[#2C2C2C] text-xs font-medium hover:bg-white transition-colors cursor-pointer"
          >
            ← Back to Profile
          </button>
        ) : !token ? (
          <button
            type="button"
            onClick={onBack}
            className="px-5 py-2.5 rounded-xl border border-[#E2DBD0] text-[#2C2C2C] text-xs font-medium hover:bg-white transition-colors cursor-pointer"
          >
            ← Back to Account
          </button>
        ) : <div />}

        <div className="ml-auto">
          <button
            type="button"
            onClick={onNext}
            className="px-8 py-3 rounded-xl bg-[#2D5A3D] text-white text-xs font-semibold shadow-sm hover:bg-[#3d7a55] transition-colors cursor-pointer"
          >
            Continue to Sub-categories ({selectedCategoryIds.length}/{MAX_PRIMARY_CATEGORIES}) →
          </button>
        </div>
      </div>
    </div>
  );
};
