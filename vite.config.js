import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react':    ['react', 'react-dom'],
          'vendor-recharts': ['recharts'],
          'vendor-utils':    ['clsx', 'date-fns'],
        },
      },
    },
    chunkSizeWarningLimit: 400,
  },
  server: {
    proxy: {
      '/.netlify/functions': {
        target: 'http://localhost:9999',
        changeOrigin: true,
      },
    },
  },
})
