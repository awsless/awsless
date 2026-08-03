import { generateFileHash } from '@awsless/ts-file-cache'
import { kebabCase } from 'change-case'
import { createHash } from 'crypto'
import { readFile, rm, writeFile } from 'fs/promises'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'
import { Builder, getBuildPath } from '../../build/index.js'
import { AppContext, StackContext } from '../../feature.js'
import { formatByteSize } from '../../util/byte-size.js'
import { createTempFolder } from '../../util/temp.js'
import { bundleTypeScriptWithRolldown, formatRouteModuleId } from './build/rolldown.js'

// The request header used to route web requests to the right bundle handler.
export const ROUTE_HEADER = 'x-awsless-route'

export const formatRouteKey = (stackName: string, resourceType: string, resourceName: string) => {
	return [stackName, resourceType, resourceName].map(v => kebabCase(v)).join(':')
}

export const parseExportName = (handler: string) => {
	return handler.split('.').slice(1).join('.') || 'default'
}

export const registerBundleFunction = (
	ctx: StackContext | AppContext,
	routeKey: string,
	props: {
		code: {
			file: string
			external?: string[]
			importAsString?: string[]
			moduleSideEffects?: string[]
		}
		handler?: string
	}
) => {
	const bundle = ctx.shared.get('bundle', 'main')

	bundle.addHandler({
		routeKey,
		file: props.code.file,
		exportName: parseExportName(props.handler ?? ctx.appConfig.defaults.function.handler!),
		external: props.code.external,
		importAsString: props.code.importAsString,
		moduleSideEffects: props.code.moduleSideEffects,
	})

	return bundle
}

export const buildBundle = (props: {
	name: string
	minify?: boolean
	external?: string[]
	handlers: {
		routeKey: string
		file: string // The file path of the handler code.
		exportName: string // The name of the exported method within the handler code.
		external?: string[]
		importAsString?: string[]
		moduleSideEffects?: string[]
	}[]

	// Overwrite the bundle runtime location for testing purposes.
	runtime?: string
}): Builder => {
	return async (build, { workspace }) => {
		const runtime = props.runtime ?? join(dirname(fileURLToPath(import.meta.url)), '/handlers/bundle.js')
		const handlers = [...props.handlers].sort((a, b) => a.routeKey.localeCompare(b.routeKey))

		// The entry file maps every route key to a lazy import, so a cold
		// start only loads the one handler being dispatched.
		//
		// The import query makes rolldown treat "file.ts?awsless-route=a" &
		// "file.ts?awsless-route=b" as two separate modules, giving every
		// route a private copy of its handler module. Module level state can
		// never leak between routes that share the same file, while only that
		// top module is copied & everything the handler imports is still
		// deduplicated into shared chunks.
		const entries = handlers.map(({ routeKey, file, exportName }) => {
			const virtualFile = JSON.stringify(formatRouteModuleId(file, routeKey))

			return `\t${JSON.stringify(routeKey)}: () => import(${virtualFile}).then(module => module[${JSON.stringify(exportName)}]),`
		})

		const entry = `import env from './awsless-env.mjs'

// The environment must be applied before the runtime & handlers are
// loaded, so the real lambda environment always wins over the bundled
// environment.
for (const name in env) {
	process.env[name] ??= env[name]
}

const { createBundle } = await import(${JSON.stringify(runtime)})

export default createBundle({
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
			.update(
				JSON.stringify([
					props.external,
					props.minify,
					handlers.map(h => [h.external, h.importAsString, h.moduleSideEffects]),
				])
			)

		for (const item of hashes) {
			hash.update(item)
		}

		const fingerprint = hash.digest('hex')

		return build(fingerprint, async write => {
			const temp = await createTempFolder(`bundle--${props.name}`)
			const entryFile = join(temp.path, 'entry.ts')

			await writeFile(entryFile, entry)

			const importAsString = handlers.flatMap(handler => handler.importAsString ?? [])
			const moduleSideEffects = handlers.flatMap(handler => handler.moduleSideEffects ?? [])
			const bundle = await bundleTypeScriptWithRolldown({
				file: entryFile,
				minify: props.minify,
				external: [
					'./awsless-env.mjs', // The env file is generated at deploy time.
					...(props.external ?? []),
					...handlers.flatMap(handler => handler.external ?? []),
				],
				importAsString: importAsString.length > 0 ? importAsString : undefined,
				moduleSideEffects: moduleSideEffects.length > 0 ? moduleSideEffects : undefined,
			})

			await temp.delete()

			// Clear out the stale chunks from the previous build.
			await rm(getBuildPath('bundle', props.name, 'files'), { recursive: true, force: true })

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
