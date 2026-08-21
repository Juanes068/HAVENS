import React, { useState } from 'react';
import { useMutation } from '@apollo/client';
import { useAuth } from '../../../context/AuthContext';
import { LocationInput, LocationData } from '../../../components/LocationInput';
import { CREATE_USER, TOKEN_AUTH } from '../../../graphql/operations';

interface Step1AccountProps {
  onSuccess: () => void;
  onError: (msg: string) => void;
}

export const Step1Account: React.FC<Step1AccountProps> = ({ onSuccess, onError }) => {
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [invitationCode, setInvitationCode] = useState('');
  const [selectedLocation, setSelectedLocation] = useState<LocationData | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [statusText, setStatusText] = useState('');

  const [createUserMutation] = useMutation(CREATE_USER);
  const [tokenAuthMutation] = useMutation(TOKEN_AUTH);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    onError('');

    if (!username || !email || !password || !confirmPassword || !invitationCode) {
      onError('Please fill in all required fields.');
      return;
    }

    if (password !== confirmPassword) {
      onError('⚠️ Password and Password Confirmation do not match.');
      return;
    }

    if (!selectedLocation) {
      onError('Please select a valid location from the location suggestions dropdown.');
      return;
    }

    setIsProcessing(true);

    try {
      setStatusText('Creating your account...');
      const regRes = await createUserMutation({
        variables: {
          username,
          email,
          password,
          invitationCode,
          neighbourhood: selectedLocation.neighbourhood || selectedLocation.formatted_address,
          cityName: selectedLocation.cityName || selectedLocation.formatted_address,
          latitude: selectedLocation.lat ?? selectedLocation.latitude,
          longitude: selectedLocation.lng ?? selectedLocation.longitude,
        },
      });

      if (!regRes?.data?.createUser?.success) {
        throw new Error(regRes?.data?.createUser?.message || 'Registration failed.');
      }

      setStatusText('Authenticating session...');
      const loginRes = await tokenAuthMutation({
        variables: { username, password },
      });

      const newToken = loginRes?.data?.tokenAuth?.token;
      if (!newToken) {
        throw new Error('Auto-login after registration failed.');
      }

      await login(newToken);
      onSuccess();
    } catch (err: any) {
      console.error('[Step 1 Account Error]', err);
      onError(err.message || 'Registration failed.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="bg-[#F0EAE0]/80 border border-[#E2DBD0] rounded-3xl p-8 max-w-md mx-auto shadow-xs relative">
      {isProcessing && (
        <div className="absolute inset-0 z-50 bg-[#F0EAE0]/95 backdrop-blur-xs rounded-3xl flex flex-col items-center justify-center p-6 text-center">
          <div className="w-10 h-10 border-4 border-[#2D5A3D] border-t-transparent rounded-full animate-spin mb-4" />
          <h3 className="text-sm font-semibold text-[#2D5A3D]">Setting up your account...</h3>
          <p className="text-xs text-[#8a8278] mt-1 font-mono">{statusText}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-[#8a8278] mb-1">Username / Name</label>
          <input
            type="text"
            autoComplete="username"
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
            autoComplete="email"
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
            autoComplete="new-password"
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
            autoComplete="new-password"
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
          <LocationInput
            onSelectLocation={(loc) => setSelectedLocation(loc)}
            placeholder="Search address or neighbourhood (e.g. Kitsilano, Vancouver)"
          />
        </div>

        <button
          type="submit"
          disabled={isProcessing || (confirmPassword !== '' && password !== confirmPassword)}
          className="w-full py-3 px-4 rounded-xl bg-[#2D5A3D] hover:bg-[#3d7a55] text-white font-medium text-sm transition-colors shadow-xs disabled:opacity-50 mt-4 cursor-pointer"
        >
          Create Account & Continue →
        </button>
      </form>
    </div>
  );
};
