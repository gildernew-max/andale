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
    // Any src/**/*.test.jsx is collected. Node scripts src/*.test.js stay on `npm test`.
    include: ['src/**/*.test.jsx'],
    // The old flows.test.jsx file held one worker for ~10 minutes. Cap the pool at 4
    // so a larger runner does not fan out to one worker per file.
    maxWorkers: 4,
  },
})
