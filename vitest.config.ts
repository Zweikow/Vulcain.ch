import { defineConfig } from 'vitest/config'
import tsconfigPaths from 'vite-tsconfig-paths'

export default defineConfig({
  plugins: [tsconfigPaths()],
  // Même transformation JSX que Next : les composants n'importent pas React.
  esbuild: { jsx: 'automatic' },
  test: {
    globals: true,
    environment: 'node',
  },
})
