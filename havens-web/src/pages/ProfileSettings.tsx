import React, { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation } from '@apollo/client';
import { useNavigate } from 'react-router-dom';
import {
  MY_PROFILE,
  UPDATE_ACCOUNT_SECURITY,
  DELETE_ACCOUNT,
  GENERATE_INVITE,
} from '../graphql/operations';
import { useAuth } from '../context/AuthContext';
import { LocationInput } from '../components/LocationInput';

interface Hobby {
  id: string;
  name: string;
  category?: {
    id: string;
    name: string;
  };
}

interface ProfileData {
  id: string;
  username: string;
  email: string;
  totalPoints: number;
  bio: string;
  neighbourhood: string;
  photoUrl: string;
  inviteCode: string;
  hobbies: Hobby[];
}

export const ProfileSettingsView: React.FC = () => {
  const navigate = useNavigate();
  const { logout, refetchUser } = useAuth();

  // GraphQL Query for current profile
  const { data, loading, error, refetch } = useQuery<{ myProfile: ProfileData }>(MY_PROFILE, {
    fetchPolicy: 'network-only',
  });

  const profile = data?.myProfile;

  // Form State
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [bio, setBio] = useState('');
  const [neighbourhood, setNeighbourhood] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [inviteCode, setInviteCode] = useState('');

  // UI Feedback States
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Account Deletion Modal State
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  // Populate form defaults when profile data is loaded
  useEffect(() => {
    if (profile) {
      setUsername(profile.username || '');
      setEmail(profile.email || '');
      setBio(profile.bio || '');
      setNeighbourhood(profile.neighbourhood || '');
      if (!inviteCode && profile.inviteCode) {
        setInviteCode(profile.inviteCode);
      }
    }
  }, [profile]);

  // GraphQL Mutations
  const [updateSecurityMutation, { loading: isUpdating }] = useMutation(UPDATE_ACCOUNT_SECURITY);
  const [deleteAccountMutation, { loading: isDeleting }] = useMutation(DELETE_ACCOUNT);
  const [generateInviteMutation, { loading: isGeneratingInvite }] = useMutation(GENERATE_INVITE);

  /**
   * Generates a fresh invitation code from the backend.
   */
  const handleGenerateInvite = useCallback(async (isManualClick: boolean = false) => {
    if (isManualClick) {
      setSuccessMsg('');
      setErrorMsg('');
    }
    try {
      const res = await generateInviteMutation();
      if (res?.data?.generateInvite?.success && res?.data?.generateInvite?.invitation?.code) {
        const newCode = res.data.generateInvite.invitation.code;
        setInviteCode(newCode);
        if (isManualClick) {
          setSuccessMsg(`✓ Generated new invitation code: ${newCode}`);
        }
        await refetch();
      } else if (isManualClick) {
        setErrorMsg(res?.data?.generateInvite?.message || 'Failed to generate invitation code.');
      }
    } catch (err: any) {
      if (isManualClick) {
        setErrorMsg(err.message || 'Error generating invitation code.');
      } else {
        console.warn('[ProfileSettings] Dynamic invite refresh error:', err);
      }
    }
  }, [generateInviteMutation, refetch]);

  /**
   * Dynamic Invitation Code:
   * 1. Generates a new code immediately upon mounting (every time user enters the Profile page).
   * 2. Automatically refreshes the code every 2 minutes (120,000 milliseconds).
   * 3. Cleans up the interval on unmount to prevent memory leaks.
   */
  useEffect(() => {
    // 1. Immediate trigger on component mount
    handleGenerateInvite(false);

    // 2. 2-minute recurring interval
    const intervalId = setInterval(() => {
      handleGenerateInvite(false);
    }, 120000);

    // 3. Clear interval on unmount
    return () => {
      clearInterval(intervalId);
    };
  }, [handleGenerateInvite]);

  // General Info & Security Form Submit Handler
  const handleUpdateSecurity = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccessMsg('');
    setErrorMsg('');

    const isChangingUsername = username !== (profile?.username || '');
    const isChangingPassword = newPassword !== '';

    // Password match validation
    if (isChangingPassword && newPassword !== confirmPassword) {
      setErrorMsg('⚠️ New password and confirmation password do not match.');
      return;
    }

    // CRITICAL SECURITY REQUIREMENT: Require currentPassword if updating username or password
    if ((isChangingUsername || isChangingPassword) && !currentPassword) {
      setErrorMsg('⚠️ Current password is required to authorize changes to your Username or Password.');
      return;
    }

    try {
      const res = await updateSecurityMutation({
        variables: {
          email,
          newUsername: username,
          newPassword: newPassword || undefined,
          currentPassword: currentPassword || undefined,
          bio,
          neighbourhood,
        },
      });

      if (res?.data?.updateAccountSecurity?.success) {
        setSuccessMsg('✓ Account and security settings updated successfully!');
        setNewPassword('');
        setConfirmPassword('');
        setCurrentPassword('');
        await refetch();
        await refetchUser();
      } else {
        setErrorMsg(res?.data?.updateAccountSecurity?.message || 'Failed to update account settings.');
      }
    } catch (err: any) {
      console.error('[ProfileSettings Update Error]', err);
      setErrorMsg(err.message || 'Error updating settings.');
    }
  };

  // Account Deletion Handler
  const handleConfirmDeleteAccount = async () => {
    try {
      const res = await deleteAccountMutation();
      if (res?.data?.deleteAccount?.success) {
        // Clear all session tokens and reset state
        logout();
        navigate('/auth');
      } else {
        setErrorMsg(res?.data?.deleteAccount?.message || 'Failed to delete account.');
        setIsDeleteModalOpen(false);
      }
    } catch (err: any) {
      console.error('[DeleteAccount Error]', err);
      setErrorMsg(err.message || 'Error deleting account.');
      setIsDeleteModalOpen(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center font-serif text-[#2D5A3D]">
        <div className="text-center animate-pulse">Loading profile settings...</div>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-center text-sm">
          Failed to load profile. Please refresh or sign in again.
        </div>
      </div>
    );
  }

  // Group hobbies by Category for read-only rendering
  const hobbiesByCategory = (profile.hobbies || []).reduce<Record<string, Hobby[]>>((acc, hobby) => {
    const catName = hobby.category?.name || 'General Hobbies';
    if (!acc[catName]) acc[catName] = [];
    acc[catName].push(hobby);
    return acc;
  }, {});

  const isSensitiveChange = username !== profile.username || newPassword !== '';

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-10 antialiased pb-20">
      
      {/* Page Header */}
      <div className="border-b border-[#E2DBD0] pb-5">
        <h1 className="text-3xl font-serif font-semibold text-[#2D5A3D] lowercase tracking-tight">
          profile & account settings
        </h1>
        <p className="text-xs text-[#8a8278] mt-1 font-normal">
          Manage your personal details, interest hobbies taxonomy, and security preferences.
        </p>
      </div>

      {/* Global Alerts */}
      {successMsg && (
        <div className="p-4 bg-[#eaf3ed] border border-[#7aaa8a]/40 text-[#2D5A3D] rounded-2xl text-xs font-semibold animate-fade-in shadow-xs">
          {successMsg}
        </div>
      )}
      {errorMsg && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 rounded-2xl text-xs font-semibold animate-fade-in shadow-xs">
          {errorMsg}
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 1. USER OVERVIEW & READ-ONLY HOBBIES SECTION */}
      {/* ───────────────────────────────────────────────────────────── */}
      <section className="bg-white border border-[#E2DBD0] rounded-3xl p-6 sm:p-8 shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-6 border-b border-[#E2DBD0]/60 pb-6">
          <div className="flex items-center gap-5">
            <div className="w-20 h-20 rounded-full bg-[#2D5A3D] text-white flex items-center justify-center font-bold text-2xl overflow-hidden border-2 border-[#E2DBD0] shadow-sm">
              {profile.photoUrl ? (
                <img src={profile.photoUrl} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                profile.username.charAt(0).toUpperCase()
              )}
            </div>
            <div>
              <h2 className="text-lg font-serif font-bold text-charcoal flex items-center gap-2">
                @{profile.username}
                <span className="text-xs font-sans font-medium text-[#2D5A3D] bg-[#eaf3ed] px-2.5 py-0.5 rounded-full border border-[#7aaa8a]/30">
                  {profile.totalPoints} Points
                </span>
              </h2>
              <p className="text-xs text-[#8a8278] mt-0.5">{profile.email}</p>
              <div className="flex flex-wrap items-center gap-2 mt-1.5">
                <span className="text-xs text-[#8a8278] font-mono">
                  📍 {profile.neighbourhood || 'No location set'}
                </span>
                <span className="text-[#8a8278]">•</span>
                <div className="inline-flex items-center gap-1.5 bg-[#F4EEE2] px-2.5 py-1 rounded-lg border border-[#E2DBD0]">
                  <span className="text-xs font-medium text-[#8a8278]">Invite Code:</span>
                  <span className="text-xs font-mono font-bold text-[#C47B5A]">
                    {inviteCode || profile.inviteCode || 'N/A'}
                  </span>
                  <button
                    type="button"
                    disabled={isGeneratingInvite}
                    onClick={() => handleGenerateInvite(true)}
                    title="Generate new invitation code (auto-refreshes every 2 min)"
                    className="ml-1 p-1 rounded-md hover:bg-[#E2DBD0] text-xs transition-colors cursor-pointer disabled:opacity-50"
                  >
                    {isGeneratingInvite ? '⏳' : '🔄'}
                  </button>
                </div>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => navigate('/onboarding')}
            className="px-4 py-2 rounded-xl bg-[#F0EAE0] hover:bg-[#E2DBD0] text-[#2C2C2C] text-xs font-semibold border border-[#E2DBD0] transition-colors cursor-pointer"
          >
            ✏️ Edit Hobbies Taxonomy
          </button>
        </div>

        {/* Read-Only Spotify/Netflix Hobbies Visual Cards */}
        <div>
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-xs font-semibold text-[#8a8278] uppercase tracking-wider">
              Selected Interest Taxonomy ({profile.hobbies?.length || 0} subcategories)
            </h3>
          </div>

          {Object.keys(hobbiesByCategory).length === 0 ? (
            <p className="text-xs text-[#8a8278] italic">
              No hobbies selected yet. Click "Edit Hobbies Taxonomy" to personalize your profile.
            </p>
          ) : (
            <div className="space-y-4">
              {Object.entries(hobbiesByCategory).map(([catName, hobbyList]) => (
                <div key={catName} className="bg-[#F4EEE2]/60 border border-[#E2DBD0] rounded-2xl p-4">
                  <span className="text-xs font-serif font-bold text-[#2D5A3D] block mb-2">
                    {catName}
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {hobbyList.map((hb) => (
                      <span
                        key={hb.id}
                        className="px-3 py-1 rounded-full bg-[#2D5A3D] text-white text-[11px] font-semibold shadow-xs"
                      >
                        ✓ {hb.name}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 2. GENERAL INFORMATION & SECURITY EDIT FORM */}
      {/* ───────────────────────────────────────────────────────────── */}
      <section className="bg-white border border-[#E2DBD0] rounded-3xl p-6 sm:p-8 shadow-xs">
        <h2 className="text-base font-serif font-bold text-[#2D5A3D] mb-1">
          Edit Profile & Security Credentials
        </h2>
        <p className="text-xs text-[#8a8278] mb-6">
          Update your public profile details or change your password.
        </p>

        <form onSubmit={handleUpdateSecurity} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-[#8a8278] mb-1">Username</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-white border border-[#E2DBD0] text-[#2C2C2C] text-sm focus:outline-none focus:border-[#2D5A3D]"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[#8a8278] mb-1">Email Address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-white border border-[#E2DBD0] text-[#2C2C2C] text-sm focus:outline-none focus:border-[#2D5A3D]"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-[#8a8278] mb-1">Neighbourhood / Location</label>
              <LocationInput
                initialValue={neighbourhood}
                onSelectLocation={(loc) => {
                  if (loc) {
                    setNeighbourhood(loc.formatted_address || loc.neighbourhood || loc.cityName || '');
                  }
                }}
                placeholder="Search neighbourhood or city (e.g. Kitsilano, Vancouver)"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[#8a8278] mb-1">Bio / Short Bio</label>
              <input
                type="text"
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Tell members about yourself..."
                className="w-full px-4 py-2.5 rounded-xl bg-white border border-[#E2DBD0] text-[#2C2C2C] text-sm focus:outline-none focus:border-[#2D5A3D]"
              />
            </div>
          </div>

          {/* Change Password Section */}
          <div className="pt-4 border-t border-[#E2DBD0]/60 space-y-4">
            <h3 className="text-xs font-semibold text-charcoal uppercase tracking-wider">
              Change Password (Optional)
            </h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-[#8a8278] mb-1">New Password</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Leave blank to keep unchanged"
                  className="w-full px-4 py-2.5 rounded-xl bg-white border border-[#E2DBD0] text-[#2C2C2C] text-sm focus:outline-none focus:border-[#2D5A3D]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#8a8278] mb-1">Confirm New Password</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter new password"
                  className="w-full px-4 py-2.5 rounded-xl bg-white border border-[#E2DBD0] text-[#2C2C2C] text-sm focus:outline-none focus:border-[#2D5A3D]"
                />
              </div>
            </div>
          </div>

          {/* CRITICAL SECURITY FIELD: CURRENT PASSWORD REQUIREMENT */}
          <div className={`p-4 rounded-2xl border transition-all ${
            isSensitiveChange
              ? 'bg-amber-50/80 border-amber-300 ring-2 ring-amber-300/40'
              : 'bg-[#F0EAE0]/50 border-[#E2DBD0]'
          }`}>
            <label className="block text-xs font-bold text-charcoal mb-1">
              Current Password {isSensitiveChange && <span className="text-rose-600">* (REQUIRED TO AUTHORIZE CHANGES)</span>}
            </label>
            <p className="text-[11px] text-[#8a8278] mb-2">
              Enter your existing password to authorize updates to your Username or Password credentials.
            </p>
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="Enter your current password"
              className="w-full px-4 py-2.5 rounded-xl bg-white border border-[#E2DBD0] text-[#2C2C2C] text-sm focus:outline-none focus:border-[#2D5A3D]"
            />
          </div>

          <div className="pt-2 flex justify-end">
            <button
              type="submit"
              disabled={isUpdating}
              className="px-6 py-2.5 rounded-xl bg-[#2D5A3D] hover:bg-[#3d7a55] text-white text-xs font-semibold transition-colors shadow-xs disabled:opacity-50 cursor-pointer"
            >
              {isUpdating ? 'Saving Changes...' : 'Save Profile Changes'}
            </button>
          </div>
        </form>
      </section>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 3. DANGER ZONE (ACCOUNT DELETION WITH CONFIRMATION MODAL) */}
      {/* ───────────────────────────────────────────────────────────── */}
      <section className="bg-rose-50/70 border border-rose-200 rounded-3xl p-6 sm:p-8 shadow-xs">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-serif font-bold text-rose-800 flex items-center gap-2">
              ⚠️ Danger Zone
            </h2>
            <p className="text-xs text-rose-700 mt-1 max-w-md">
              Permanently delete your Havens account and clear all associated profile data, micro-circle memberships, and match connections.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setIsDeleteModalOpen(true)}
            className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold shadow-xs transition-colors shrink-0 cursor-pointer"
          >
            Delete Account
          </button>
        </div>
      </section>

      {/* STRICT CONFIRMATION MODAL */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white border border-rose-200 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl space-y-6 text-center">
            <div className="w-14 h-14 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto text-2xl font-bold">
              ⚠️
            </div>

            <div>
              <h3 className="text-xl font-serif font-bold text-rose-900">
                Delete Account Permanently?
              </h3>
              <p className="text-xs text-[#8a8278] mt-2 leading-relaxed">
                Are you sure you want to delete your account? This action <span className="font-semibold text-rose-700">cannot be undone</span>. All your data, interest taxonomy, circle memberships, and connection matches will be permanently erased.
              </p>
            </div>

            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsDeleteModalOpen(false)}
                className="px-5 py-2.5 rounded-xl border border-[#E2DBD0] text-[#5a5450] hover:bg-[#F4EEE2] text-xs font-semibold transition-colors cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="button"
                disabled={isDeleting}
                onClick={handleConfirmDeleteAccount}
                className="px-6 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold transition-colors shadow-xs disabled:opacity-50 cursor-pointer"
              >
                {isDeleting ? 'Deleting Account...' : 'Yes, Delete My Account'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
