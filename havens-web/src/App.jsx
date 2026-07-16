import React from 'react'

function App() {
  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-4">
      <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-2xl text-center">
        <h1 className="text-4xl font-extrabold mb-2 bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent">
          Havens
        </h1>
        <p className="text-sm font-semibold tracking-wider text-slate-500 uppercase mb-6">
          Web Frontend MVP
        </p>
        <div className="space-y-4 text-slate-300 mb-8">
          <p className="text-base">
            React + Vite + Tailwind + Apollo Client are fully scaffolded inside Docker.
          </p>
          <p className="text-sm text-slate-400 border-t border-slate-800 pt-4">
            Connected to GraphQL endpoint at:
            <code className="block mt-1 font-mono text-emerald-400 text-xs bg-slate-950 p-2 rounded">
              http://localhost:8000/graphql/
            </code>
          </p>
        </div>
        <div className="flex justify-center space-x-2">
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-emerald-400/10 text-emerald-400">
            Docker Active
          </span>
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-teal-400/10 text-teal-400">
            HMR Polling
          </span>
        </div>
      </div>
    </div>
  )
}

export default App
