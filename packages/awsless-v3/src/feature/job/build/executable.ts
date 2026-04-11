import { createHash } from 'crypto'
import { readFile, writeFile } from 'fs/promises'
import { join, resolve } from 'path'
import { ExpectedError } from '../../../error.js'

export const buildJobExecutable = async (input: string, outputPath: string, architecture: 'x86_64' | 'arm64') => {
	const filePath = join(outputPath, 'program')
	const wrapperPath = join(outputPath, 'wrapper.ts')
	const handlerPath = resolve(input)

	await writeFile(
		wrapperPath,
		[
			`import handler from '${handlerPath}'`,
			`const payload = JSON.parse(process.env.PAYLOAD || '{}')`,
			`await handler(payload)`,
		].join('\n')
	)

	const target = architecture === 'x86_64' ? 'bun-linux-x64' : 'bun-linux-arm64'

	let result: Bun.BuildOutput
	try {
		result = await Bun.build({
			entrypoints: [wrapperPath],
			compile: {
				target: target,
				outfile: filePath,
			},
			target: 'bun',
		})
	} catch (error) {
		throw new ExpectedError(
			`Job executable build failed: ${error instanceof Error ? error.message : JSON.stringify(error)}`
		)
	}

	if (!result.success) {
		throw new ExpectedError(`Job executable build failed:\n${result.logs?.map(log => log.message).join('\n')}`)
	}

	const file = await readFile(filePath)

	return {
		hash: createHash('sha1').update(file).update(architecture).digest('hex'),
		file,
	}
}
