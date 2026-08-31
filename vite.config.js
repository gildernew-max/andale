import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/andale/',
  test: {
    environment: 'jsdom',
    include: ['src/flows.test.jsx'],
  },
})
