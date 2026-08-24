import React from 'react';
import { HobbyCategory, MAX_SUB_HOBBIES_PER_CATEGORY } from '../types';

interface Step3HobbiesProps {
  activeCategories: HobbyCategory[];
  selectedHobbyIds: string[];
  isSavingHobbies: boolean;
  isEditMode?: boolean;
  onToggleHobby: (category: HobbyCategory, hobbyId: string | number) => void;
  onNext: () => void;
  onSaveAndExit?: () => void;
  onBack: () => void;
}

export const Step3Hobbies: React.FC<Step3HobbiesProps> = ({
  activeCategories,
  selectedHobbyIds,
  isSavingHobbies,
  isEditMode = false,
  onToggleHobby,
  onNext,
  onSaveAndExit,
  onBack,
}) => {
  return (
    <div>
      <div className="flex justify-between items-center mb-4 text-xs text-[#8a8278] font-medium px-1">
        <span className="font-semibold uppercase tracking-wider text-charcoal">
          Sub-categories (Max {MAX_SUB_HOBBIES_PER_CATEGORY} per category)
        </span>
        <span>{selectedHobbyIds.length} selected</span>
      </div>

      {activeCategories.length === 0 ? (
        <div className="bg-white border border-dashed border-[#E2DBD0] rounded-2xl p-8 text-center text-xs text-[#8a8278] mb-8">
          No categories selected.{' '}
          <button
            type="button"
            onClick={onBack}
            className="text-[#2D5A3D] font-bold underline cursor-pointer"
          >
            Go back and pick main categories
          </button>
        </div>
      ) : (
        <div className="space-y-6 mb-8">
          {activeCategories.map((cat) => {
            const categoryHobbyIds = cat.hobbies.map((h) => String(h.id));
            const selectedInThisCategory = selectedHobbyIds.filter((id) =>
              categoryHobbyIds.includes(id)
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
                    {selectedInThisCategory} / {MAX_SUB_HOBBIES_PER_CATEGORY} selected
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
                        onClick={() => onToggleHobby(cat, hbIdStr)}
                        className={`px-4 py-2 rounded-full text-xs font-semibold transition-all duration-150 transform cursor-pointer active:scale-95 ${
                          isSelected
                            ? 'bg-[#2D5A3D] text-white shadow-xs ring-2 ring-[#2D5A3D]/40'
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
      )}

      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-[#E2DBD0]">
        <button
          type="button"
          onClick={onBack}
          className="w-full sm:w-auto px-5 py-2.5 rounded-xl border border-[#E2DBD0] text-[#2C2C2C] text-xs font-medium hover:bg-white transition-colors cursor-pointer"
        >
          ← Back to Main Categories
        </button>

        <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
          {isEditMode && onSaveAndExit && (
            <button
              type="button"
              disabled={isSavingHobbies || selectedHobbyIds.length === 0}
              onClick={onSaveAndExit}
              className="w-full sm:w-auto px-6 py-3 rounded-xl border border-[#2D5A3D] text-[#2D5A3D] hover:bg-[#eaf3ed] text-xs font-semibold transition-colors disabled:opacity-50 cursor-pointer"
            >
              {isSavingHobbies ? 'Saving...' : '✓ Save & Return to Profile'}
            </button>
          )}

          <button
            type="button"
            disabled={isSavingHobbies || selectedHobbyIds.length === 0}
            onClick={onNext}
            className="w-full sm:w-auto px-8 py-3 rounded-xl bg-[#2D5A3D] text-white text-xs font-semibold shadow-sm hover:bg-[#3d7a55] transition-colors disabled:opacity-50 cursor-pointer"
          >
            {isSavingHobbies
              ? 'Saving Sub-categories...'
              : `Save & Continue to Profile Photo (${selectedHobbyIds.length} selected) →`}
          </button>
        </div>
      </div>
    </div>
  );
};
