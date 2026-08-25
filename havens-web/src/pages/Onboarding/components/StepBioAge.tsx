import React, { useState, useMemo } from 'react';
import { useMutation } from '@apollo/client';
import { UPDATE_USER_PROFILE } from '../../../graphql/operations';
import { Sparkles, Calendar, AlertCircle, ArrowLeft, ArrowRight } from 'lucide-react';
import { HavensDatePicker } from '../../../components/ui/HavensDatePicker';

interface StepBioAgeProps {
  currentUser: any;
  refetchUser: () => Promise<any>;
  isEditMode?: boolean;
  onNext: () => void;
  onBack: () => void;
}

export const StepBioAge: React.FC<StepBioAgeProps> = ({
  currentUser,
  refetchUser,
  isEditMode = false,
  onNext,
  onBack,
}) => {
  const [bio, setBio] = useState<string>(currentUser?.bio || '');
  const [dateOfBirth, setDateOfBirth] = useState<string>(currentUser?.dateOfBirth || '');
  const [errorMessage, setErrorMessage] = useState<string>('');

  const [updateProfile, { loading: isSaving }] = useMutation(UPDATE_USER_PROFILE);

  // Dynamic Age Calculation
  const calculatedAge = useMemo(() => {
    if (!dateOfBirth) return null;
    const dob = new Date(dateOfBirth);
    if (isNaN(dob.getTime())) return null;

    const today = new Date();
    let age = today.getFullYear() - dob.getFullYear();
    const m = today.getMonth() - dob.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) {
      age--;
    }
    return age;
  }, [dateOfBirth]);

  const isUnderage = calculatedAge !== null && calculatedAge < 14;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!dateOfBirth) {
      setErrorMessage('Please enter your date of birth to continue.');
      return;
    }

    if (calculatedAge === null || isNaN(calculatedAge)) {
      setErrorMessage('Please enter a valid date of birth.');
      return;
    }

    if (calculatedAge < 14) {
      setErrorMessage('Age validation failed: You must be at least 14 years old to join Havens.');
      return;
    }

    if (!bio.trim()) {
      setErrorMessage('Please write a short bio (at least a sentence) to introduce yourself.');
      return;
    }

    try {
      const res = await updateProfile({
        variables: {
          bio: bio.trim(),
          dateOfBirth: dateOfBirth,
        },
      });

      if (res?.data?.updateUserProfile?.success) {
        await refetchUser().catch((err) => console.warn('refetch notice:', err));
        onNext();
      } else {
        setErrorMessage(res?.data?.updateUserProfile?.message || 'Failed to update bio and age.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'An error occurred while saving your details.');
    }
  };

  // Compute maximum allowed DOB date for HTML input (14 years ago from today)
  const maxDobDate = useMemo(() => {
    const d = new Date();
    d.setFullYear(d.getFullYear() - 14);
    return d.toISOString().split('T')[0];
  }, []);

  return (
    <div className="w-full max-w-xl mx-auto bg-white border border-[#E2DBD0] rounded-3xl p-6 sm:p-8 shadow-xs space-y-6">
      <div className="space-y-1">
        <div className="flex items-center gap-2 text-[#2D5A3D]">
          <Sparkles className="w-5 h-5" />
          <h2 className="text-xl font-bold font-serif">About You & Age Verification</h2>
        </div>
        <p className="text-xs text-[#8a8278] leading-relaxed">
          Tell future connections a little about yourself and verify your age. Havens is a safe, community-driven space requiring members to be at least 14 years old.
        </p>
      </div>

      {errorMessage && (
        <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium flex items-start gap-2.5">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
          <span className="leading-snug">{errorMessage}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Date of Birth Input with Modern HavensDatePicker */}
        <div className="space-y-2">
          <label className="block text-xs font-bold uppercase tracking-wider text-stone-700">
            Date of Birth <span className="text-rose-500">*</span>
          </label>
          <HavensDatePicker
            value={dateOfBirth}
            maxDate={maxDobDate}
            placeholder="Select your birth date"
            error={isUnderage}
            onChange={(dateStr) => {
              setDateOfBirth(dateStr);
              setErrorMessage('');
            }}
          />

          {/* Age Indicator Banner */}
          {calculatedAge !== null && !isNaN(calculatedAge) && (
            <div
              className={`p-3 rounded-xl text-xs font-semibold flex items-center justify-between transition-all ${
                isUnderage
                  ? 'bg-rose-50 text-rose-700 border border-rose-200'
                  : 'bg-[#eaf3ed] text-[#2D5A3D] border border-[#7aaa8a]/30'
              }`}
            >
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 shrink-0" />
                <span>
                  Calculated Age: <strong className="text-sm">{calculatedAge}</strong> years old
                </span>
              </div>
              {isUnderage ? (
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-rose-200 text-rose-900">
                  Under 14 (Not eligible)
                </span>
              ) : (
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-[#2D5A3D] text-white">
                  ✓ Eligible (14+)
                </span>
              )}
            </div>
          )}
        </div>

        {/* Bio Textarea */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="block text-xs font-bold uppercase tracking-wider text-stone-700">
              Personal Bio <span className="text-rose-500">*</span>
            </label>
            <span className="text-[11px] text-[#8a8278]">
              {bio.length} / 500 characters
            </span>
          </div>

          <div className="relative">
            <textarea
              value={bio}
              onChange={(e) => {
                if (e.target.value.length <= 500) {
                  setBio(e.target.value);
                  setErrorMessage('');
                }
              }}
              rows={4}
              placeholder="e.g. Graphic designer and avid weekend trail runner. Looking to explore local bouldering spots, board game nights, and specialty coffee spots in Vancouver!"
              required
              className="w-full px-4 py-3 rounded-2xl border border-[#E2DBD0] text-sm text-stone-900 bg-white placeholder:text-stone-400 focus:outline-none focus:border-[#2D5A3D] transition-all shadow-2xs leading-relaxed"
            />
          </div>
          <p className="text-[11px] text-[#8a8278]">
            Share your favorite weekend routines, creative passions, or what you're hoping to explore with local circles.
          </p>
        </div>

        {/* Navigation Buttons */}
        <div className="flex items-center justify-between pt-4 border-t border-[#E2DBD0]/60 gap-3">
          <button
            type="button"
            onClick={onBack}
            className="px-5 py-2.5 rounded-xl border border-[#E2DBD0] text-stone-600 hover:text-stone-900 hover:bg-[#FAF8F5] text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back</span>
          </button>

          <button
            type="submit"
            disabled={isSaving || isUnderage || !dateOfBirth || !bio.trim()}
            className="px-6 py-2.5 rounded-xl bg-[#2D5A3D] hover:bg-[#3d7a55] text-white text-xs font-bold transition-all shadow-2xs hover:shadow-xs flex items-center gap-2 cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed"
          >
            {isSaving ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Saving...</span>
              </>
            ) : (
              <>
                <span>Continue</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default StepBioAge;
