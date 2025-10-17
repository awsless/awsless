// import { build, CompileBuildConfig } from 'bun'
import { createHash } from 'crypto'
import { readFile } from 'fs/promises'
import { join } from 'path'
import { exec } from 'promisify-child-process'

export const buildExecutable = async (input: string, outputPath: string, architecture: 'x86_64' | 'arm64') => {
	const filePath = join(outputPath, 'program')
	const target = architecture === 'x86_64' ? 'bun-linux-x64-modern' : 'bun-linux-arm64-modern'

	// const config: CompileBuildConfig = {
	// 	entrypoints: [input],
	// 	compile: {
	// 		target: 'bun-linux-x64',
	// 		outfile: filePath,
	// 	},
	// 	target: 'bun',
	// }

	// const result = await build(config)

	// if (!result.success) {
	// 	throw new Error(`Executable build failed (${JSON.stringify(result.logs)})`)
	// }

	const args = ['build', input, '--compile', '--target', target, '--outfile', filePath]

	try {
		await exec(`bun ${args.join(' ')}`)
	} catch (error) {
		throw new Error(`Executable build failed: ${error instanceof Error ? error.message : JSON.stringify(error)}`)
	}

	const file = await readFile(filePath)

	return {
		hash: createHash('sha1').update(file).update(architecture).digest('hex'),
		file,
	}
}
