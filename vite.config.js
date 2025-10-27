import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/', // Essencial pro deploy no Vercel
  build: {
    outDir: 'dist', // Pasta de output do build
    emptyOutDir: true, // Limpa a pasta antes do build
  },
})