// Compile the vitest global setup into the published dist folder. It
// shares the bin externals, so the test mocks resolve to the same
// instances as the user's test files.

import pkg from '../package.json'

const external = [...Object.keys(pkg.dependencies), ...Object.keys(pkg.peerDependencies)]

const result = await Bun.build({
	entrypoints: ['src/test/test-global-setup.ts'],
	outdir: 'dist',
	naming: 'test-global-setup.js',
	target: 'node',
	format: 'esm',
	external,

	// Keep process.env reads as runtime lookups, otherwise Bun inlines
	// NODE_ENV as a "development" literal at build time.
	env: 'disable',
})

if (!result.success) {
	console.error('Failed to build the test setup')

	for (const message of result.logs) {
		console.error(message)
	}

	process.exit(1)
}
