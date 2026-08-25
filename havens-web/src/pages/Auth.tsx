import React, { useState } from 'react';
import { useMutation } from '@apollo/client';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useApp } from '../context/AppContext';
import { TOKEN_AUTH, CREATE_USER } from '../graphql/operations';
import { LocationInput, LocationData } from '../components/LocationInput';
import { LanguageSwitcher } from '../components/LanguageSwitcher';

export const AuthPage: React.FC = () => {
  const navigate = useNavigate();
  const { token, user, isOnboarded, networkError, login } = useAuth();
  const { t } = useApp();

  // Redirect already authenticated users
  React.useEffect(() => {
    if (token && user) {
      if (isOnboarded) {
        navigate('/discover', { replace: true });
      } else {
        navigate('/onboarding', { replace: true });
      }
    }
  }, [token, user, isOnboarded, navigate]);

  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [invitationCode, setInvitationCode] = useState('');
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [bio, setBio] = useState('');
  const [selectedLocation, setSelectedLocation] = useState<LocationData | null>(null);

  // Derived: real-time password mismatch indicator (only active once confirmPassword is non-empty)
  const passwordMismatch = confirmPassword.length > 0 && password !== confirmPassword;

  // Pipeline Status & Messages
  const [isProcessing, setIsProcessing] = useState(false);
  const [statusText, setStatusText] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Reset states when toggling between Sign In / Register modes
  const handleSwitchToLogin = () => {
    setIsRegisterMode(false);
    setConfirmPassword('');
    setErrorMsg('');
    setSuccessMsg('');
  };

  const handleSwitchToRegister = () => {
    setIsRegisterMode(true);
    setErrorMsg('');
    setSuccessMsg('');
  };

  // GraphQL Mutations
  const [tokenAuthMutation] = useMutation(TOKEN_AUTH);
  const [createUserMutation] = useMutation(CREATE_USER);

  // Form Submission Handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!isRegisterMode) {
      // ───────────── SIGN IN FLOW ─────────────
      if (!username || !password) {
        setErrorMsg(t('authErrorMissingFields'));
        return;
      }

      setIsProcessing(true);
      setStatusText(t('processing'));

      try {
        const loginRes = await tokenAuthMutation({
          variables: { username, password },
        });

        if (loginRes?.data?.tokenAuth?.token) {
          await login(loginRes.data.tokenAuth.token);
          navigate('/discover');
        } else {
          setErrorMsg(t('authErrorInvalidCreds'));
        }
      } catch (err: any) {
        setErrorMsg(err.message || t('authErrorInvalidCreds'));
      } finally {
        setIsProcessing(false);
      }
      return;
    }

    // ───────────── REGISTRATION FLOW ─────────────
    if (!username || !email || !password || !confirmPassword || !invitationCode) {
      setErrorMsg(t('authErrorMissingFields'));
      return;
    }

    // Client-side password confirmation guard
    if (password !== confirmPassword) {
      setErrorMsg(`⚠️ ${t('passwordsMismatch')}`);
      return;
    }

    if (!selectedLocation) {
      setErrorMsg(t('locationPlaceholder'));
      return;
    }

    // Mandatory Terms & Conditions Checkbox Validation
    if (!termsAccepted) {
      setErrorMsg(t('termsCheckboxRequired'));
      return;
    }

    setIsProcessing(true);

    try {
      // Step 1: Create User Account in Django Database
      setStatusText('Step 1/2: Creating your Havens account...');
      const regRes = await createUserMutation({
        variables: {
          username,
          email,
          password,
          invitationCode,
          termsAccepted: true,
          bio,
          neighbourhood: selectedLocation.neighbourhood || selectedLocation.formatted_address,
          cityName: selectedLocation.cityName || selectedLocation.formatted_address,
          latitude: selectedLocation.lat ?? selectedLocation.latitude,
          longitude: selectedLocation.lng ?? selectedLocation.longitude,
        },
      });

      if (!regRes?.data?.createUser?.success) {
        throw new Error(regRes?.data?.createUser?.message || 'Registration failed.');
      }

      // Step 2: Authenticate and save JWT Token
      setStatusText(t('settingUpSession'));
      const loginRes = await tokenAuthMutation({
        variables: { username, password },
      });

      const token = loginRes?.data?.tokenAuth?.token;
      if (!token) {
        throw new Error('Auto-login after registration failed.');
      }

      // Injects JWT token into secureStore and updates Apollo Client Authorization headers
      await login(token);

      setSuccessMsg(t('authSuccessRedirect'));

      // Proceed to Step 2 (Hobby Selection & Photo Upload)
      navigate('/onboarding');
    } catch (err: any) {
      console.error('[Registration Error]', err);
      setErrorMsg(err.message || 'Registration failed.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F4EEE2] text-[#2C2C2C] flex flex-col items-center justify-center p-6 antialiased relative">
      
      {/* Top Header Floating Language Switcher */}
      <div className="absolute top-6 right-6">
        <LanguageSwitcher variant="dropdown" />
      </div>

      <div className="max-w-md w-full bg-[#F0EAE0]/80 border border-[#E2DBD0] rounded-3xl p-8 shadow-sm relative">

        {/* Brand Title */}
        <div className="text-center mb-6">
          <h1 className="text-4xl font-serif font-semibold tracking-tight text-[#2D5A3D] lowercase">
            havens
          </h1>
          <p className="text-sm text-[#8a8278] font-normal mt-1">
            {t('brandTagline')}
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-1 p-1 bg-[#E2DBD0]/60 rounded-xl mb-6">
          <button
            type="button"
            onClick={handleSwitchToLogin}
            className={`flex-1 py-2 rounded-lg text-xs font-medium transition-all cursor-pointer ${
              !isRegisterMode ? 'bg-white text-[#2C2C2C] shadow-sm' : 'text-[#8a8278] hover:text-[#2C2C2C]'
            }`}
          >
            {t('signInTab')}
          </button>
          <button
            type="button"
            onClick={handleSwitchToRegister}
            className={`flex-1 py-2 rounded-lg text-xs font-medium transition-all cursor-pointer ${
              isRegisterMode ? 'bg-white text-[#2C2C2C] shadow-sm' : 'text-[#8a8278] hover:text-[#2C2C2C]'
            }`}
          >
            {t('registerTab')}
          </button>
        </div>

        {/* Alert Messages */}
        {(errorMsg || networkError) && (
          <div className="p-3 text-xs bg-rose-50 border border-rose-200 text-rose-700 rounded-xl mb-4">
            {errorMsg || networkError}
          </div>
        )}
        {successMsg && (
          <div className="p-3 text-xs bg-[#eaf3ed] border border-[#7aaa8a]/40 text-[#2D5A3D] rounded-xl mb-4">
            {successMsg}
          </div>
        )}

        {/* Processing Loading Overlay */}
        {isProcessing && (
          <div className="absolute inset-0 z-50 bg-[#F0EAE0]/95 backdrop-blur-xs rounded-3xl flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-200">
            <div className="w-10 h-10 border-4 border-[#2D5A3D] border-t-transparent rounded-full animate-spin mb-4" />
            <h3 className="text-sm font-semibold text-[#2D5A3D]">{t('settingUpSession')}</h3>
            <p className="text-xs text-[#8a8278] mt-1 font-mono">{statusText}</p>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="auth-username" className="block text-xs font-medium text-[#8a8278] mb-1">
              {t('usernameLabel')}
            </label>
            <input
              id="auth-username"
              name="username"
              type="text"
              autoComplete="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder={t('usernamePlaceholder')}
              className="w-full px-4 py-2.5 rounded-xl bg-white border border-[#E2DBD0] text-[#2C2C2C] text-sm focus:outline-none focus:border-[#2D5A3D]"
            />
          </div>

          {isRegisterMode && (
            <div>
              <label htmlFor="auth-email" className="block text-xs font-medium text-[#8a8278] mb-1">
                {t('emailLabel')}
              </label>
              <input
                id="auth-email"
                name="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t('emailPlaceholder')}
                className="w-full px-4 py-2.5 rounded-xl bg-white border border-[#E2DBD0] text-[#2C2C2C] text-sm focus:outline-none focus:border-[#2D5A3D]"
              />
            </div>
          )}

          <div>
            <label htmlFor="auth-password" className="block text-xs font-medium text-[#8a8278] mb-1">
              {t('passwordLabel')}
            </label>
            <input
              id="auth-password"
              name="password"
              type="password"
              autoComplete={isRegisterMode ? 'new-password' : 'current-password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={t('passwordPlaceholder')}
              className="w-full px-4 py-2.5 rounded-xl bg-white border border-[#E2DBD0] text-[#2C2C2C] text-sm focus:outline-none focus:border-[#2D5A3D]"
            />
          </div>

          {/* ── CONFIRM PASSWORD — only shown in Register mode ── */}
          {isRegisterMode && (
            <div>
              <label htmlFor="auth-confirm-password" className="block text-xs font-medium text-[#8a8278] mb-1">
                {t('confirmPasswordLabel')} <span className="text-[#C47B5A]">*</span>
              </label>
              <input
                id="auth-confirm-password"
                name="confirmPassword"
                type="password"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder={t('confirmPasswordPlaceholder')}
                className={`w-full px-4 py-2.5 rounded-xl bg-white border text-[#2C2C2C] text-sm focus:outline-none transition-colors ${
                  passwordMismatch
                    ? 'border-rose-400 focus:border-rose-500 bg-rose-50/30'
                    : confirmPassword.length > 0 && !passwordMismatch
                    ? 'border-[#7aaa8a] focus:border-[#2D5A3D]'
                    : 'border-[#E2DBD0] focus:border-[#2D5A3D]'
                }`}
              />
              {/* Inline mismatch feedback */}
              {passwordMismatch && (
                <p className="text-[11px] text-rose-600 mt-1.5 font-medium flex items-center gap-1">
                  <span>⚠️</span> {t('passwordsMismatch')}
                </p>
              )}
              {/* Positive match feedback */}
              {confirmPassword.length > 0 && !passwordMismatch && (
                <p className="text-[11px] text-[#2D5A3D] mt-1.5 font-medium flex items-center gap-1">
                  <span>✓</span> {t('passwordsMatch')}
                </p>
              )}
            </div>
          )}

          {isRegisterMode && (
            <>
              <div>
                <label htmlFor="auth-invite-code" className="block text-xs font-medium text-[#8a8278] mb-1">
                  {t('inviteCodeLabel')} <span className="text-[#C47B5A]">*</span>
                </label>
                <input
                  id="auth-invite-code"
                  name="invitationCode"
                  type="text"
                  autoComplete="off"
                  maxLength={6}
                  value={invitationCode}
                  onChange={(e) => setInvitationCode(e.target.value.toUpperCase())}
                  placeholder={t('inviteCodePlaceholder')}
                  className="w-full px-4 py-2.5 rounded-xl bg-white border border-[#E2DBD0] text-[#2C2C2C] text-sm tracking-wider font-mono focus:outline-none focus:border-[#2D5A3D] uppercase"
                />
              </div>

              <div>
                <label htmlFor="auth-location" className="block text-xs font-medium text-[#8a8278] mb-1">
                  {t('locationLabel')} <span className="text-[#C47B5A]">*</span>
                </label>
                <LocationInput
                  onSelectLocation={(loc) => {
                    setSelectedLocation(loc);
                    if (loc) setErrorMsg('');
                  }}
                  placeholder={t('locationPlaceholder')}
                />
              </div>

              {/* Mandatory Terms & Conditions Checkbox */}
              <div className="pt-2">
                <label className="flex items-start gap-2.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    id="auth-terms-checkbox"
                    name="termsAccepted"
                    checked={termsAccepted}
                    onChange={(e) => {
                      setTermsAccepted(e.target.checked);
                      if (e.target.checked && errorMsg === t('termsCheckboxRequired')) {
                        setErrorMsg('');
                      }
                    }}
                    className="mt-0.5 w-4 h-4 rounded border-[#E2DBD0] text-[#2D5A3D] focus:ring-[#2D5A3D] cursor-pointer accent-[#2D5A3D]"
                  />
                  <span className="text-xs text-[#5a5450] leading-relaxed">
                    {t('termsCheckboxLabel')}{' '}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        navigate('/terms');
                      }}
                      className="text-[#2D5A3D] font-semibold underline underline-offset-2 hover:opacity-80 cursor-pointer"
                    >
                      ({t('termsAndConditions')})
                    </button>{' '}
                    <span className="text-[#C47B5A]">*</span>
                  </span>
                </label>
              </div>
            </>
          )}

          <button
            type="submit"
            disabled={
              isProcessing ||
              (isRegisterMode && (passwordMismatch || !selectedLocation || !termsAccepted))
            }
            className="w-full py-3 px-4 rounded-xl bg-[#2D5A3D] hover:bg-[#3d7a55] text-white font-medium text-sm transition-colors shadow-xs disabled:opacity-50 mt-4 cursor-pointer"
          >
            {isProcessing
              ? t('processing')
              : isRegisterMode
              ? t('registerButton')
              : t('signInButton')}
          </button>
        </form>

        {/* Footer text link */}
        <div className="text-center mt-6 pt-4 border-t border-[#E2DBD0]/60">
          <p className="text-[11px] text-[#8a8278]">
            {t('termsDisclaimer')}{' '}
            <button
              type="button"
              onClick={() => navigate('/terms')}
              className="text-[#2D5A3D] font-semibold underline underline-offset-2 hover:opacity-80 cursor-pointer"
            >
              {t('termsAndConditions')}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};

export default AuthPage;
