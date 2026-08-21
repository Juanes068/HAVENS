import React, { useState } from 'react';
import { useQuery, useMutation } from '@apollo/client';
import {
  GET_ALL_HOBBY_CATEGORIES,
  GENERATE_CLOUDINARY_SIGNATURE,
  CREATE_COMMUNITY,
} from '../../../graphql/operations';

interface CreateCircleWizardProps {
  isOpen: boolean;
  onClose: () => void;
  onCircleCreated: (message: string) => void;
}

const CLOUDINARY_CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || 'g8jffrmx';

export const CreateCircleWizard: React.FC<CreateCircleWizardProps> = ({
  isOpen,
  onClose,
  onCircleCreated,
}) => {
  const [currentStep, setCurrentStep] = useState<number>(1);

  // Form State
  const [name, setName] = useState('');
  const [locationName, setLocationName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedHobbyIds, setSelectedHobbyIds] = useState<number[]>([]);
  const [selectedImageFile, setSelectedImageFile] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string>('');

  // UI state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // GraphQL
  const { data: taxonomyData, loading: taxonomyLoading } = useQuery(GET_ALL_HOBBY_CATEGORIES);
  const [generateCloudinarySignature] = useMutation(GENERATE_CLOUDINARY_SIGNATURE);
  const [createCommunityMutation] = useMutation(CREATE_COMMUNITY);

  if (!isOpen) return null;

  const categories = taxonomyData?.allHobbyCategories || [];

  const handleToggleHobby = (hobbyId: number) => {
    setErrorMessage('');
    if (selectedHobbyIds.includes(hobbyId)) {
      setSelectedHobbyIds((prev) => prev.filter((id) => id !== hobbyId));
    } else {
      if (selectedHobbyIds.length >= 5) {
        setErrorMessage('You can select a maximum of 5 hobbies for this circle.');
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
      setErrorMessage('');
    }
  };

  const validateStep1 = (): boolean => {
    if (!name.trim()) {
      setErrorMessage('Please provide a name for your circle.');
      return false;
    }
    if (name.trim().length < 3) {
      setErrorMessage('Circle name must be at least 3 characters.');
      return false;
    }
    if (!description.trim()) {
      setErrorMessage('Please describe what your circle is about.');
      return false;
    }
    setErrorMessage('');
    return true;
  };

  const validateStep2 = (): boolean => {
    if (selectedHobbyIds.length === 0) {
      setErrorMessage('Please select at least 1 hobby tag to help members discover this circle.');
      return false;
    }
    setErrorMessage('');
    return true;
  };

  const handleNext = () => {
    if (currentStep === 1 && validateStep1()) {
      setCurrentStep(2);
    } else if (currentStep === 2 && validateStep2()) {
      setCurrentStep(3);
    }
  };

  const handleBack = () => {
    setErrorMessage('');
    if (currentStep > 1) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  const handleCreateCircle = async () => {
    setErrorMessage('');
    setIsSubmitting(true);

    try {
      let finalImageUrl = '';

      // Upload image to Cloudinary if selected
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
          console.warn('Cloudinary upload issue, proceeding with circle creation:', uploadErr);
        }
      }

      // Execute CreateCommunity mutation
      const res = await createCommunityMutation({
        variables: {
          name: name.trim(),
          description: description.trim(),
          locationName: locationName.trim() || 'Vancouver, BC',
          imageUrl: finalImageUrl,
          hobbyIds: selectedHobbyIds,
        },
      });

      const data = res?.data?.createCommunity;
      if (data?.success) {
        onCircleCreated(data.message || `Circle "${name}" created successfully!`);
        onClose();
      } else {
        setErrorMessage(data?.message || 'Failed to create circle. Please try again.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'An unexpected error occurred while creating the circle.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white border border-[#E2DBD0] rounded-3xl p-6 md:p-8 max-w-xl w-full shadow-2xl space-y-6 animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] flex flex-col justify-between overflow-y-auto">
        
        {/* Modal Header & Step Indicator */}
        <div>
          <div className="flex items-center justify-between pb-3 border-b border-[#E2DBD0]">
            <div>
              <span className="text-[10px] font-bold text-[#C47B5A] uppercase tracking-wider">
                Micro-Community Creator
              </span>
              <h2 className="text-xl font-serif font-bold text-[#2D5A3D]">Create a Circle</h2>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="text-xs font-bold text-[#8a8278] hover:text-charcoal bg-[#F4EEE2] p-2 rounded-full cursor-pointer transition-colors"
            >
              ✕
            </button>
          </div>

          {/* Stepper Progress Bar */}
          <div className="grid grid-cols-3 gap-2 mt-4">
            {[
              { step: 1, title: '1. Basic Info' },
              { step: 2, title: '2. Interests' },
              { step: 3, title: '3. Cover Image' },
            ].map((item) => {
              const isActive = currentStep === item.step;
              const isPast = currentStep > item.step;
              return (
                <div key={item.step} className="space-y-1">
                  <div
                    className={`h-1.5 rounded-full transition-all duration-300 ${
                      isActive
                        ? 'bg-[#2D5A3D]'
                        : isPast
                        ? 'bg-[#2D5A3D]/70'
                        : 'bg-[#E2DBD0]'
                    }`}
                  />
                  <p
                    className={`text-[11px] font-semibold truncate ${
                      isActive ? 'text-[#2D5A3D]' : 'text-[#8a8278]'
                    }`}
                  >
                    {item.title}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <div className="p-3 text-xs bg-rose-50 border border-rose-200 text-rose-700 rounded-xl flex items-center justify-between">
            <span>{errorMessage}</span>
            <button
              type="button"
              onClick={() => setErrorMessage('')}
              className="font-bold cursor-pointer text-rose-500 hover:text-rose-700 ml-2"
            >
              ✕
            </button>
          </div>
        )}

        {/* ─── STEP 1: INFO ─── */}
        {currentStep === 1 && (
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-charcoal mb-1">
                Circle Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Kitsilano Trail Runners"
                className="w-full px-4 py-2.5 rounded-xl bg-[#F4EEE2]/60 border border-[#E2DBD0] text-xs text-[#2C2C2C] focus:outline-none focus:border-[#2D5A3D] transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-charcoal mb-1">
                Neighbourhood / Location
              </label>
              <input
                type="text"
                value={locationName}
                onChange={(e) => setLocationName(e.target.value)}
                placeholder="e.g. Kitsilano, Vancouver"
                className="w-full px-4 py-2.5 rounded-xl bg-[#F4EEE2]/60 border border-[#E2DBD0] text-xs text-[#2C2C2C] focus:outline-none focus:border-[#2D5A3D] transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-charcoal mb-1">
                Description & Purpose <span className="text-rose-500">*</span>
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                placeholder="Describe your circle's mission, regular gatherings, and who would enjoy joining..."
                className="w-full px-4 py-2.5 rounded-xl bg-[#F4EEE2]/60 border border-[#E2DBD0] text-xs text-[#2C2C2C] focus:outline-none focus:border-[#2D5A3D] transition-colors resize-none leading-relaxed"
              />
            </div>
          </div>
        )}

        {/* ─── STEP 2: HOBBIES TAXONOMY ─── */}
        {currentStep === 2 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-xs font-semibold text-charcoal">
                  Select Circle Hobbies & Tags (Max 5)
                </h4>
                <p className="text-[11px] text-[#8a8278]">
                  Members with matching interests will be recommended this circle.
                </p>
              </div>
              <span className="text-[11px] font-bold px-2.5 py-1 bg-[#eaf3ed] text-[#2D5A3D] rounded-full shrink-0">
                {selectedHobbyIds.length} / 5 selected
              </span>
            </div>

            {taxonomyLoading ? (
              <div className="text-xs text-[#8a8278] py-8 text-center animate-pulse">
                Loading hobby taxonomy...
              </div>
            ) : categories.length === 0 ? (
              <div className="text-xs text-[#8a8278] py-6 text-center">
                No hobbies available.
              </div>
            ) : (
              <div className="space-y-4 max-h-[300px] overflow-y-auto pr-1">
                {categories.map((category: any) => (
                  <div key={category.id} className="space-y-1.5">
                    <h5 className="text-[11px] font-bold text-[#8a8278] uppercase tracking-wider">
                      {category.name}
                    </h5>
                    <div className="flex flex-wrap gap-1.5">
                      {category.hobbies?.map((hobby: any) => {
                        const isSelected = selectedHobbyIds.includes(Number(hobby.id));
                        return (
                          <button
                            key={hobby.id}
                            type="button"
                            onClick={() => handleToggleHobby(Number(hobby.id))}
                            className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all cursor-pointer border ${
                              isSelected
                                ? 'bg-[#2D5A3D] text-white border-[#2D5A3D] shadow-xs'
                                : 'bg-[#F4EEE2] text-[#5a5450] border-[#E2DBD0] hover:border-[#2D5A3D]/50'
                            }`}
                          >
                            {isSelected && '✓ '}#{hobby.name}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ─── STEP 3: COVER IMAGE ─── */}
        {currentStep === 3 && (
          <div className="space-y-4">
            <div>
              <h4 className="text-xs font-semibold text-charcoal mb-1">Circle Cover Image</h4>
              <p className="text-[11px] text-[#8a8278] mb-3">
                Upload a vibrant photo that represents your community (optional).
              </p>
            </div>

            {imagePreviewUrl ? (
              <div className="relative rounded-2xl overflow-hidden border border-[#E2DBD0] max-h-48 group">
                <img
                  src={imagePreviewUrl}
                  alt="Cover preview"
                  className="w-full h-44 object-cover"
                />
                <button
                  type="button"
                  onClick={() => {
                    setSelectedImageFile(null);
                    setImagePreviewUrl('');
                  }}
                  className="absolute top-2 right-2 bg-black/60 hover:bg-black text-white text-xs px-2.5 py-1 rounded-lg cursor-pointer transition-colors"
                >
                  Remove Photo
                </button>
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-[#E2DBD0] hover:border-[#2D5A3D] rounded-2xl cursor-pointer bg-[#F4EEE2]/40 hover:bg-[#F4EEE2]/80 transition-all">
                <span className="text-3xl mb-2">📸</span>
                <span className="text-xs font-semibold text-[#2D5A3D]">Upload Cover Photo</span>
                <span className="text-[10px] text-[#8a8278] mt-1">PNG, JPG, WEBP up to 5MB</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageFileChange}
                  className="hidden"
                />
              </label>
            )}

            <div className="p-3 bg-[#eaf3ed] rounded-xl text-[11px] text-[#2D5A3D]">
              💡 <strong>Creator Benefit:</strong> As the circle creator, you will automatically be registered as the first trusted member and community host.
            </div>
          </div>
        )}

        {/* ─── FOOTER CONTROLS ─── */}
        <div className="pt-4 border-t border-[#E2DBD0] flex items-center justify-between">
          {currentStep > 1 ? (
            <button
              type="button"
              onClick={handleBack}
              disabled={isSubmitting}
              className="px-4 py-2 rounded-xl border border-[#E2DBD0] text-xs font-semibold text-[#5a5450] hover:bg-[#F4EEE2] transition-colors cursor-pointer disabled:opacity-50"
            >
              ← Back
            </button>
          ) : (
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 rounded-xl border border-[#E2DBD0] text-xs font-semibold text-[#5a5450] hover:bg-[#F4EEE2] transition-colors cursor-pointer disabled:opacity-50"
            >
              Cancel
            </button>
          )}

          {currentStep < 3 ? (
            <button
              type="button"
              onClick={handleNext}
              className="px-5 py-2.5 rounded-xl bg-[#2D5A3D] text-white text-xs font-semibold hover:bg-[#3d7a55] transition-all shadow-xs cursor-pointer"
            >
              Next Step →
            </button>
          ) : (
            <button
              type="button"
              onClick={handleCreateCircle}
              disabled={isSubmitting}
              className="px-6 py-2.5 rounded-xl bg-[#2D5A3D] text-white text-xs font-semibold hover:bg-[#3d7a55] transition-all shadow-xs cursor-pointer disabled:opacity-50 flex items-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <svg className="animate-spin h-3.5 w-3.5 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                  Creating Circle...
                </>
              ) : (
                '✓ Launch Circle'
              )}
            </button>
          )}
        </div>

      </div>
    </div>
  );
};
