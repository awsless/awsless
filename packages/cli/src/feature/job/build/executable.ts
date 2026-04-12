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
		`import { parse } from '@awsless/json'
import { getObject } from '@awsless/s3'
import handler from '${handlerPath}'

let payload = process.env.PAYLOAD ? parse(process.env.PAYLOAD) : undefined
if (typeof payload === 'string' && payload.startsWith('s3://')) {
	const url = new URL(payload)
	const response = await getObject({ bucket: url.hostname, key: url.pathname.slice(1) })
	if (!response) throw new Error('Failed to fetch payload from S3: ' + payload)
	payload = parse(await response.body.transformToString())
}
await handler(payload)
	`
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
		hash: createHash('sha1').update(file).update(target).digest('hex'),
		file,
	}
}
