import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  return {
    plugins: [react()],

    // Development server config (only used in local dev / Docker dev)
    server: {
      host: true,
      port: 5173,
      watch: {
        usePolling: true,
      },
    },

    // Production build config
    build: {
      outDir: 'dist',
      sourcemap: false,   // No sourcemaps in production (security)
      minify: 'terser',
      chunkSizeWarningLimit: 1600,
      rollupOptions: {
        output: {
          // Split vendor chunks for better caching
          manualChunks(id) {
            if (id.includes('node_modules')) {
              if (id.includes('@apollo') || id.includes('graphql')) return 'apollo'
              if (id.includes('react-dom') || id.includes('react-router')) return 'react'
              if (id.includes('@react-google-maps')) return 'maps'
              return 'vendor'
            }
          },
        },
      },
    },

    // Environment variable prefix exposed to client code
    envPrefix: 'VITE_',
  }
})
