import { createHash } from 'crypto'
import { readFile } from 'fs/promises'
import { join } from 'path'
import { ExpectedError } from '../../../error.js'

export type ExecutableArchitecture = 'x86_64' | 'arm64'

export const executableTarget = (architecture: ExecutableArchitecture) => {
	return architecture === 'x86_64' ? 'bun-linux-x64' : 'bun-linux-arm64'
}

// Compile a bun program into a single linux executable for fargate.
export const buildExecutable = async (input: string, outputPath: string, architecture: ExecutableArchitecture) => {
	const filePath = join(outputPath, 'program')
	const target = executableTarget(architecture)

	let result: Bun.BuildOutput
	try {
		result = await Bun.build({
			entrypoints: [input],
			compile: {
				target: target,
				outfile: filePath,
			},
			target: 'bun',
			loader: {
				'.md': 'text',
				'.txt': 'text',
				'.html': 'text',
				'.css': 'text',
				'.yaml': 'text',
				'.yml': 'text',
				'.xml': 'text',
				'.csv': 'text',
				'.svg': 'text',
				'.png': 'file',
				'.jpg': 'file',
				'.jpeg': 'file',
				'.gif': 'file',
				'.webp': 'file',
				'.wasm': 'file',
			},
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
		hash: createHash('sha1').update(file).update(target).digest('hex'),
		file,
	}
}
