import { execSync } from 'child_process'
import { createHash } from 'crypto'
import { readFile } from 'fs/promises'
import { join } from 'path'

// const getBunPath = () => execSync('which bun', { encoding: 'utf8' }).trim()

export const buildExecutable = async (input: string, outputPath: string) => {
	const filePath = join(outputPath, 'program')

	const args = ['build', input, '--compile', '--target', 'bun-linux-x64-modern', '--outfile', filePath]

	try {
		execSync(`bun ${args.join(' ')}`, { encoding: 'utf8' })
	} catch (error) {
		throw new Error(`Executable build failed: ${error instanceof Error ? error.message : String(error)}`)
	}

	const file = await readFile(filePath)

	return {
		hash: createHash('sha1').update(file).digest('hex'),
		file,
	}
}
