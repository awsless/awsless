import { createHash } from 'crypto'
import { readFile } from 'fs/promises'
import { Minimatch } from 'minimatch'
import { extname } from 'path'
import { Plugin, rolldown } from 'rolldown'
import { importAsString } from 'rollup-plugin-string-import'
import { debugError } from '../../../cli/debug.js'
import { ExpectedError } from '../../../error.js'
import { directories } from '../../../util/path.js'
import { File } from './zip.js'

// Importing a handler file with this query makes rolldown treat it as a
// separate module per route, giving every route a private copy of its
// top-level module state.
const ROUTE_MODULE_QUERY = '?awsless-route='

export const formatRouteModuleId = (file: string, routeKey: string) => {
	return `${file}${ROUTE_MODULE_QUERY}${encodeURIComponent(routeKey)}`
}

export type BundleTypeScriptProps = {
	format?: 'esm' | 'cjs'
	minify?: boolean
	external?: string[]
	moduleSideEffects?: string[]
	handler?: string
	file: string
	importAsString?: string[]
}

const createModuleMatcher = (patterns: string[] = []) => {
	const globs = patterns.map(pattern => {
		return new Minimatch(pattern.replaceAll('\\', '/'), { dot: true })
	})

	return (id: string) => {
		const path = id.replaceAll('\\', '/')

		return globs.some(glob => glob.match(path))
	}
}

export const bundleTypeScriptWithRolldown = async (props: BundleTypeScriptProps) => {
	const { format = 'esm', minify = true } = props
	const hasModuleSideEffects = createModuleMatcher(props.moduleSideEffects)

	const bundle = await rolldown({
		input: props.file,
		platform: 'node',
		// The bundle never runs under a test runner, so IS_TEST style
		// branches fold to false & tree-shake out of the bundle.
		transform: {
			define: {
				'process.env.NODE_ENV': JSON.stringify('production'),
			},
		},
		external: importee => {
			return (
				importee.startsWith('@aws-sdk') || //
				importee.startsWith('aws-sdk') ||
				props.external?.includes(importee)
			)
		},
		treeshake: {
			// Dependencies are treated as side-effect free, so unused imports
			// like the local test servers never reach the production bundle.
			moduleSideEffects: (id, isExternal) =>
				isExternal
					? props.external?.includes(id) === true
					: hasModuleSideEffects(id) ||
						(id.startsWith(`${directories.root}/`) && !id.includes('/node_modules/')),
		},
		onwarn: error => {
			// Only a warning, so the bare specifier would ship & fail on first request.
			if (error.code === 'UNRESOLVED_IMPORT') {
				throw new ExpectedError(error.message)
			}

			debugError(error.message)
		},
		plugins: [
			routeModulePlugin(),
			props.importAsString
				? importAsString({
						include: props.importAsString,
					})
				: undefined,
		],
	})

	const extension = format === 'esm' ? 'mjs' : 'js'
	const result = await bundle.generate({
		format,
		sourcemap: 'hidden',
		exports: 'auto',
		minify,
		entryFileNames: `index.${extension}`,

		// Handler chunks are named after their route key, with the ":"
		// separator swapped for "--" to keep the file name portable.
		chunkFileNames: chunk => {
			const encodedRouteKey = chunk.facadeModuleId?.split(ROUTE_MODULE_QUERY)[1]

			if (!encodedRouteKey) {
				return `[name].${extension}`
			}

			const routeKey = decodeURIComponent(encodedRouteKey)

			return `${routeKey.replaceAll(':', '--')}.${extension}`
		},
		codeSplitting: {
			// Every dynamically imported handler stays a chunk of its own,
			// while all modules used by more than one handler collapse into
			// a single shared chunk.
			groups: [
				{
					name: 'shared',
					minShareCount: 2,
				},
			],
		},
	})

	// -------------------------------------------------
	// Generate output

	const hash = createHash('sha1')
	const files: File[] = []

	for (const item of result.output) {
		// Asset outputs are ignored, we don't emit or use them yet.
		if (item.type !== 'chunk') {
			continue
		}

		const code = Buffer.from(item.code, 'utf8')
		const map = item.map ? Buffer.from(item.map.toString(), 'utf8') : undefined

		hash.update(item.fileName)
		hash.update(code)

		files.push({
			name: item.fileName,
			code,
			map,
		})
	}

	return {
		hash: hash.digest('hex'),
		files,
	}
}

// Resolves & loads route module imports by stripping the query and
// reading the underlying handler file.
const routeModulePlugin = (): Plugin => ({
	name: 'route-module',
	resolveId(source) {
		return source.includes(ROUTE_MODULE_QUERY) ? source : undefined
	},
	async load(id) {
		const [file, routeKey] = id.split(ROUTE_MODULE_QUERY)

		if (!file || !routeKey) {
			return
		}

		const extension = extname(file)

		return {
			code: await readFile(file, 'utf8'),
			// The query hides the file extension from rolldown, so the module
			// type must be given explicitly. Plain javascript parses fine as
			// typescript, so "ts" covers both.
			moduleType: extension === '.tsx' ? 'tsx' : extension === '.jsx' ? 'jsx' : 'ts',
		}
	},
})
