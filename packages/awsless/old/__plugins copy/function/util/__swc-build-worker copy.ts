
import { Build } from './build.js'
import { bundle } from "@swc/core"
import { createHash } from "crypto"

export const defaultBuild:Build = async (file) => {
	const output = await bundle({
		entry: {
			file,
		},
		mode: 'production',
		target: 'node',
		externalModules: [
			'@aws-sdk/*',
			'@aws-sdk',
			'aws-sdk',
		],
		module: {},
		options: {
			minify: true,
			sourceMaps: true,
			jsc: {
				target: 'es2022'
			},
		},
		output: {
			name: 'output',
			path: '',
		}
	})

	const hash = createHash('sha1').update(output.file.code).digest('hex')

	return {
		handler: 'index.default',
		hash,
		files: [
			{
				name: 'index.js',
				code: output.file.code,
				map: output.file.map?.toString()
			}
		]
	}
}
