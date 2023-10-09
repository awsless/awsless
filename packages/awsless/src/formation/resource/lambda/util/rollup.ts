
import { rollup } from "rollup"
import { createHash } from "crypto"
import { swc, minify } from 'rollup-plugin-swc3';
import json from '@rollup/plugin-json'
import commonjs from '@rollup/plugin-commonjs'
import nodeResolve from '@rollup/plugin-node-resolve'
import { debugError } from '../../../../cli/logger.js';
import { CodeBundle } from '../code.js';
import { dirname } from "path";

export type RollupBundlerProps = {
	format?: 'esm' | 'cjs'
	minify?: boolean
	handler?: string
}

export const rollupBundle = ({ format = 'esm', minify2 = true, handler = 'index.default' }: RollupBundlerProps = {}): CodeBundle => {
	return async (input) => {
		const bundle = await rollup({
			input,
			external: (importee) => {
				return (importee.startsWith('@aws-sdk') || importee.startsWith('aws-sdk'))
			},
			onwarn: (error) => {
				debugError(error.message)
			},
			treeshake: {
				moduleSideEffects: (id) => input === id,
			},
			plugins: [
				// @ts-ignore
				commonjs({ sourceMap: true }),
				// @ts-ignore
				nodeResolve({ preferBuiltins: true }),
				minify({
					module: true,
					sourceMap: true,
				}),
				swc({
					// minify,
					jsc: {
						baseUrl: dirname(input),
						minify: { sourceMap: true }
					},
					sourceMaps: true,
				}),
				// @ts-ignore
				json(),
			],
		})

		const result = await bundle.generate({
			format,
			sourcemap: 'hidden',
			exports: 'auto',
			esModule: true
		})

		const output = result.output[0]
		const code = Buffer.from(output.code, 'utf8')
		const map = output.map ? Buffer.from(output.map.toString(), 'utf8') : undefined
		const hash = createHash('sha1').update(code).digest('hex')

		return {
			handler,
			hash,
			files: [{
				name: format === 'esm' ? 'index.mjs' : 'index.js',
				code,
				map,
			}]
		}
	}
}
