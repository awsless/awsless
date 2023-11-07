import { mkdir, readdir, writeFile } from 'fs/promises'
import { basename, join } from 'path'
import { rollup } from 'rollup'
import { swc } from 'rollup-plugin-swc3'
import json from '@rollup/plugin-json'
import commonjs from '@rollup/plugin-commonjs'
import nodeResolve from '@rollup/plugin-node-resolve'
import { dirname } from 'path'
import JSZip from 'jszip'
import { createHash } from 'crypto'

const main = async () => {
	const path = './features/functions'
	const functions = await readdir(path)
	const output = join(process.cwd(), 'dist/features')

	await mkdir(output, { recursive: true })

	for (const func of functions) {
		const { hash, files } = await rollupBundle(join(path, func))
		const bundle = await zipFiles(files)

		const funcPath = join(output, basename(func, '.ts'))
		await mkdir(funcPath, { recursive: true })

		await Promise.all([
			writeFile(join(funcPath, 'HASH'), hash),
			writeFile(join(funcPath, 'bundle.zip'), bundle),
			writeFile(join(funcPath, 'index.mjs'), files[0].code),
		])

		console.log(func)
	}
}

main()

const zipFiles = files => {
	const zip = new JSZip()

	for (const file of files) {
		zip.file(file.name, file.code)
	}

	return zip.generateAsync({
		type: 'nodebuffer',
		compression: 'DEFLATE',
		compressionOptions: {
			level: 9,
		},
	})
}

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
			// minify
			// 	? swcMinify({
			// 			module: format === 'esm',
			// 			sourceMap: true,
			// 			compress: true,
			// 	  })
			// 	: undefined,
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

	const hash = createHash('sha1')
	const files = []

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
