// import nodeResolve from '@rollup/plugin-node-resolve'
import { createHash } from 'crypto'
import { readFile } from 'fs/promises'
import { extname } from 'path'
import { rolldown } from 'rolldown'
// import natives from 'rollup-plugin-natives'
import { importAsString } from 'rollup-plugin-string-import'
import { debugError } from '../../../cli/debug.js'
import { directories } from '../../../util/path.js'
import { File } from './zip.js'

export type BundleTypeScriptProps = {
	format?: 'esm' | 'cjs'
	minify?: boolean
	external?: string[]
	handler?: string
	file: string
	importAsString?: string[]
}

export const bundleTypeScriptWithRolldown = async ({
	format = 'esm',
	minify = true,
	file,
	external,
	importAsString: importAsStringList,
}: BundleTypeScriptProps) => {
	const bundle = await rolldown({
		input: file,
		platform: 'node',
		external: importee => {
			return importee.startsWith('@aws-sdk') || importee.startsWith('aws-sdk') || external?.includes(importee)
		},
		treeshake: {
			// The @awsless packages are pure clients, but their entry points
			// also export test helpers that pull in local server
			// implementations like dynamo-db-local, which crash the ESM
			// runtime with CJS globals like __dirname. Treating the scope as
			// side-effect free prunes those unused chains from production
			// bundles, while every other dependency keeps its import side
			// effects, like the fs patching of graceful-fs.
			moduleSideEffects: (id, isExternal) => {
				if (isExternal) {
					return external?.includes(id) === true
				}

				if (id.includes('/node_modules/@awsless/')) {
					return false
				}

				if (id.includes('/node_modules/')) {
					return true
				}

				return id.startsWith(`${directories.root}/`)
			},
		},
		onwarn: error => {
			debugError(error.message)
		},
		plugins: [
			{
				name: 'route-module',
				resolveId(source) {
					return source.includes('?awsless-route=') ? source : undefined
				},
				async load(id) {
					const index = id.indexOf('?awsless-route=')

					if (index === -1) {
						return
					}

					const file = id.slice(0, index)
					const extension = extname(file)
					const typescript = ['.ts', '.mts', '.cts'].includes(extension)

					return {
						code: await readFile(file, 'utf8'),
						moduleType: extension === '.tsx' ? 'tsx' : extension === '.jsx' ? 'jsx' : typescript ? 'ts' : 'js',
					}
				},
			},
			// nodeResolve({ preferBuiltins: true }),
			// nativeDir
			// 	? natives({
			// 			copyTo: nativeDir,
			// 			targetEsm: format === 'esm',
			// 			sourcemap: true,
			// 		})
			// 	: undefined,
			importAsStringList
				? importAsString({
						include: importAsStringList,
					})
				: undefined,
		],
	})

	const ext = format === 'esm' ? 'mjs' : 'js'
	const result = await bundle.generate({
		format,
		sourcemap: 'hidden',
		exports: 'auto',
		entryFileNames: `index.${ext}`,
		chunkFileNames: `[name].${ext}`,
		minify,
	})

	assertNoTestOnlyModules(result.output)

	const hash = createHash('sha1')
	const files: File[] = []

	for (const item of result.output) {
		// For now we ignore asset chunks...
		// I don't know what to do with assets yet.

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

// Local test servers must never ship inside a production bundle. They spawn
// processes, rely on CJS globals like __dirname, and crash the ESM runtime.
const TEST_ONLY_MODULES = ['dynamo-db-local', '@awsless/dynamodb-server', 'redis-memory-server']

const assertNoTestOnlyModules = (output: Array<{ type: string; moduleIds?: string[] }>) => {
	for (const item of output) {
		if (item.type !== 'chunk') {
			continue
		}

		for (const id of item.moduleIds ?? []) {
			const found = TEST_ONLY_MODULES.find(name => id.includes(`/node_modules/${name}/`))

			if (found) {
				throw new Error(
					`The test-only package "${found}" was bundled into a production build through "${id}". ` +
						'Remove the import from the handler, or keep the package tree-shakeable.'
				)
			}
		}
	}
}
