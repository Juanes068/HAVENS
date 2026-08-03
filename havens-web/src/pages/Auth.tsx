import React, { useState } from 'react'
import { useMutation } from '@apollo/client'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { TOKEN_AUTH, CREATE_USER } from '../graphql/operations'
import { LocationAutocomplete, LocationResult } from '../components/LocationAutocomplete'

export const AuthPage: React.FC = () => {
  const navigate = useNavigate()
  const { login } = useAuth()

  const [isRegisterMode, setIsRegisterMode] = useState(false)
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [invitationCode, setInvitationCode] = useState('')
  const [bio, setBio] = useState('')
  const [selectedLocation, setSelectedLocation] = useState<LocationResult | null>(null)
  
  // Pipeline Status & Messages
  const [isProcessing, setIsProcessing] = useState(false)
  const [statusText, setStatusText] = useState('')
  const [errorMsg, setErrorMsg] = useState('')
  const [successMsg, setSuccessMsg] = useState('')

  // GraphQL Mutations
  const [tokenAuthMutation] = useMutation(TOKEN_AUTH)
  const [createUserMutation] = useMutation(CREATE_USER)

  // Step 1 Submission Handler
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

    // ───────────── STEP 1: ACCOUNT CREATION FLOW ─────────────
    if (!username || !email || !password || !invitationCode) {
      setErrorMsg('Please fill in all required fields including your 6-character invitation code.')
      return
    }

    if (!selectedLocation) {
      setErrorMsg('Please search and select a valid location from the Google Maps suggestions dropdown.')
      return
    }

    setIsProcessing(true)

    try {
      // Step 1.1: Create User Account in Django Database
      setStatusText('Step 1/2: Creating your Havens account...')
      const regRes = await createUserMutation({
        variables: {
          username,
          email,
          password,
          invitationCode,
          bio,
          neighbourhood: selectedLocation.neighbourhood,
          cityName: selectedLocation.cityName,
          latitude: selectedLocation.latitude,
          longitude: selectedLocation.longitude,
        },
      })

      if (!regRes?.data?.createUser?.success) {
        throw new Error(regRes?.data?.createUser?.message || 'Registration failed.')
      }

      // Step 1.2: Authenticate User and Save JWT Token to Context & Apollo Headers
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

      setSuccessMsg('Account created successfully! Proceeding to Profile Setup...')
      
      // Step 1.3: Immediately proceed to Step 2 (Profile Setup & Hobbies)
      navigate('/onboarding')
    } catch (err: any) {
      console.error('[Step 1 Account Creation Error]', err)
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
            trusted circles & warm community spaces
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-1 p-1 bg-[#E2DBD0]/60 rounded-xl mb-6">
          <button
            type="button"
            onClick={() => {
              setIsRegisterMode(false)
              setErrorMsg('')
              setSuccessMsg('')
            }}
            className={`flex-1 py-2 rounded-lg text-xs font-medium transition-all cursor-pointer ${
              !isRegisterMode ? 'bg-white text-[#2C2C2C] shadow-sm' : 'text-[#8a8278] hover:text-[#2C2C2C]'
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => {
              setIsRegisterMode(true)
              setErrorMsg('')
              setSuccessMsg('')
            }}
            className={`flex-1 py-2 rounded-lg text-xs font-medium transition-all cursor-pointer ${
              isRegisterMode ? 'bg-white text-[#2C2C2C] shadow-sm' : 'text-[#8a8278] hover:text-[#2C2C2C]'
            }`}
          >
            Register with Invite
          </button>
        </div>

        {/* Alert Messages */}
        {errorMsg && (
          <div className="p-3 text-xs bg-rose-50 border border-rose-200 text-rose-700 rounded-xl mb-4">
            {errorMsg}
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
            <label className="block text-xs font-medium text-[#8a8278] mb-1">Username</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter username"
              className="w-full px-4 py-2.5 rounded-xl bg-white border border-[#E2DBD0] text-[#2C2C2C] text-sm focus:outline-none focus:border-[#2D5A3D]"
            />
          </div>

          {isRegisterMode && (
            <div>
              <label className="block text-xs font-medium text-[#8a8278] mb-1">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                className="w-full px-4 py-2.5 rounded-xl bg-white border border-[#E2DBD0] text-[#2C2C2C] text-sm focus:outline-none focus:border-[#2D5A3D]"
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-[#8a8278] mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password"
              className="w-full px-4 py-2.5 rounded-xl bg-white border border-[#E2DBD0] text-[#2C2C2C] text-sm focus:outline-none focus:border-[#2D5A3D]"
            />
          </div>

          {isRegisterMode && (
            <>
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
                <LocationAutocomplete
                  onSelectLocation={(loc) => {
                    setSelectedLocation(loc)
                    if (loc) setErrorMsg('')
                  }}
                  placeholder="Type location (e.g. Milenta, Bogotá)"
                />
              </div>
            </>
          )}

          <button
            type="submit"
            disabled={isProcessing || (isRegisterMode && !selectedLocation)}
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
