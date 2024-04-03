import { rollup } from 'rollup'
import { createHash } from 'crypto'
import { swc, minify as swcMinify } from 'rollup-plugin-swc3'
import json from '@rollup/plugin-json'
import commonjs from '@rollup/plugin-commonjs'
import nodeResolve from '@rollup/plugin-node-resolve'
import { debugError } from '../../../../cli/debug.js'
import { dirname } from 'path'
import { File } from '../zip.js'

export type BundleTypeScriptProps = {
	format?: 'esm' | 'cjs'
	minify?: boolean
	handler?: string
	file: string
}

export const bundleTypeScript = async ({ format = 'esm', minify = true, file }: BundleTypeScriptProps) => {
	const bundle = await rollup({
		input: file,
		external: importee => {
			return importee.startsWith('@aws-sdk') || importee.startsWith('aws-sdk')
		},
		onwarn: error => {
			debugError(error.message)
		},
		treeshake: {
			preset: 'smallest',
			moduleSideEffects: id => file === id,
		},
		plugins: [
			// @ts-ignore
			commonjs({ sourceMap: true }),
			// @ts-ignore
			nodeResolve({ preferBuiltins: true }),
			swc({
				// minify,
				// module: true,
				jsc: {
					baseUrl: dirname(file),
					minify: { sourceMap: true },
				},
				sourceMaps: true,
			}),
			minify
				? swcMinify({
						module: format === 'esm',
						sourceMap: true,
						compress: true,
				  })
				: undefined,
			// @ts-ignore
			json(),
		],
	})

	const ext = format === 'esm' ? 'mjs' : 'js'
	const result = await bundle.generate({
		format,
		sourcemap: 'hidden',
		exports: 'auto',
		manualChunks: {},
		entryFileNames: `index.${ext}`,
		chunkFileNames: `[name].${ext}`,
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
