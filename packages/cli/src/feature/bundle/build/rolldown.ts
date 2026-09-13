import { spawn } from 'child_process'
import { createHash } from 'crypto'
import { existsSync } from 'fs'
import { readFile } from 'fs/promises'
import { dirname, extname, join } from 'path'
import { fileURLToPath } from 'url'
import { Minimatch } from 'minimatch'
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

// Rolldown retains memory of every build it runs in a process -
// regardless of bundle.close(), version or runtime - so long-lived
// processes like the dev server run each build in a short-lived
// child & the leak dies with it. One-shot runs without the prebuilt
// worker (like tests running from source) build in process.
export const bundleTypeScriptWithRolldown = async (props: BundleTypeScriptProps) => {
	const worker = findBuildWorker()

	if (!worker || process.env.AWSLESS_BUILD_IN_PROCESS) {
		return bundleTypeScriptInProcess(props)
	}

	return new Promise<{ hash: string; files: File[] }>((resolve, reject) => {
		const child = spawn('bun', [worker], {
			cwd: directories.root,
			stdio: ['pipe', 'pipe', 'pipe'],
		})

		const stdout: Buffer[] = []
		const stderr: Buffer[] = []

		child.stdout.on('data', chunk => stdout.push(chunk))
		child.stderr.on('data', chunk => stderr.push(chunk))

		child.on('error', reject)
		child.on('close', () => {
			try {
				const result = JSON.parse(Buffer.concat(stdout).toString()) as
					| { ok: true; hash: string; files: { name: string; code: string; map?: string }[] }
					| { ok: false; expected: boolean; message: string }

				if (!result.ok) {
					reject(result.expected ? new ExpectedError(result.message) : new Error(result.message))
					return
				}

				resolve({
					hash: result.hash,
					files: result.files.map(file => ({
						name: file.name,
						code: Buffer.from(file.code, 'base64'),
						map: file.map ? Buffer.from(file.map, 'base64') : undefined,
					})),
				})
			} catch {
				reject(new Error(`The build worker failed:\n${Buffer.concat(stderr).toString().slice(-2000)}`))
			}
		})

		child.stdin.end(JSON.stringify({ root: directories.root, props }))
	})
}

// The prebuilt worker sits next to the bundled cli in dist - or, when
// running from source, in the package's own dist folder.
let workerPath: string | false | undefined

const findBuildWorker = () => {
	if (workerPath === undefined) {
		const base = dirname(fileURLToPath(import.meta.url))
		workerPath =
			[
				join(base, 'handlers/rolldown-worker.js'),
				join(base, '../../../../dist/handlers/rolldown-worker.js'),
			].find(candidate => existsSync(candidate)) ?? false
	}

	return workerPath
}

export const bundleTypeScriptInProcess = async (props: BundleTypeScriptProps) => {
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

	let result
	try {
		result = await bundle.generate({
			format,
			sourcemap: 'hidden',
			exports: 'auto',
			minify,
			entryFileNames: `index.${extension}`,

			// No chunk grouping: importing anything from a chunk executes the
			// whole file, so merging all shared modules into one chunk would make
			// every cold start parse & run the shared code of every route.

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
		})
	} finally {
		// An unclosed bundle keeps its native threads & memory alive -
		// the dev server rebuilds on every save & leaked hundreds of MB.
		await bundle.close()
	}

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
