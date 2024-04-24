import { rollup } from 'rollup'
import { swc, minify as swcMinify } from 'rollup-plugin-swc3'
import json from '@rollup/plugin-json'
import commonjs from '@rollup/plugin-commonjs'
import nodeResolve from '@rollup/plugin-node-resolve'
import { dirname } from 'path'
import { debugError } from '../../../../cli/debug.js'

export type RollupResolverProps = {
	minify?: boolean
}

export const buildTypeScriptResolver = async (input: string, { minify = true }: RollupResolverProps = {}) => {
	const bundle = await rollup({
		input,
		external: importee => {
			return (
				importee.startsWith('@aws-sdk') ||
				importee.startsWith('aws-sdk') ||
				importee.startsWith('@aws-appsync/utils')
			)
		},
		onwarn: error => {
			debugError(error.message)
		},
		treeshake: {
			moduleSideEffects: id => input === id,
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
					baseUrl: dirname(input),
					minify: { sourceMap: true },
				},
				sourceMaps: true,
			}),
			minify
				? swcMinify({
						module: true,
						sourceMap: true,
						compress: true,
				  })
				: undefined,
			// @ts-ignore
			json(),
		],
	})

	const result = await bundle.generate({
		format: 'esm',
		sourcemap: 'hidden',
		exports: 'auto',
		manualChunks: {},
		entryFileNames: `index.mjs`,
		chunkFileNames: `[name].mjs`,
	})

	let code: string

	for (const item of result.output) {
		// For now we ignore asset chunks...
		// I don't know what to do with assets yet.
		if (item.type !== 'chunk') {
			continue
		}

		code = item.code
	}

	return Buffer.from(code!, 'utf8')
}
