import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// Plugin para remover versões explícitas dos imports
function removeVersionFromImports() {
  return {
    name: 'remove-version-from-imports',
    enforce: 'pre' as const,
    resolveId(source: string) {
      // Remove versões do tipo package@x.y.z
      const match = source.match(/^(.+)@\d+\.\d+\.\d+(.*)$/)
      if (match) {
        const packageName = match[1]
        const subpath = match[2] || ''
        return this.resolve(packageName + subpath, undefined, { skipSelf: true })
      }
      return null
    },
  }
}

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [removeVersionFromImports(), react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './'),
    },
    extensions: ['.tsx', '.ts', '.jsx', '.js', '.json'],
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          supabase: ['@supabase/supabase-js'],
        },
      },
    },
  },
  server: {
    port: 3000,
    host: true,
  },
})