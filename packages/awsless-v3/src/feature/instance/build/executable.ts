import { createHash } from 'crypto'
import { readFile } from 'fs/promises'
import { join } from 'path'
import { ExpectedError } from '../../../error'
// import { exec } from 'promisify-child-process'

export const buildExecutable = async (input: string, outputPath: string, architecture: 'x86_64' | 'arm64') => {
	const filePath = join(outputPath, 'program')

	const target = architecture === 'x86_64' ? 'bun-linux-x64' : 'bun-linux-arm64'

	// const args = ['build', input, '--compile', '--target', target, '--outfile', filePath]

	let result: Bun.BuildOutput
	try {
		// await exec(`bun ${args.join(' ')}`)
		result = await Bun.build({
			entrypoints: [input],
			compile: {
				target: target,
				outfile: filePath,
			},
			target: 'bun',
			bytecode: true,
		})
	} catch (error) {
		throw new ExpectedError(
			`Executable build failed: ${error instanceof Error ? error.message : JSON.stringify(error)}`
		)
	}

	if (!result.success) {
		throw new ExpectedError(`Executable build failed:\n${result.logs?.map(log => log.message).join('\n')}`)
	}

	const file = await readFile(filePath)

	return {
		hash: createHash('sha1').update(file).update('x86_64').digest('hex'),
		file,
	}
}
