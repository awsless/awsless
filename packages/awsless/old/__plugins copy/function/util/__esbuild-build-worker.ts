
import { Build } from './build.js'
import { build } from "esbuild"
import { createHash } from "crypto"
import { debug } from '../../../cli/logger.js'

export const defaultBuild:Build = async (file) => {
	const output = await build({
		entryPoints: [file],
		minify: true,
		bundle: true,
		external: [
			'@aws-sdk/*',
			'@aws-sdk',
			'aws-sdk',
		],
		// sourcemap: 'linked',
		target: 'esnext',
		treeShaking: true,
		format: 'esm',
		platform: 'node',

		// entry: {
		// 	file,
		// },
		// mode: 'production',
		// target: 'node',
		// externalModules: [
		// 	'@aws-sdk/*',
		// 	'@aws-sdk',
		// 	'aws-sdk',
		// ],
		// module: {},
		// options: {
		// 	minify: true,
		// 	sourceMaps: true,
		// 	jsc: {
		// 		target: 'es2022'
		// 	}
		// },
		// output: {
		// 	name: 'output',
		// 	path: '',
		// }
	})

	debug(output)

	const code = Buffer.from(output.outputFiles?.[0].text!, 'utf8')
	const hash = createHash('sha1').update(code).digest('hex')

	return {
		handler: 'index.default',
		hash,
		files: [
			{
				name: 'index.js',
				code: code.toString()
				// map: output.file.map?.toString()
			}
		]
	}
}
