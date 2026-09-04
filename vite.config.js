import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Pages must keep base '/andale/'. Wrap/WKWebView rebuilds with base '/'.
// Do not flip this to '/' on the Pages build. No PrivacyInfo until Mon wrap.
export default defineConfig({
  plugins: [react()],
  base: '/andale/',
  test: {
    environment: 'jsdom',
    include: ['src/flows.test.jsx'],
  },
})
