// import nodeResolve from '@rollup/plugin-node-resolve'
import { createHash } from 'crypto'
import { Minimatch } from 'minimatch'
import { rolldown } from 'rolldown'
// import natives from 'rollup-plugin-natives'
import { importAsString } from 'rollup-plugin-string-import'
import { debugError } from '../../../../cli/debug.js'
import { File } from '../zip.js'

export type BundleTypeScriptProps = {
	format?: 'esm' | 'cjs'
	minify?: boolean
	external?: string[]
	externalAwsSdk?: boolean
	moduleSideEffects?: string[]
	codeSplitting?: boolean
	handler?: string
	file: string
	nativeDir?: string
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

export const bundleTypeScriptWithRolldown = async ({
	format = 'esm',
	minify = true,
	file,
	nativeDir,
	external,
	moduleSideEffects,
	externalAwsSdk = true,
	codeSplitting = true,
	importAsString: importAsStringList,
}: BundleTypeScriptProps) => {
	const hasModuleSideEffects = createModuleMatcher(moduleSideEffects)
	const bundle = await rolldown({
		input: file,
		platform: 'node',
		external: importee => {
			return (
				(externalAwsSdk && (importee.startsWith('@aws-sdk') || importee.startsWith('aws-sdk'))) ||
				external?.includes(importee)
			)
		},
		onwarn: error => {
			debugError(error.message)
		},
		treeshake: {
			moduleSideEffects: id => file === id || hasModuleSideEffects(id),
		},
		plugins: [
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
		codeSplitting,
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
