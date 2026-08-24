import React, { useState, useMemo } from 'react';
import { useQuery, useMutation } from '@apollo/client';
import {
  GET_ALL_HOBBY_CATEGORIES,
  GENERATE_CLOUDINARY_SIGNATURE,
  CREATE_COMMUNITY,
} from '../../../graphql/operations';
import { LocationInput, LocationData } from '../../../components/LocationInput';
import { Folder, Camera, Lightbulb } from 'lucide-react';

interface CreateCircleWizardProps {
  isOpen: boolean;
  onClose: () => void;
  onCircleCreated: (message: string) => void;
}

const CLOUDINARY_CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || 'g8jffrmx';
const MAX_MAIN_CATEGORIES = 3;
const MAX_SECONDARY_PER_CATEGORY = 5;

export const CreateCircleWizard: React.FC<CreateCircleWizardProps> = ({
  isOpen,
  onClose,
  onCircleCreated,
}) => {
  const [currentStep, setCurrentStep] = useState<number>(1);

  // Form State
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isVirtual, setIsVirtual] = useState(false);
  const [locationName, setLocationName] = useState('');
  const [coordinates, setCoordinates] = useState<{ latitude: number | null; longitude: number | null }>({
    latitude: null,
    longitude: null,
  });

  // 2-Tier Hobbies Taxonomy State
  // Tier 1: Main Category IDs (Max 3)
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<number[]>([]);
  // Tier 2: Secondary Hobby IDs (Max 5 per selected Category)
  const [selectedHobbyIds, setSelectedHobbyIds] = useState<number[]>([]);

  // Cover Image State
  const [selectedImageFile, setSelectedImageFile] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string>('');

  // UI state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // ─── Strict State Cleanup Helper ───
  const resetForm = () => {
    setName('');
    setDescription('');
    setIsVirtual(false);
    setLocationName('');
    setCoordinates({ latitude: null, longitude: null });
    setSelectedCategoryIds([]);
    setSelectedHobbyIds([]);
    setSelectedImageFile(null);
    setImagePreviewUrl('');
    setErrorMessage('');
    setCurrentStep(1);
    setIsSubmitting(false);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  // GraphQL
  const { data: taxonomyData, loading: taxonomyLoading } = useQuery(GET_ALL_HOBBY_CATEGORIES);
  const [generateCloudinarySignature] = useMutation(GENERATE_CLOUDINARY_SIGNATURE);
  const [createCommunityMutation] = useMutation(CREATE_COMMUNITY);

  const categories = useMemo(() => {
    return taxonomyData?.allHobbyCategories || [];
  }, [taxonomyData]);

  if (!isOpen) return null;

  // ─── Location Selection Handler (Google Maps API) ───
  const handleLocationSelect = (loc: LocationData | null) => {
    setErrorMessage('');
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

  // ─── Toggle Virtual Group ───
  const handleToggleVirtual = (checked: boolean) => {
    setIsVirtual(checked);
    setErrorMessage('');
    if (checked) {
      setLocationName('Virtual Group');
      setCoordinates({ latitude: null, longitude: null });
    } else {
      setLocationName('');
      setCoordinates({ latitude: null, longitude: null });
    }
  };

  // ─── Tier 1: Toggle Main Category (Max 3) ───
  const handleToggleCategory = (catId: number) => {
    setErrorMessage('');
    if (selectedCategoryIds.includes(catId)) {
      // Deselect Category and remove its associated secondary hobbies
      setSelectedCategoryIds((prev) => prev.filter((id) => id !== catId));

      const targetCategory = categories.find((c: any) => Number(c.id) === catId);
      if (targetCategory?.hobbies) {
        const catHobbyIds = new Set(targetCategory.hobbies.map((h: any) => Number(h.id)));
        setSelectedHobbyIds((prev) => prev.filter((id) => !catHobbyIds.has(id)));
      }
    } else {
      if (selectedCategoryIds.length >= MAX_MAIN_CATEGORIES) {
        setErrorMessage(`You can select a maximum of ${MAX_MAIN_CATEGORIES} Main Hobbies.`);
        return;
      }
      setSelectedCategoryIds((prev) => [...prev, catId]);
    }
  };

  // ─── Tier 2: Toggle Secondary Hobby (Max 5 per chosen category) ───
  const handleToggleHobby = (hobbyId: number, categoryId: number) => {
    setErrorMessage('');
    if (selectedHobbyIds.includes(hobbyId)) {
      setSelectedHobbyIds((prev) => prev.filter((id) => id !== hobbyId));
    } else {
      // Find how many secondary hobbies are currently selected for this specific category
      const targetCategory = categories.find((c: any) => Number(c.id) === categoryId);
      const catHobbyIds = new Set((targetCategory?.hobbies || []).map((h: any) => Number(h.id)));
      const countInThisCat = selectedHobbyIds.filter((id) => catHobbyIds.has(id)).length;

      if (countInThisCat >= MAX_SECONDARY_PER_CATEGORY) {
        setErrorMessage(
          `You can select a maximum of ${MAX_SECONDARY_PER_CATEGORY} secondary hobbies for "${targetCategory?.name}".`
        );
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
    if (!isVirtual && !locationName.trim()) {
      setErrorMessage('Please search and select a geographic location for this circle using Google Maps, or enable Virtual Group.');
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
    if (selectedCategoryIds.length === 0) {
      setErrorMessage('Please select at least 1 Main Hobby category.');
      return false;
    }
    if (selectedHobbyIds.length === 0) {
      setErrorMessage('Please select at least 1 Secondary Hobby under your chosen main categories.');
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

      // Execute CreateCommunity mutation with location coordinates and selected secondary hobbies
      const res = await createCommunityMutation({
        variables: {
          name: name.trim(),
          description: description.trim(),
          locationName: isVirtual ? 'Virtual Group' : (locationName.trim() || 'Vancouver, BC'),
          latitude: isVirtual ? null : coordinates.latitude,
          longitude: isVirtual ? null : coordinates.longitude,
          isVirtual: isVirtual,
          imageUrl: finalImageUrl,
          hobbyIds: selectedHobbyIds,
        },
      });

      const data = res?.data?.createCommunity;
      if (data?.success) {
        onCircleCreated(data.message || `Circle "${name}" created successfully!`);
        resetForm();
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

  const selectedCategoriesList = categories.filter((c: any) =>
    selectedCategoryIds.includes(Number(c.id))
  );

  return (
    <div className="fixed inset-0 z-50 bg-black/45 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white border border-[#E2DBD0] rounded-3xl p-6 md:p-8 max-w-2xl w-full shadow-2xl space-y-6 animate-in fade-in zoom-in-95 duration-150 max-h-[92vh] flex flex-col justify-between overflow-y-auto">
        
        {/* Modal Header & Stepper Progress */}
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
              onClick={handleClose}
              className="text-xs font-bold text-[#8a8278] hover:text-charcoal bg-[#F4EEE2] p-2 rounded-full cursor-pointer transition-colors"
            >
              ✕
            </button>
          </div>

          {/* Stepper Progress Bar */}
          <div className="grid grid-cols-3 gap-2.5 mt-4">
            {[
              { step: 1, title: '1. Details & Location' },
              { step: 2, title: '2. 2-Tier Taxonomy' },
              { step: 3, title: '3. Cover Image' },
            ].map((item) => {
              const isActive = currentStep === item.step;
              const isPast = currentStep > item.step;
              return (
                <div key={item.step} className="space-y-1.5">
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
          <div className="p-3.5 text-xs bg-rose-50 border border-rose-200 text-rose-700 rounded-2xl flex items-center justify-between shadow-2xs">
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

        {/* ─── STEP 1: INFO & GOOGLE MAPS / VIRTUAL LOCATION ─── */}
        {currentStep === 1 && (
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-charcoal mb-1.5">
                Circle Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Kitsilano Trail Runners"
                className="w-full px-4 py-2.5 rounded-2xl bg-[#F4EEE2]/60 border border-[#E2DBD0] text-xs text-[#2C2C2C] focus:outline-none focus:border-[#2D5A3D] transition-colors"
              />
            </div>

            {/* Virtual Group Toggle Checkbox */}
            <div className="flex items-center justify-between p-3.5 bg-[#FDFBF7] border border-[#E2DBD0] rounded-2xl">
              <div className="flex items-center gap-2.5">
                <span className="text-xl">🌐</span>
                <div>
                  <p className="text-xs font-semibold text-[#2C2C2C]">Virtual Group / No specific location</p>
                  <p className="text-[11px] text-[#8a8278]">Online circle open to members anywhere (bypasses radius filters)</p>
                </div>
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

            {/* Google Maps Location Autocomplete Input (Disabled & hidden if Virtual) */}
            {!isVirtual ? (
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-semibold text-charcoal">
                    Neighbourhood & Coordinates (Google Maps) <span className="text-rose-500">*</span>
                  </label>
                  {coordinates.latitude && coordinates.longitude && (
                    <span className="text-[10px] text-[#2D5A3D] font-semibold bg-[#eaf3ed] px-2 py-0.5 rounded-md">
                      📍 {coordinates.latitude.toFixed(4)}, {coordinates.longitude.toFixed(4)}
                    </span>
                  )}
                </div>
                <LocationInput
                  placeholder="Search neighborhood or address (e.g. Kitsilano Beach, Vancouver)"
                  initialValue={locationName}
                  onSelectLocation={handleLocationSelect}
                  className="rounded-2xl"
                />
                <p className="text-[11px] text-[#8a8278] mt-1">
                  Select an address from the Google Maps suggestions to accurately enable proximity matching.
                </p>
              </div>
            ) : (
              <div className="p-3 bg-[#eaf3ed] border border-[#7aaa8a]/30 rounded-2xl text-xs text-[#2D5A3D] flex items-center gap-2">
                <span>✓</span>
                <span>Virtual Circle mode enabled. This group will be discovered by members across all locations.</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-charcoal mb-1.5">
                Description & Mission <span className="text-rose-500">*</span>
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                placeholder="Describe your circle's purpose, regular activities, and who would enjoy connecting..."
                className="w-full px-4 py-2.5 rounded-2xl bg-[#F4EEE2]/60 border border-[#E2DBD0] text-xs text-[#2C2C2C] focus:outline-none focus:border-[#2D5A3D] transition-colors resize-none leading-relaxed"
              />
            </div>
          </div>
        )}

        {/* ─── STEP 2: 2-TIER HOBBIES TAXONOMY ─── */}
        {currentStep === 2 && (
          <div className="space-y-5">
            {/* TIER 1: Main Hobbies / Categories */}
            <div className="space-y-2.5 pb-4 border-b border-[#E2DBD0]/70">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-charcoal uppercase tracking-wider">
                    Tier 1: Select Main Hobbies (Up to 3) <span className="text-rose-500">*</span>
                  </h4>
                  <p className="text-[11px] text-[#8a8278]">
                    Choose the parent topics that define the overarching theme of this circle.
                  </p>
                </div>
                <span
                  className={`text-[11px] font-bold px-3 py-1 rounded-full shrink-0 border ${
                    selectedCategoryIds.length === MAX_MAIN_CATEGORIES
                      ? 'bg-[#2D5A3D] text-white border-[#2D5A3D]'
                      : 'bg-[#eaf3ed] text-[#2D5A3D] border-[#7aaa8a]/40'
                  }`}
                >
                  {selectedCategoryIds.length} / {MAX_MAIN_CATEGORIES} Selected
                </span>
              </div>

              {taxonomyLoading ? (
                <div className="text-xs text-[#8a8278] py-4 text-center animate-pulse">
                  Loading categories...
                </div>
              ) : (
                <div className="flex flex-wrap gap-2 pt-1">
                  {categories.map((cat: any) => {
                    const isSelected = selectedCategoryIds.includes(Number(cat.id));
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => handleToggleCategory(Number(cat.id))}
                        className={`px-3.5 py-2 rounded-2xl text-xs font-semibold transition-all cursor-pointer border flex items-center gap-1.5 shadow-2xs ${
                          isSelected
                            ? 'bg-[#2D5A3D] text-white border-[#2D5A3D] ring-2 ring-[#2D5A3D]/20'
                            : 'bg-[#F4EEE2] text-[#5a5450] border-[#E2DBD0] hover:border-[#2D5A3D]/50 hover:bg-[#F4EEE2]/80'
                        }`}
                      >
                        {isSelected ? <span>✓</span> : <Folder className="w-3.5 h-3.5" />}
                        <span>{cat.name}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* TIER 2: Secondary Specific Hobbies */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-charcoal uppercase tracking-wider">
                    Tier 2: Select Secondary Hobbies (Up to 5 per Main Hobby) <span className="text-rose-500">*</span>
                  </h4>
                  <p className="text-[11px] text-[#8a8278]">
                    Specific passions strictly associated with your selected main topics.
                  </p>
                </div>
                <span className="text-[11px] font-semibold text-[#8a8278] bg-[#F4EEE2] px-2.5 py-1 rounded-full">
                  {selectedHobbyIds.length} Total Chosen
                </span>
              </div>

              {selectedCategoriesList.length === 0 ? (
                <div className="p-6 bg-[#FDFBF7] border border-dashed border-[#E2DBD0] rounded-2xl text-center text-xs text-[#8a8278]">
                  Please select at least 1 Main Hobby above to unlock its secondary hobbies.
                </div>
              ) : (
                <div className="space-y-4 max-h-[260px] overflow-y-auto pr-1">
                  {selectedCategoriesList.map((category: any) => {
                    const catId = Number(category.id);
                    const catHobbies = category.hobbies || [];
                    const selectedForThisCat = selectedHobbyIds.filter((id) =>
                      catHobbies.some((h: any) => Number(h.id) === id)
                    );

                    return (
                      <div
                        key={category.id}
                        className="bg-[#FDFBF7] border border-[#E2DBD0]/80 rounded-2xl p-3.5 space-y-2"
                      >
                        <div className="flex items-center justify-between">
                          <h5 className="text-xs font-bold text-[#2D5A3D] flex items-center gap-1.5">
                            <Folder className="w-3.5 h-3.5" />
                            <span>{category.name}</span>
                          </h5>
                          <span className="text-[10px] font-semibold text-[#8a8278] bg-white border border-[#E2DBD0] px-2 py-0.5 rounded-md">
                            {selectedForThisCat.length} / {MAX_SECONDARY_PER_CATEGORY}
                          </span>
                        </div>

                        <div className="flex flex-wrap gap-1.5">
                          {catHobbies.length === 0 ? (
                            <span className="text-[11px] text-[#8a8278] italic">No secondary hobbies found.</span>
                          ) : (
                            catHobbies.map((hobby: any) => {
                              const isSelected = selectedHobbyIds.includes(Number(hobby.id));
                              return (
                                <button
                                  key={hobby.id}
                                  type="button"
                                  onClick={() => handleToggleHobby(Number(hobby.id), catId)}
                                  className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all cursor-pointer border ${
                                    isSelected
                                      ? 'bg-[#2D5A3D] text-white border-[#2D5A3D] shadow-2xs'
                                      : 'bg-white text-[#5a5450] border-[#E2DBD0] hover:border-[#2D5A3D]/40'
                                  }`}
                                >
                                  {isSelected && '✦ '}#{hobby.name}
                                </button>
                              );
                            })
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
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
                <Camera className="w-8 h-8 text-[#2D5A3D] mb-2" />
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

            <div className="p-3.5 bg-[#eaf3ed] rounded-2xl text-xs text-[#2D5A3D] leading-relaxed border border-[#7aaa8a]/30 flex items-start gap-2">
              <Lightbulb className="w-4 h-4 text-[#2D5A3D] shrink-0 mt-0.5" />
              <span><strong>Creator Benefit:</strong> As the circle creator, you will automatically be registered as the community host and member.</span>
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
              className="px-4 py-2.5 rounded-2xl border border-[#E2DBD0] text-xs font-semibold text-[#5a5450] hover:bg-[#F4EEE2] transition-colors cursor-pointer disabled:opacity-50"
            >
              ← Back
            </button>
          ) : (
            <button
              type="button"
              onClick={handleClose}
              disabled={isSubmitting}
              className="px-4 py-2.5 rounded-2xl border border-[#E2DBD0] text-xs font-semibold text-[#5a5450] hover:bg-[#F4EEE2] transition-colors cursor-pointer disabled:opacity-50"
            >
              Cancel
            </button>
          )}

          {currentStep < 3 ? (
            <button
              type="button"
              onClick={handleNext}
              className="px-5 py-2.5 rounded-2xl bg-[#2D5A3D] text-white text-xs font-semibold hover:bg-[#3d7a55] transition-all shadow-xs cursor-pointer"
            >
              Next Step →
            </button>
          ) : (
            <button
              type="button"
              onClick={handleCreateCircle}
              disabled={isSubmitting}
              className="px-6 py-2.5 rounded-2xl bg-[#2D5A3D] text-white text-xs font-semibold hover:bg-[#3d7a55] transition-all shadow-xs cursor-pointer disabled:opacity-50 flex items-center gap-2"
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

export default CreateCircleWizard;
