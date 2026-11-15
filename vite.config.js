import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// `npm run dev:live` sets VITE_API_URL=/api; this proxies it to the local API (backend/local-server.js).
export default defineConfig({
  plugins: [react()],
  server: { proxy: { '/api': `http://localhost:${process.env.API_PORT || 8787}` } },
})
