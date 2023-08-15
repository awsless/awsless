
import { Build } from '../build.js'
import { build } from "esbuild"
import { createHash } from "crypto"

export const esBuild:Build = async (file) => {
	const result = await build({
		entryPoints: [ file ],
		minify: true,
		write: false,
		bundle: true,
		sourcemap: 'external',
		target: 'esnext',
		treeShaking: true,
		logLevel: 'silent',
		plugins: [
			{
				name: 'aws-externals',
				setup(build) {
					build.onResolve({ namespace: 'file', filter: /.*/ }, (args) => {
						if(args.path.startsWith('@aws-sdk') || args.path.startsWith('aws-sdk')) {
							return { path: args.path, external: true };
						}

						return null
					});
				},
			}
		],
		format: 'esm',
		platform: 'node',
		outfile: 'index.mjs',
	})

	const [ file1, file2 ] = result.outputFiles
	const firstIsCode = file1.path.endsWith('.mjs')

	const code = firstIsCode ? file1.text : file2.text
	const map = firstIsCode ? file2.text : file1.text

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
