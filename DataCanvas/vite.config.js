import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath, URL } from 'node:url'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    vue(),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  },
  // This section is for local development to avoid CORS issues.
  // It tells Vite to proxy requests from your local server (e.g., /api/...)
  // to your actual backend on Render. This is not needed for the deployed
  // version on Vercel but is extremely helpful for coding on your machine.
  server: {
    proxy: {
      '/api': {
        target: 'https://datacanvas-api.onrender.com', // Your backend URL
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, '') // Removes /api prefix if your backend doesn't expect it
      }
    }
  }
})