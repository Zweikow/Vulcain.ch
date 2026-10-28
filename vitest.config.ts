import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'
import tsconfigPaths from 'vite-tsconfig-paths'

export default defineConfig({
  plugins: [tsconfigPaths()],
  resolve: {
    alias: {
      // « server-only » lève une erreur hors d'un rendu serveur React : neutre en test
      'server-only': fileURLToPath(new URL('./node_modules/server-only/empty.js', import.meta.url)),
    },
  },
  test: {
    globals: true,
    environment: 'node',
  },
})
