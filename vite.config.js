import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { andaleBuildFromSha } from './src/buildId.js'

// Pages must keep base '/andale/'. Wrap/WKWebView rebuilds with base '/'.
// Do not flip this to '/' on the Pages build (`npm run build` / pages.yml).
// ANDALE_WRAP=1 (`npm run build:wrap`) emits base '/' for Capacitor webDir.
export function andaleViteBase(env = process.env) {
  return env.ANDALE_WRAP === '1' ? '/' : '/andale/'
}

function packageVersion() {
  return JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8')).version
}

function gitShortSha() {
  try {
    return execFileSync('git', ['rev-parse', '--short=7', 'HEAD'], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim()
  } catch {
    return ''
  }
}

// Pages build job inherits GITHUB_SHA. A depth-1 checkout still has that env var.
export function andaleBuildDefine(env = process.env) {
  const fromEnv = String(env.GITHUB_SHA || '').trim()
  return andaleBuildFromSha(fromEnv || gitShortSha(), packageVersion())
}

export default defineConfig({
  plugins: [react()],
  base: andaleViteBase(),
  define: {
    __ANDALE_BUILD__: JSON.stringify(andaleBuildDefine()),
  },
  test: {
    environment: 'jsdom',
    // Any src/**/*.test.jsx is collected. Node scripts src/*.test.js stay on `npm test`.
    include: ['src/**/*.test.jsx'],
    // The old flows.test.jsx file held one worker for ~10 minutes. Cap the pool at 4
    // so a larger runner does not fan out to one worker per file.
    maxWorkers: 4,
  },
})
