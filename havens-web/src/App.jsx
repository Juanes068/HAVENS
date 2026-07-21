import React, { useState } from 'react'
import { useMutation } from '@apollo/client'
import { useAuth } from './context/AuthContext'
import { TOKEN_AUTH } from './graphql/operations'

function App() {
  const { user, token, isLoading, login, logout } = useAuth()
  const [usernameInput, setUsernameInput] = useState('')
  const [passwordInput, setPasswordInput] = useState('')
  const [errorMsg, setErrorMsg] = useState('')

  const [tokenAuthMutation, { loading: isAuthenticating }] = useMutation(TOKEN_AUTH, {
    onCompleted: (data) => {
      if (data && data.tokenAuth && data.tokenAuth.token) {
        login(data.tokenAuth.token)
        setErrorMsg('')
        setUsernameInput('')
        setPasswordInput('')
      } else {
        setErrorMsg('Authentication failed: No token returned.')
      }
    },
    onError: (err) => {
      setErrorMsg(err.message || 'Authentication error.')
    },
  })

  const handleLoginSubmit = (e) => {
    e.preventDefault()
    if (!usernameInput || !passwordInput) {
      setErrorMsg('Please enter both username and password.')
      return
    }
    setErrorMsg('')
    tokenAuthMutation({
      variables: {
        username: usernameInput,
        password: passwordInput,
      },
    })
  }

  return (
    <div className="min-h-screen bg-havens-cream text-havens-charcoal flex flex-col items-center justify-center p-6 antialiased">
      <div className="max-w-md w-full bg-havens-sand/50 border border-havens-sand rounded-3xl p-8 shadow-sm text-slate-800">
        
        {/* Brand Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-semibold tracking-tight text-havens-forest lowercase">
            havens
          </h1>
          <p className="text-sm text-havens-muted font-normal mt-1">
            warm, grounded community spaces
          </p>
        </div>

        {/* Loading State */}
        {isLoading ? (
          <div className="text-center py-10 text-havens-muted font-normal animate-pulse text-sm">
            gathering your space...
          </div>
        ) : user ? (
          /* Authenticated State */
          <div className="space-y-6">
            <div className="bg-havens-cream p-5 rounded-2xl border border-havens-sand shadow-xs">
              <div className="flex items-center space-x-3 mb-4">
                <div className="h-11 w-11 rounded-full bg-havens-forest text-havens-cream flex items-center justify-center font-medium text-lg">
                  {user.username ? user.username[0].toLowerCase() : 'u'}
                </div>
                <div>
                  <h3 className="font-semibold text-havens-charcoal text-base">
                    {user.username}
                  </h3>
                  <p className="text-xs text-havens-muted">{user.email}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs border-t border-havens-sand/80 pt-4 mt-2">
                <div>
                  <span className="text-havens-muted block mb-0.5">Trust Points</span>
                  <span className="font-semibold text-havens-forest">{user.totalPoints ?? 0} pts</span>
                </div>
                <div>
                  <span className="text-havens-muted block mb-0.5">Neighbourhood</span>
                  <span className="font-semibold text-havens-charcoal">{user.neighbourhood || 'Not set'}</span>
                </div>
              </div>

              {user.bio && (
                <div className="mt-3 text-xs text-havens-muted bg-havens-sand/40 p-3 rounded-xl border border-havens-sand/60 italic">
                  "{user.bio}"
                </div>
              )}
            </div>

            <div className="bg-havens-cream p-3 rounded-xl border border-havens-sand text-xs space-y-1">
              <span className="text-havens-muted font-medium block">Header Authorization:</span>
              <span className="text-havens-clay font-mono text-[11px] break-all block">
                Authorization: JWT {token}
              </span>
            </div>

            <button
              onClick={logout}
              className="w-full py-3 px-4 rounded-2xl bg-havens-cream hover:bg-rose-50 text-rose-700 font-medium text-sm transition-colors border border-rose-200/80 shadow-xs"
            >
              Sign out
            </button>
          </div>
        ) : (
          /* Sign-in Form */
          <form onSubmit={handleLoginSubmit} className="space-y-4">
            {errorMsg && (
              <div className="p-3 text-xs bg-rose-50 border border-rose-200 text-rose-700 rounded-xl">
                {errorMsg}
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-havens-muted mb-1.5">
                Username
              </label>
              <input
                type="text"
                value={usernameInput}
                onChange={(e) => setUsernameInput(e.target.value)}
                placeholder="Enter your username"
                className="w-full px-4 py-2.5 rounded-2xl bg-havens-cream border border-havens-sand text-havens-charcoal text-sm focus:outline-none focus:border-havens-forest transition-colors placeholder:text-havens-muted/60"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-havens-muted mb-1.5">
                Password
              </label>
              <input
                type="password"
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                placeholder="Enter your password"
                className="w-full px-4 py-2.5 rounded-2xl bg-havens-cream border border-havens-sand text-havens-charcoal text-sm focus:outline-none focus:border-havens-forest transition-colors placeholder:text-havens-muted/60"
              />
            </div>

            <button
              type="submit"
              disabled={isAuthenticating}
              className="w-full py-3 px-4 rounded-2xl bg-havens-forest hover:bg-havens-forest/90 text-havens-cream font-medium text-sm transition-colors shadow-xs disabled:opacity-60 mt-2"
            >
              {isAuthenticating ? 'Connecting...' : 'Sign in'}
            </button>
          </form>
        )}

        {/* Footer */}
        <div className="mt-8 pt-4 border-t border-havens-sand/80 text-center text-[11px] text-havens-muted">
          connected to <span className="font-mono text-havens-forest">http://localhost:8000/graphql/</span>
        </div>
      </div>
    </div>
  )
}

export default App
