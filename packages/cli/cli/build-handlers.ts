// Compile the internal bundle handlers into the published dist folder.
// Package imports are bundled in, except the peer packages that must
// keep their bare imports & join the same module graph as the user
// handlers when the app bundle is built, plus the packages provided by
// the lambda runtime & layers.

import { createHash } from 'crypto'
import { mkdir, writeFile } from 'fs/promises'
import JSZip from 'jszip'
import pkg from '../package.json'

const external = [...Object.keys(pkg.peerDependencies), '@aws-sdk/*', 'sharp']

const handlers: {
	name: string
	entry: string
	external?: string[]
	target?: 'node' | 'bun'
}[] = [
	{ name: 'bundle', entry: 'src/feature/bundle/server/handle.ts' },
	{ name: 'rpc', entry: 'src/feature/rpc/server/handle.ts' },
	{ name: 'image', entry: 'src/feature/image/server/handle.ts' },
	{ name: 'icon', entry: 'src/feature/icon/server/handle.ts' },
	{ name: 'on-error-log', entry: 'src/feature/on-error-log/server/handle.ts' },
	{ name: 'pubsub-publisher', entry: 'src/feature/pubsub/publisher/handle.ts' },

	// The pubsub server runs as a bun executable on fargate, so its
	// bundle is fully self-contained.
	{ name: 'pubsub-server', entry: 'src/feature/pubsub/server/index.ts', external: [], target: 'bun' },
]

for (const { name, entry, ...options } of handlers) {
	const result = await Bun.build({
		external,
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

// ------------------------------------------------------------
// Handlers that run in their own lambda outside of the app bundle ship
// as fully self-contained zip archives, with only the packages provided
// by the lambda runtime left out.

const prebuilds = [
	{ name: 'on-failure', entry: 'src/feature/on-failure/server/handle.ts' },
	{ name: 'sandbox-proxy', entry: 'src/feature/function/server/sandbox-proxy.ts' },
]

for (const { name, entry } of prebuilds) {
	const result = await Bun.build({
		external: ['@aws-sdk/*'],
		target: 'node',
		minify: true,
		entrypoints: [entry],
		naming: 'index.mjs',
		format: 'esm',
	})

	if (!result.success) {
		console.error(`Failed to build the "${name}" prebuild`)

		for (const message of result.logs) {
			console.error(message)
		}

		process.exit(1)
	}

	const code = Buffer.from(await result.outputs[0]!.arrayBuffer())

	const zip = new JSZip()
	// A fixed file date keeps the archive identical between builds.
	zip.file('index.mjs', code, { date: new Date(0) })

	const archive = await zip.generateAsync({
		type: 'nodebuffer',
		compression: 'DEFLATE',
		compressionOptions: {
			level: 9,
		},
	})

	const directory = `dist/prebuild/${name}`

	await mkdir(directory, { recursive: true })
	await Promise.all([
		writeFile(`${directory}/bundle.zip`, archive),
		writeFile(`${directory}/HASH`, createHash('sha1').update(code).digest('hex')),
	])
}
