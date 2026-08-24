import React, { useState } from 'react'
import { useMutation } from '@apollo/client'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { TOKEN_AUTH, CREATE_USER } from '../graphql/operations'
import { LocationInput, LocationData } from '../components/LocationInput'

export const AuthPage: React.FC = () => {
  const navigate = useNavigate()
  const { token, user, isOnboarded, networkError, login } = useAuth()

  // Redirect already authenticated users
  React.useEffect(() => {
    if (token && user) {
      if (isOnboarded) {
        navigate('/discover', { replace: true })
      } else {
        navigate('/onboarding', { replace: true })
      }
    }
  }, [token, user, isOnboarded, navigate])

  const [isRegisterMode, setIsRegisterMode] = useState(false)
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [invitationCode, setInvitationCode] = useState('')
  const [bio, setBio] = useState('')
  const [selectedLocation, setSelectedLocation] = useState<LocationData | null>(null)

  // Derived: real-time password mismatch indicator (only active once confirmPassword is non-empty)
  const passwordMismatch = confirmPassword.length > 0 && password !== confirmPassword

  // Pipeline Status & Messages
  const [isProcessing, setIsProcessing] = useState(false)
  const [statusText, setStatusText] = useState('')
  const [errorMsg, setErrorMsg] = useState('')
  const [successMsg, setSuccessMsg] = useState('')

  // Reset confirmPassword when toggling between Sign In / Register modes
  const handleSwitchToLogin = () => {
    setIsRegisterMode(false)
    setConfirmPassword('')
    setErrorMsg('')
    setSuccessMsg('')
  }

  const handleSwitchToRegister = () => {
    setIsRegisterMode(true)
    setErrorMsg('')
    setSuccessMsg('')
  }

  // GraphQL Mutations
  const [tokenAuthMutation] = useMutation(TOKEN_AUTH)
  const [createUserMutation] = useMutation(CREATE_USER)

  // Form Submission Handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg('')
    setSuccessMsg('')

    if (!isRegisterMode) {
      // ───────────── SIGN IN FLOW ─────────────
      if (!username || !password) {
        setErrorMsg('Please enter both username and password.')
        return
      }

      setIsProcessing(true)
      setStatusText('Authenticating...')

      try {
        const loginRes = await tokenAuthMutation({
          variables: { username, password },
        })

        if (loginRes?.data?.tokenAuth?.token) {
          await login(loginRes.data.tokenAuth.token)
          navigate('/discover')
        } else {
          setErrorMsg('Authentication failed: Invalid credentials.')
        }
      } catch (err: any) {
        setErrorMsg(err.message || 'Authentication error.')
      } finally {
        setIsProcessing(false)
      }
      return
    }

    // ───────────── REGISTRATION FLOW ─────────────
    if (!username || !email || !password || !confirmPassword || !invitationCode) {
      setErrorMsg('Please fill in all required fields including your 6-character invitation code.')
      return
    }

    // Client-side password confirmation guard
    if (password !== confirmPassword) {
      setErrorMsg('⚠️ Passwords do not match. Please re-enter your password.')
      return
    }

    if (!selectedLocation) {
      setErrorMsg('Please search and select a valid location from the Google Maps suggestions dropdown.')
      return
    }

    setIsProcessing(true)

    try {
      // Step 1: Create User Account in Django Database
      setStatusText('Step 1/2: Creating your Havens account...')
      const regRes = await createUserMutation({
        variables: {
          username,
          email,
          password,
          invitationCode,
          bio,
          neighbourhood: selectedLocation.neighbourhood || selectedLocation.formatted_address,
          cityName: selectedLocation.cityName || selectedLocation.formatted_address,
          latitude: selectedLocation.lat ?? selectedLocation.latitude,
          longitude: selectedLocation.lng ?? selectedLocation.longitude,
        },
      })

      if (!regRes?.data?.createUser?.success) {
        throw new Error(regRes?.data?.createUser?.message || 'Registration failed.')
      }

      // Step 2: Authenticate and save JWT Token
      setStatusText('Authenticating session & injecting JWT headers...')
      const loginRes = await tokenAuthMutation({
        variables: { username, password },
      })

      const token = loginRes?.data?.tokenAuth?.token
      if (!token) {
        throw new Error('Auto-login after registration failed.')
      }

      // Injects JWT token into secureStore and updates Apollo Client Authorization headers
      await login(token)

      setSuccessMsg('Account created! A welcome email is on its way. Proceeding to Profile Setup...')

      // Proceed to Step 2 (Hobby Selection & Photo Upload)
      navigate('/onboarding')
    } catch (err: any) {
      console.error('[Registration Error]', err)
      setErrorMsg(err.message || 'Registration failed.')
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#F4EEE2] text-[#2C2C2C] flex flex-col items-center justify-center p-6 antialiased">
      <div className="max-w-md w-full bg-[#F0EAE0]/80 border border-[#E2DBD0] rounded-3xl p-8 shadow-sm relative">

        {/* Brand Title */}
        <div className="text-center mb-6">
          <h1 className="text-4xl font-serif font-semibold tracking-tight text-[#2D5A3D] lowercase">
            havens
          </h1>
          <p className="text-sm text-[#8a8278] font-normal mt-1">
            trusted circles &amp; warm community spaces
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
            Sign In
          </button>
          <button
            type="button"
            onClick={handleSwitchToRegister}
            className={`flex-1 py-2 rounded-lg text-xs font-medium transition-all cursor-pointer ${
              isRegisterMode ? 'bg-white text-[#2C2C2C] shadow-sm' : 'text-[#8a8278] hover:text-[#2C2C2C]'
            }`}
          >
            Register with Invite
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
            <h3 className="text-sm font-semibold text-[#2D5A3D]">Setting up your Havens session...</h3>
            <p className="text-xs text-[#8a8278] mt-1 font-mono">{statusText}</p>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="auth-username" className="block text-xs font-medium text-[#8a8278] mb-1">Username</label>
            <input
              id="auth-username"
              name="username"
              type="text"
              autoComplete="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter username"
              className="w-full px-4 py-2.5 rounded-xl bg-white border border-[#E2DBD0] text-[#2C2C2C] text-sm focus:outline-none focus:border-[#2D5A3D]"
            />
          </div>

          {isRegisterMode && (
            <div>
              <label htmlFor="auth-email" className="block text-xs font-medium text-[#8a8278] mb-1">Email</label>
              <input
                id="auth-email"
                name="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                className="w-full px-4 py-2.5 rounded-xl bg-white border border-[#E2DBD0] text-[#2C2C2C] text-sm focus:outline-none focus:border-[#2D5A3D]"
              />
            </div>
          )}

          <div>
            <label htmlFor="auth-password" className="block text-xs font-medium text-[#8a8278] mb-1">Password</label>
            <input
              id="auth-password"
              name="password"
              type="password"
              autoComplete={isRegisterMode ? 'new-password' : 'current-password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password"
              className="w-full px-4 py-2.5 rounded-xl bg-white border border-[#E2DBD0] text-[#2C2C2C] text-sm focus:outline-none focus:border-[#2D5A3D]"
            />
          </div>

          {/* ── CONFIRM PASSWORD — only shown in Register mode ── */}
          {isRegisterMode && (
            <div>
              <label htmlFor="auth-confirm-password" className="block text-xs font-medium text-[#8a8278] mb-1">
                Confirm Password <span className="text-[#C47B5A]">*</span>
              </label>
              <input
                id="auth-confirm-password"
                name="confirmPassword"
                type="password"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter your password"
                className={`w-full px-4 py-2.5 rounded-xl bg-white border text-[#2C2C2C] text-sm focus:outline-none transition-colors ${
                  passwordMismatch
                    ? 'border-rose-400 focus:border-rose-500 bg-rose-50/30'
                    : confirmPassword.length > 0 && !passwordMismatch
                    ? 'border-[#7aaa8a] focus:border-[#2D5A3D]'
                    : 'border-[#E2DBD0] focus:border-[#2D5A3D]'
                }`}
              />
              {/* Inline mismatch feedback — appears immediately as the user types */}
              {passwordMismatch && (
                <p className="text-[11px] text-rose-600 mt-1.5 font-medium flex items-center gap-1">
                  <span>⚠️</span> Passwords do not match.
                </p>
              )}
              {/* Positive match feedback */}
              {confirmPassword.length > 0 && !passwordMismatch && (
                <p className="text-[11px] text-[#2D5A3D] mt-1.5 font-medium flex items-center gap-1">
                  <span>✓</span> Passwords match.
                </p>
              )}
            </div>
          )}

          {isRegisterMode && (
            <>
              <div>
                <label htmlFor="auth-invite-code" className="block text-xs font-medium text-[#8a8278] mb-1">
                  Invitation Code <span className="text-[#C47B5A]">*</span>
                </label>
                <input
                  id="auth-invite-code"
                  name="invitationCode"
                  type="text"
                  autoComplete="off"
                  maxLength={6}
                  value={invitationCode}
                  onChange={(e) => setInvitationCode(e.target.value.toUpperCase())}
                  placeholder="Enter 6-character code (e.g. A8X9K2)"
                  className="w-full px-4 py-2.5 rounded-xl bg-white border border-[#E2DBD0] text-[#2C2C2C] text-sm tracking-wider font-mono focus:outline-none focus:border-[#2D5A3D] uppercase"
                />
              </div>

              <div>
                <label htmlFor="auth-location" className="block text-xs font-medium text-[#8a8278] mb-1">
                  Location / Neighbourhood <span className="text-[#C47B5A]">*</span>
                </label>
                <LocationInput
                  onSelectLocation={(loc) => {
                    setSelectedLocation(loc)
                    if (loc) setErrorMsg('')
                  }}
                  placeholder="Search address or neighbourhood (e.g. Kitsilano, Vancouver)"
                />
              </div>
            </>
          )}

          <button
            type="submit"
            disabled={isProcessing || (isRegisterMode && (passwordMismatch || !selectedLocation))}
            className="w-full py-3 px-4 rounded-xl bg-[#2D5A3D] hover:bg-[#3d7a55] text-white font-medium text-sm transition-colors shadow-xs disabled:opacity-50 mt-4 cursor-pointer"
          >
            {isProcessing
              ? 'Processing...'
              : isRegisterMode
              ? 'Continue to Profile Setup (Step 1 of 2) →'
              : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  )
}
