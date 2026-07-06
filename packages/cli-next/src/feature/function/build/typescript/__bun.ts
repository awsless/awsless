import { log } from '@awsless/clui'
import { minify as swcMinify } from '@swc/core'
import { PluginBuilder } from 'bun'
import { createHash } from 'crypto'
import { copyFileSync, mkdirSync } from 'node:fs'
import { basename, join } from 'node:path'

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
	const outputDir = `${nativeDir?.replace('temp/function--', 'build/function/')}/files`

	const build = await Bun.build({
		entrypoints: [file],
		outdir: outputDir,
		target: 'node',
		format: format,
		sourcemap: 'external',
		minify: false,
		external: external ?? ['@aws-sdk', 'aws-sdk', ...(external ?? [])],
		naming: {
			entry: `index.${format === 'esm' ? 'mjs' : 'js'}`,
			chunk: `[name].${format === 'esm' ? 'mjs' : 'js'}`,
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
			nativesPlugin(nativeDir),
		],
	})

	const hash = createHash('sha1')

	const files: File[] = []

	if (!build.success) {
		log.error('Build failed')
		return {
			hash: '',
			files: [],
		}
	}

	for await (const artifact of build.outputs) {
		if (artifact.kind === 'asset' || artifact.kind === 'sourcemap') {
			continue
		}

		log.info(`artifact.loader ::  ${artifact.loader} :: ${artifact.kind}`)

		if (artifact.loader === 'js') {
			const originalCode = await artifact.text()

			log.info(`Original code ${originalCode}`)

			// SWC minify API (2026 standard)
			const { code, map } = await swcMinify(originalCode, {
				compress: true,
				mangle: true,
				sourceMap: true,
			})

			log.info(`Minified code ${code}`)

			// Write the SWC-minified code back to the destination
			await Bun.write(artifact.path, code)
			if (map) await Bun.write(`${artifact.path}.map`, map)

			const encoder = new TextEncoder()

			const codeInUint8Format = encoder.encode(code)
			const codeInArrayBufferFormat = Buffer.from(codeInUint8Format.buffer)

			const codeMapInUnit8Format = encoder.encode(map)
			const codeMapInArrayBufferFormat = Buffer.from(codeMapInUnit8Format.buffer)

			hash.update(codeInArrayBufferFormat)

			files.push({
				name: artifact.path.split('/').pop()!,
				code: codeInArrayBufferFormat,
				map: codeMapInArrayBufferFormat,
			})

			log.info(`Generated ${files.length} files`)
		}
	}

	// log.info(`Generated ${files.length} files`)

	return {
		hash: hash.digest('hex'),
		files,
	}
}

const nativesPlugin = (nativeDir: string | undefined): { name: string; setup(build: PluginBuilder): void } => ({
	name: 'bun-natives-plugin',
	setup(build: PluginBuilder) {
		if (!nativeDir) return

		// Ensure the output directory for natives exists
		if (nativeDir) mkdirSync(nativeDir, { recursive: true })

		// Filter for native Node-API (.node) files
		build.onLoad({ filter: /\.node$/ }, async args => {
			const fileName = basename(args.path)
			const targetPath = join((nativeDir || build.config.outdir) as string, fileName)

			// Copy the binary to the output directory
			copyFileSync(args.path, targetPath)

			// Return code that loads the native module from the new path
			// This mimics what rollup-plugin-natives does by rewriting the loader
			return {
				contents: `
          const path = require("node:path");
          const mod = { exports: {} };
          // Load the binary relative to the current file at runtime
          const binaryPath = path.join(__dirname, ${JSON.stringify(fileName)});
          process.dlopen(mod, binaryPath);
          module.exports = mod.exports;
        `,
				loader: 'js',
			}
		})
	},
})
