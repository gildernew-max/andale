import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Pages must keep base '/andale/'. Wrap/WKWebView rebuilds with base '/'.
// Do not flip this to '/' on the Pages build (`npm run build` / pages.yml).
// ANDALE_WRAP=1 (`npm run build:wrap`) emits base '/' for Capacitor webDir.
export function andaleViteBase(env = process.env) {
  return env.ANDALE_WRAP === '1' ? '/' : '/andale/'
}

export default defineConfig({
  plugins: [react()],
  base: andaleViteBase(),
  test: {
    environment: 'jsdom',
    include: ['src/flows.test.jsx', 'src/GlossedText.test.jsx', 'src/WinBounce.test.jsx'],
  },
})
