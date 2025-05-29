import { defineConfig } from 'vitest/config'

export default defineConfig({
	test: {
		watch: false,
		globals: true,
		include: ['./test/**'],
		setupFiles: ['./src/test/test-global-setup.ts'],
	},
})
