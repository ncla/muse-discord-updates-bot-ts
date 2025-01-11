import { defineConfig } from 'vitest/config'

export default defineConfig({
    test: {
        setupFiles: ["/tests/test.setup.ts"],
        coverage: {
            include: ["src/**/*.ts"],
        },
        testTimeout: 10000,
    },
})