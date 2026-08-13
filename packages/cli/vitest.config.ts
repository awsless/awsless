import { defineConfig } from 'vitest/config'

export default defineConfig({
	test: {
		globals: true,
		watch: false,
		include: ['./test/**/*.test.ts'],
		setupFiles: ['./src/test/test-global-setup.ts'],
	},
})
