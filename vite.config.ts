import { defineConfig } from 'vite'

export default defineConfig({
  base: '/journal-prompts/',
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
  },
  server: {
    port: 3000,
    open: true
  }
})
