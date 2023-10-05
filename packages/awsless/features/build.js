import { mkdir, readdir, writeFile } from 'fs/promises'
import { basename, join } from 'path'
import { rollup } from 'rollup'
import { swc } from 'rollup-plugin-swc3'
import json from '@rollup/plugin-json'
import commonjs from '@rollup/plugin-commonjs'
import nodeResolve from '@rollup/plugin-node-resolve'
import { dirname } from 'path'
import JSZip from 'jszip'

const main = async () => {
	const path = './features/functions'
	const functions = await readdir(path)
	const output = join(process.cwd(), 'dist/features')

	await mkdir(output, { recursive: true })

	for (const func of functions) {
		const code = await rollupBundle(join(path, func))
		// const bundle = await zip(code)

		await writeFile(join(output, basename(func, '.ts') + '.js'), code)
		// await writeFile(join(output, basename(func, '.ts') + '.zip'), bundle)

		console.log(func)
	}
}

main()

// const zip = code => {
// 	const zip = new JSZip()
// 	zip.file('index.mjs', code)

// 	return zip.generateAsync({
// 		type: 'nodebuffer',
// 		compression: 'DEFLATE',
// 		compressionOptions: {
// 			level: 9,
// 		},
// 	})
// }

const rollupBundle = async input => {
	const bundle = await rollup({
		input,
		external: importee => {
			return importee.startsWith('@aws-sdk') || importee.startsWith('aws-sdk')
		},
		onwarn: error => {
			// console.warn(error.message)
		},
		treeshake: {
			moduleSideEffects: id => input === id,
		},
		plugins: [
			commonjs({ sourceMap: true }),
			nodeResolve({ preferBuiltins: true }),
			swc({
				minify: false,
				jsc: {
					baseUrl: dirname(input),
					minify: { sourceMap: false },
				},
				sourceMaps: false,
			}),
			json(),
		],
	})

	const result = await bundle.generate({
		format: 'esm',
		sourcemap: 'hidden',
		exports: 'auto',
	})

	const output = result.output[0]

	return output.code
}
