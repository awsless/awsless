import { createHash } from 'crypto'
import { rolldown } from 'rolldown'
import { debugError } from '../../../../cli/debug.js'
import { File } from '../zip.js'

export type BundleTypeScriptProps = {
	format?: 'esm' | 'cjs'
	minify?: boolean
	external?: string[]
	handler?: string
	file: string
}

export const bundleTypeScript = async ({ format = 'esm', minify = true, file, external }: BundleTypeScriptProps) => {
	const bundle = await rolldown({
		input: file,
		external: importee => {
			return importee.startsWith('@aws-sdk') || importee.startsWith('aws-sdk') || external?.includes(importee)
		},
		onwarn: error => {
			debugError(error.message)
		},
		// treeshake: {
		// 	// preset: 'smallest',
		// 	// moduleSideEffects: id => file === id,
		// },
		treeshake: {
			moduleSideEffects: false,
		},
		platform: 'node',
		plugins: [
			// commonjs({ sourceMap: true }),
			// nodeResolve({ preferBuiltins: true }),
			// json(),
		],
	})

	const ext = format === 'esm' ? 'mjs' : 'js'
	const result = await bundle.generate({
		format,
		sourcemap: 'hidden',
		exports: 'auto',
		// manualChunks: {},
		entryFileNames: `index.${ext}`,
		chunkFileNames: `[name].${ext}`,
		banner: [
			`import __node_module__ from 'node:module';`,
			`const require = __node_module__.createRequire(import.meta.url)`,
		].join('\n'),
		minify,
	})

	const hash = createHash('sha1')
	const files: File[] = []

	for (const item of result.output) {
		// For now we ignore asset chunks...
		// I don't know what to do with assets yet.
		if (item.type !== 'chunk') {
			continue
		}

		// const base = item.isEntry ? 'index' : item.name
		// const name = `${ base }.${ ext }`
		const code = Buffer.from(item.code, 'utf8')
		const map = item.map ? Buffer.from(item.map.toString(), 'utf8') : undefined

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
