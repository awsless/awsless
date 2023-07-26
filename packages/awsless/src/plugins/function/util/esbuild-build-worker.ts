
import { Build } from './build.js'
import { build } from "esbuild"
import { createHash, randomUUID } from "crypto"
import { cacheDir } from '../../../util/path.js'
import { join } from 'path'
import { readFile, rm } from 'fs/promises'

export const defaultBuild:Build = async (file) => {
	const random = randomUUID()
	const codeFile = join(cacheDir, `${random}.mjs`)
	const mapFile = join(cacheDir, `${random}.mjs.map`)

	await build({
		entryPoints: [ file ],
		minify: true,
		bundle: true,
		external: [
			'@aws-sdk/*',
			'@aws-sdk',
			'aws-sdk',
		],
		sourcemap: 'external',
		target: 'esnext',
		treeShaking: true,
		// jsxSideEffects:
		format: 'esm',
		platform: 'node',
		outfile: codeFile,
	})

	const code = await readFile(codeFile, 'utf8')
	const map = await readFile(mapFile, 'utf8')

	await rm(codeFile)
	await rm(mapFile)

	const hash = createHash('sha1').update(code).digest('hex')

	return {
		handler: 'index.default',
		hash,
		files: [
			{
				name: 'index.mjs',
				code,
				map,
			}
		]
	}
}
