import { execSync } from 'child_process'
import { createHash } from 'crypto'
import { readFile } from 'fs/promises'
import { join } from 'path'
import { exec } from 'promisify-child-process'

// const getBunPath = () => exec('which bun')

export const buildExecutable = async (input: string, outputPath: string) => {
	const filePath = join(outputPath, 'program')

	const args = ['build', input, '--compile', '--target', 'bun-linux-x64-modern', '--outfile', filePath]

	// const path = await getBunPath()

	// console.log(`bun ${args.join(' ')}`)

	// await exec(`bun ${args.join(' ')}`)

	try {
		await exec(`bun ${args.join(' ')}`)
	} catch (error) {
		throw new Error(`Executable build failed: ${error instanceof Error ? error.message : JSON.stringify(error)}`)
	}

	const file = await readFile(filePath)

	return {
		hash: createHash('sha1').update(file).digest('hex'),
		file,
	}
}
