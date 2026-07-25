// Compile the internal bundle handlers into the published dist folder.
// Every package import stays external, so the emitted files keep their
// bare imports and join the same module graph as the user handlers when
// the app bundle is built.

export {}

const handlers = [
	{ name: 'bundle', entry: 'src/feature/bundle/server/handle.ts' },
	{ name: 'rpc', entry: 'src/feature/rpc/server/handle.ts' },
	{ name: 'image', entry: 'src/feature/image/server/handle.ts' },
	{ name: 'icon', entry: 'src/feature/icon/server/handle.ts' },
	{ name: 'on-failure', entry: 'src/feature/on-failure/server/handle.ts' },
	{ name: 'on-error-log', entry: 'src/feature/on-error-log/server/handle.ts' },
	{ name: 'pubsub-publisher', entry: 'src/feature/pubsub/publisher/handle.ts' },

	// The pubsub server runs as a bun executable on fargate, so its bundle
	// is self-contained instead of joining the app module graph.
	{ name: 'pubsub-server', entry: 'src/feature/pubsub/server/index.ts', packages: 'bundle', target: 'bun' },
] as const

for (const { name, entry, ...options } of handlers) {
	const result = await Bun.build({
		packages: 'external',
		target: 'node',
		...options,
		entrypoints: [entry],
		outdir: 'dist/handlers',
		naming: `${name}.js`,
		format: 'esm',
	})

	if (!result.success) {
		console.error(`Failed to build the "${name}" handler`)

		for (const message of result.logs) {
			console.error(message)
		}

		process.exit(1)
	}
}
