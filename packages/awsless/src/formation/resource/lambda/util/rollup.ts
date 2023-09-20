
import { rollup } from "rollup"
import { createHash } from "crypto"
import { swc } from 'rollup-plugin-swc3';
import json from '@rollup/plugin-json'
import commonjs from '@rollup/plugin-commonjs'
import nodeResolve from '@rollup/plugin-node-resolve'
import { debugError } from '../../../../cli/logger.js';
import { CodeBundle } from "../code.js";
import { dirname } from "path";

export const rollupBundle:CodeBundle = async (input) => {
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
			commonjs({ sourceMap: true }),
			nodeResolve({ preferBuiltins: true }),
			swc({
				minify: true,
				jsc: {
					baseUrl: dirname(input),
					minify: { sourceMap: true }
				},
				sourceMaps: true,
			}),
			json(),
		],
	})

	const result = await bundle.generate({
		format: 'esm',
		sourcemap: 'hidden',
		exports: 'default',
	})

	const output = result.output[0]
	const code = output.code
	const map = output.map?.toString()
	const hash = createHash('sha1').update(code).digest('hex')

	return {
		handler: 'index.default',
		hash,
		files: [{
			name: 'index.mjs',
			code,
			map,
		}]
	}
}
