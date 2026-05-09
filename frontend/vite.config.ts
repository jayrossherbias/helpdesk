import { defineConfig } from 'vite'
import path from 'path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'


function figmaAssetResolver() {
  return {
    name: 'figma-asset-resolver',
    resolveId(id) {
      if (id.startsWith('figma:asset/')) {
        const filename = id.replace('figma:asset/', '')
        return path.resolve(__dirname, 'src/assets', filename)
      }
    },
  }
}

// Strips pnpm-style versioned specifiers: "sonner@2.0.3" → "sonner"
function pnpmAliasResolver() {
  return {
    name: 'pnpm-alias-resolver',
    async resolveId(id, importer, options) {
      const match = id.match(/^((?:@[^@/]+\/)?[^@/][^@]*)@\d[\d.]*.*$/)
      if (match) {
        return this.resolve(match[1], importer, { skipSelf: true, ...options })
      }
    },
  }
}

export default defineConfig({
  plugins: [
    pnpmAliasResolver(),
    figmaAssetResolver(),
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    proxy: {
      '/api': 'http://localhost:8000',
    },
  },
})
