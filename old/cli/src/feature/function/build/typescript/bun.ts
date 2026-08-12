// import { log } from '@awsless/clui'
import { minify as swcMinify } from '@swc/core'
// import { PluginBuilder } from 'bun'
import { createHash } from 'crypto'
// import { copyFileSync, mkdirSync } from 'node:fs'
// import { basename, join } from 'node:path'

import { File } from '../zip.js'

export type BundleTypeScriptProps = {
	format?: 'esm' | 'cjs'
	minify?: boolean
	external?: string[]
	handler?: string
	file: string
	nativeDir?: string
	importAsString?: string[]
}

export const bundleTypeScriptWithBun = async ({
	format = 'esm',
	minify = true,
	file,
	nativeDir,
	external,
	importAsString: importAsStringList,
}: BundleTypeScriptProps) => {
	const build = await Bun.build({
		entrypoints: [file],
		target: 'node',
		format: format,
		sourcemap: 'none',
		// sourcemap: 'external',
		minify: true,
		external: ['@aws-sdk/*', 'aws-sdk', ...(external ?? [])],
		naming: {
			entry: `index.js`,
			chunk: `[name].js`,
		},
		plugins: [
			{
				name: 'string-loader',
				setup(build) {
					if (importAsStringList) {
						build.onLoad({ filter: new RegExp(importAsStringList.join('|')) }, async args => {
							return {
								contents: `export default ${JSON.stringify(await Bun.file(args.path).text())};`,
								loader: 'js',
							}
						})
					}
				},
			},
			// nativesPlugin(nativeDir),
		],
	})

	if (!build.success) {
		throw new Error('Bun build error')
	}

	const hash = createHash('sha1')
	const files: File[] = []

	for await (const artifact of build.outputs) {
		if (artifact.kind === 'asset' || artifact.kind === 'sourcemap') {
			continue
		}

		const originalCode = await artifact.text()
		// const map = await artifact.sourcemap?.text()

		const { code } = await swcMinify(originalCode, {
			toplevel: true,
			module: true,
			compress: true,
			mangle: true,
			sourceMap: false,
		})

		hash.update(code)

		files.push({
			name: artifact.path.split('/').pop()!,
			code: Buffer.from(code),
			// map: map ? Buffer.from(map) : undefined,
		})
	}

	return {
		hash: hash.digest('hex'),
		files,
	}
}

// const nativesPlugin = (nativeDir: string | undefined): { name: string; setup(build: PluginBuilder): void } => ({
// 	name: 'bun-natives-plugin',
// 	setup(build: PluginBuilder) {
// 		if (!nativeDir) return

// 		// Ensure the output directory for natives exists
// 		if (nativeDir) mkdirSync(nativeDir, { recursive: true })

// 		// Filter for native Node-API (.node) files
// 		build.onLoad({ filter: /\.node$/ }, async args => {
// 			const fileName = basename(args.path)
// 			const targetPath = join((nativeDir || build.config.outdir) as string, fileName)

// 			// Copy the binary to the output directory
// 			copyFileSync(args.path, targetPath)

// 			// Return code that loads the native module from the new path
// 			// This mimics what rollup-plugin-natives does by rewriting the loader
// 			return {
// 				contents: `
//           const path = require("node:path");
//           const mod = { exports: {} };
//           // Load the binary relative to the current file at runtime
//           const binaryPath = path.join(__dirname, ${JSON.stringify(fileName)});
//           process.dlopen(mod, binaryPath);
//           module.exports = mod.exports;
//         `,
// 				loader: 'js',
// 			}
// 		})
// 	},
// })
