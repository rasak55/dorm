import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { viteSingleFile } from 'vite-plugin-singlefile'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const rawUrl = env.VITE_GAS_URL || ''

  let gasOrigin = 'https://script.google.com'
  let gasPathPrefix = '/macros/s'

  if (rawUrl) {
    try {
      const u = new URL(rawUrl)
      gasOrigin = u.origin
      gasPathPrefix = u.pathname   // e.g. /macros/s/AKfycb.../exec
    } catch { /* ignore invalid URL */ }
  }

  return {
    plugins: [react(), viteSingleFile()],
    base: '/dorm/',
    server: {
      proxy: {
        '/gas': {
          target: gasOrigin,
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/gas/, gasPathPrefix),
        },
      },
    },
  }
})
