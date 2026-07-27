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
  const [errorMsg, setErrorMsg] = useState('')
  const [successMsg, setSuccessMsg] = useState('')

  // Login Mutation Hook
  const [tokenAuthMutation, { loading: isAuthenticating }] = useMutation(TOKEN_AUTH, {
    onCompleted: async (data) => {
      if (data?.tokenAuth?.token) {
        await login(data.tokenAuth.token)
        setErrorMsg('')
        if (isRegisterMode) {
          navigate('/onboarding')
        } else {
          navigate('/discover')
        }
      } else {
        setErrorMsg('Authentication failed: Invalid credentials.')
      }
    },
    onError: (err) => {
      setErrorMsg(err.message || 'Authentication error.')
    },
  })

  // Register Mutation Hook
  const [createUserMutation, { loading: isRegistering }] = useMutation(CREATE_USER, {
    onCompleted: (data) => {
      if (data?.createUser?.success) {
        setSuccessMsg('Account created successfully! Signing you in...')
        setErrorMsg('')
        tokenAuthMutation({
          variables: { username, password },
        })
      } else {
        setErrorMsg(data?.createUser?.message || 'Registration failed.')
      }
    },
    onError: (err) => {
      setErrorMsg(err.message || 'Registration error.')
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg('')
    setSuccessMsg('')

    if (isRegisterMode) {
      if (!username || !email || !password || !invitationCode) {
        setErrorMsg('Please fill in all required fields including your 6-character invitation code.')
        return
      }

      if (!selectedLocation) {
        setErrorMsg('Please search and select a valid location from the Google Maps suggestions dropdown.')
        return
      }

      createUserMutation({
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
    } else {
      if (!username || !password) {
        setErrorMsg('Please enter both username and password.')
        return
      }
      tokenAuthMutation({
        variables: { username, password },
      })
    }
  }

  return (
    <div className="min-h-screen bg-[#F4EEE2] text-[#2C2C2C] flex flex-col items-center justify-center p-6 antialiased">
      <div className="max-w-md w-full bg-[#F0EAE0]/80 border border-[#E2DBD0] rounded-3xl p-8 shadow-sm">
        
        {/* Brand Title */}
        <div className="text-center mb-8">
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
            disabled={isAuthenticating || isRegistering || (isRegisterMode && !selectedLocation)}
            className="w-full py-3 px-4 rounded-xl bg-[#2D5A3D] hover:bg-[#3d7a55] text-white font-medium text-sm transition-colors shadow-xs disabled:opacity-50 mt-4 cursor-pointer"
          >
            {isAuthenticating || isRegistering
              ? 'Processing...'
              : isRegisterMode
              ? 'Complete Registration'
              : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  )
}
