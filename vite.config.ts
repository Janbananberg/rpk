/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import path from 'path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      // Alias @ to the src directory
      '@': path.resolve(__dirname, './src'),
    },
  },

  // File types to support raw imports. Never add .css, .tsx, or .ts files to this.
  assetsInclude: ['**/*.svg', '**/*.csv'],

  server: {
    // Agent worktrees live under .claude/ and Wrangler's local state under .wrangler/ —
    // changes there must not reload the app.
    watch: { ignored: ['**/.claude/**', '**/.wrangler/**'] },
  },

  test: {
    // Only the app's own tests — not copies in agent worktrees under .claude/
    include: ['src/**/*.test.ts'],
  },
})
