import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    // Raise the warning threshold to 700kB (chunks below this won't warn)
    chunkSizeWarningLimit: 700,
    rollupOptions: {
      output: {
        // Code-split vendor libraries into separate chunks for better caching
        manualChunks: {
          // Core React runtime - almost never changes
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          // Supabase client - large but rarely changes
          'vendor-supabase': ['@supabase/supabase-js'],
          // Lucide icons - large SVG library
          'vendor-lucide': ['lucide-react'],
        },
      },
    },
  },
})
