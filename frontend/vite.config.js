import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig(({ mode }) => {
  const rootEnv = loadEnv(mode, path.resolve(__dirname, '..'), '')
  const localEnv = loadEnv(mode, path.resolve(__dirname), '')
  const githubToken = localEnv.VITE_GITHUB_TOKEN || rootEnv.VITE_GITHUB_TOKEN || ''

  return {
    plugins: [react()],
    define: {
      'import.meta.env.VITE_GITHUB_TOKEN': JSON.stringify(githubToken),
    },
    server: {
      proxy: {
        '/api': {
          target: 'http://127.0.0.1:8000',
          changeOrigin: true,
        },
      },
    },
  }
})
