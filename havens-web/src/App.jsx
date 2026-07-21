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
    <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-4">
      <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-2xl">
        {/* Header */}
        <div className="text-center mb-6">
          <h1 className="text-4xl font-extrabold bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent">
            Havens Web
          </h1>
          <p className="text-xs font-semibold tracking-widest text-slate-500 uppercase mt-1">
            Authentication & Apollo Client Infrastructure
          </p>
        </div>

        {/* Loading State */}
        {isLoading ? (
          <div className="text-center py-8 text-slate-400 animate-pulse">
            Loading session status...
          </div>
        ) : user ? (
          /* Logged In State */
          <div className="space-y-6">
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
              <div className="flex items-center space-x-3 mb-3">
                <div className="h-10 w-10 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-lg">
                  {user.username ? user.username[0].toUpperCase() : 'U'}
                </div>
                <div>
                  <h3 className="font-bold text-white text-base">{user.username}</h3>
                  <p className="text-xs text-slate-400">{user.email}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs border-t border-slate-900 pt-3">
                <div>
                  <span className="text-slate-500 block">Total Points:</span>
                  <span className="font-semibold text-emerald-400">{user.totalPoints ?? 0} pts</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Neighbourhood:</span>
                  <span className="font-semibold text-slate-300">{user.neighbourhood || 'N/A'}</span>
                </div>
              </div>

              {user.bio && (
                <div className="mt-3 text-xs text-slate-400 italic">
                  "{user.bio}"
                </div>
              )}
            </div>

            <div className="bg-slate-950 p-3 rounded-lg border border-slate-900 text-xs">
              <span className="text-slate-500 font-mono block mb-1">JWT Header Status:</span>
              <span className="text-emerald-400 font-mono break-all line-clamp-2">
                Authorization: JWT {token}
              </span>
            </div>

            <button
              onClick={logout}
              className="w-full py-2.5 px-4 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 font-semibold text-sm transition-colors border border-rose-500/20"
            >
              Sign Out
            </button>
          </div>
        ) : (
          /* Login Form State */
          <form onSubmit={handleLoginSubmit} className="space-y-4">
            {errorMsg && (
              <div className="p-3 text-xs bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-lg">
                {errorMsg}
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Username</label>
              <input
                type="text"
                value={usernameInput}
                onChange={(e) => setUsernameInput(e.target.value)}
                placeholder="Enter username"
                className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm focus:outline-none focus:border-emerald-500 transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Password</label>
              <input
                type="password"
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                placeholder="Enter password"
                className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm focus:outline-none focus:border-emerald-500 transition-colors"
              />
            </div>

            <button
              type="submit"
              disabled={isAuthenticating}
              className="w-full py-2.5 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold text-sm transition-colors disabled:opacity-50"
            >
              {isAuthenticating ? 'Authenticating...' : 'Sign In'}
            </button>
          </form>
        )}

        {/* Footer info */}
        <div className="mt-8 pt-4 border-t border-slate-800/60 text-center text-[10px] text-slate-500">
          Backend Endpoint: <span className="font-mono text-slate-400">http://localhost:8000/graphql/</span>
        </div>
      </div>
    </div>
  )
}

export default App
