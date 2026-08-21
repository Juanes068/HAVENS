import React, { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation } from '@apollo/client';
import { GENERATE_CLOUDINARY_SIGNATURE, UPDATE_USER_PROFILE } from '../../../graphql/operations';

interface Step4ProfilePhotoProps {
  currentUser: any;
  refetchUser: () => Promise<any>;
  onBack: () => void;
}

export const Step4ProfilePhoto: React.FC<Step4ProfilePhotoProps> = ({
  currentUser,
  refetchUser,
  onBack,
}) => {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedImageFile, setSelectedImageFile] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string>(currentUser?.photoUrl || '');
  const [isUploadingPhoto, setIsUploadingPhoto] = useState<boolean>(false);
  const [photoSuccessMsg, setPhotoSuccessMsg] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string>('');

  const [generateCloudinarySignature] = useMutation(GENERATE_CLOUDINARY_SIGNATURE);
  const [updateUserProfileMutation] = useMutation(UPDATE_USER_PROFILE);

  const handleAvatarFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedImageFile(file);
      setImagePreviewUrl(URL.createObjectURL(file));
      setErrorMsg('');
    }
  };

  const handleUploadAndFinish = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!selectedImageFile) {
      navigate('/discover');
      return;
    }

    setIsUploadingPhoto(true);
    setErrorMsg('');
    setPhotoSuccessMsg('');

    try {
      const sigRes = await generateCloudinarySignature({
        variables: { paramsToSign: '{}', folder: 'havens_profiles' },
      });

      const sigData = sigRes?.data?.generateCloudinarySignature;
      if (!sigData || !sigData.success) {
        throw new Error(sigData?.message || 'Failed to obtain photo upload signature.');
      }

      const { signature, timestamp, apiKey } = sigData;
      const cloudName = 'g8jffrmx';

      const formData = new FormData();
      formData.append('file', selectedImageFile);
      formData.append('api_key', String(apiKey));
      formData.append('timestamp', String(timestamp));
      formData.append('signature', String(signature));
      formData.append('folder', 'havens_profiles');

      const cloudRes = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
        method: 'POST',
        body: formData,
      });

      if (!cloudRes.ok) {
        const errorText = await cloudRes.text();
        throw new Error(`Upload failed (${cloudRes.status}): ${errorText}`);
      }

      const cloudJson = await cloudRes.json();
      const uploadedPhotoUrl = cloudJson?.secure_url ? String(cloudJson.secure_url).trim() : '';

      if (!uploadedPhotoUrl || !uploadedPhotoUrl.startsWith('http')) {
        throw new Error('Upload response missing valid secure URL.');
      }

      const updateRes = await updateUserProfileMutation({
        variables: { photoUrl: uploadedPhotoUrl },
      });

      if (updateRes?.data?.updateUserProfile?.success) {
        setPhotoSuccessMsg('✓ Profile picture saved!');
        await refetchUser();
      }

      navigate('/discover');
    } catch (err: any) {
      console.error('[Step 4 Upload Error]', err);
      setErrorMsg(err.message || 'Failed to upload photo.');
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  const handleSkip = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    navigate('/discover');
  };

  return (
    <div className="bg-white border border-[#E2DBD0] rounded-3xl p-8 max-w-lg mx-auto shadow-xs text-center space-y-6">
      <div>
        <span className="text-[10px] font-bold text-[#C47B5A] uppercase tracking-wider">
          Optional Profile Picture
        </span>
        <h3 className="text-2xl font-serif font-semibold text-[#2D5A3D] mt-1">
          Add a Face to Your Profile
        </h3>
        <p className="text-xs text-[#8a8278] mt-1">
          Helps trusted members recognize you in local events. You can also skip this step!
        </p>
      </div>

      {errorMsg && (
        <div className="p-3 text-xs bg-rose-50 border border-rose-200 text-rose-700 rounded-xl font-medium">
          {errorMsg}
        </div>
      )}

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

      <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-4 border-t border-[#E2DBD0]">
        <button
          type="button"
          onClick={onBack}
          className="w-full sm:w-auto px-5 py-2.5 rounded-xl border border-[#E2DBD0] text-[#5a5450] hover:bg-[#F4EEE2] text-xs font-semibold transition-colors cursor-pointer"
        >
          ← Back to Sub-categories
        </button>

        <button
          type="button"
          onClick={handleSkip}
          className="w-full sm:w-auto px-6 py-2.5 rounded-xl border border-[#E2DBD0] text-[#5a5450] hover:bg-[#F4EEE2] text-xs font-semibold transition-colors cursor-pointer"
        >
          Skip for now
        </button>

        <button
          type="button"
          disabled={isUploadingPhoto}
          onClick={handleUploadAndFinish}
          className="w-full sm:w-auto px-8 py-2.5 rounded-xl bg-[#2D5A3D] hover:bg-[#3d7a55] text-white text-xs font-semibold transition-colors shadow-xs disabled:opacity-50 cursor-pointer"
        >
          {isUploadingPhoto ? 'Saving photo...' : selectedImageFile ? 'Upload Photo & Finish' : 'Finish & Go to Havens'}
        </button>
      </div>
    </div>
  );
};
