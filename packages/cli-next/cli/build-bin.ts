// Compile the published bin into a single self-contained file. Every
// devDependency is bundled in, while the dependencies & peerDependencies
// stay external & resolve at runtime from the installed package.

import { rm } from 'fs/promises'
import pkg from '../package.json'

await rm('dist', { recursive: true, force: true })

const result = await Bun.build({
	entrypoints: ['src/bin.ts'],
	outdir: 'dist',
	naming: 'bin.js',
	target: 'bun',
	format: 'esm',
	external: [...Object.keys(pkg.dependencies), ...Object.keys(pkg.peerDependencies)],
})

if (!result.success) {
	console.error('Failed to build the bin')

	for (const message of result.logs) {
		console.error(message)
	}

	process.exit(1)
}
