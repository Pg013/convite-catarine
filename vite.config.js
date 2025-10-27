import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/', // Corrige caminhos de assets no deploy
  build: {
    outDir: 'dist', // Pasta de output
    emptyOutDir: true, // Limpa antes do build
  },
})