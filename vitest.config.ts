import { defineConfig } from 'vitest/config'
import tsconfigPaths from 'vite-tsconfig-paths'

export default defineConfig({
    plugins: [tsconfigPaths()],
    test: {
        setupFiles: ["/tests/test.setup.ts"],
        coverage: {
            include: ["src/**/*.ts"],
        },
        testTimeout: 10000,
    },
})