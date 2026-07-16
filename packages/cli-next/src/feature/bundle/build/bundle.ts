import { generateFileHash } from '@awsless/ts-file-cache'
import { createHash } from 'crypto'
import { readFile, rm, writeFile } from 'fs/promises'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'
import { Builder, getBuildPath } from '../../../build/index.js'
import { formatByteSize } from '../../../util/byte-size.js'
import { createTempFolder } from '../../../util/temp.js'
import type { BundleHandler } from '../util.js'
import { bundleTypeScriptWithRolldown } from './rolldown.js'

type BuildBundleProps = {
	name: string
	minify?: boolean
	external?: string[]
	handlers: BundleHandler[]

	// Overwrite the bundle runtime location for testing purposes.
	runtime?: string
}

// The internal handlers are precompiled into the dist folder.
export const internalHandler = (name: string) => {
	return join(dirname(fileURLToPath(import.meta.url)), `handlers/${name}.mjs`)
}

const bundleRuntime = internalHandler('bundle')

// Build all handlers into a single code bundle behind a generated entry file.

export const buildBundle = (props: BuildBundleProps): Builder => {
	return async (build, { workspace }) => {
		const runtime = props.runtime ?? bundleRuntime
		const handlers = [...props.handlers].sort((a, b) => a.routeKey.localeCompare(b.routeKey))

		// The entry file lazily imports every handler behind its route key.
		// The route query virtualizes the handler file per route, so module
		// level state is never shared between routes using the same file.
		const entries = handlers.map(({ routeKey, file, exportName }) => {
			const load = `() => import(${JSON.stringify(`${file}?awsless-route=${encodeURIComponent(routeKey)}`)}).then(module => module[${JSON.stringify(exportName)}])`

			return `\t${JSON.stringify(routeKey)}: ${load},`
		})

		const entry = `import { createBundle } from ${JSON.stringify(runtime)}
import env from './awsless-env.mjs'

export default createBundle(env, {
${entries.join('\n')}
})
`
		const hashes = await Promise.all([
			readFile(runtime),
			...handlers.map(handler =>
				dirname(handler.file) === dirname(runtime)
					? readFile(handler.file)
					: generateFileHash(workspace, handler.file)
			),
		])

		const hash = createHash('sha1')
			.update(entry)
			.update(JSON.stringify([props.external, props.minify, handlers.map(h => [h.external, h.importAsString])]))

		for (const item of hashes) {
			hash.update(item)
		}

		const fingerprint = hash.digest('hex')

		return build(fingerprint, async write => {
			const temp = await createTempFolder(`bundle--${props.name}`)
			const entryFile = join(temp.path, 'entry.ts')

			await writeFile(entryFile, entry)

			const importAsString = handlers.flatMap(handler => handler.importAsString ?? [])
			const bundle = await bundleTypeScriptWithRolldown({
				file: entryFile,
				minify: props.minify,
				external: [
					'./awsless-env.mjs', // The env file is generated at deploy time.
					...(props.external ?? []),
					...handlers.flatMap(handler => handler.external ?? []),
				],
				importAsString: importAsString.length > 0 ? importAsString : undefined,
			})

			await temp.delete()

			// Clear out the stale chunks from the previous build.
			await rm(getBuildPath('function', props.name, 'files'), { recursive: true, force: true })

			await Promise.all([
				write('HASH', bundle.hash),
				...bundle.files.map(file => write(`files/${file.name}`, file.code)),
				...bundle.files.map(file => file.map && write(`files/${file.name}.map`, file.map)),
			])

			return {
				size: formatByteSize(bundle.files.reduce((total, file) => total + file.code.byteLength, 0)),
			}
		})
	}
}
