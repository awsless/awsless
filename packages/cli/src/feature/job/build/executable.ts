import { writeFile } from 'fs/promises'
import { join, resolve } from 'path'
import { buildExecutable, ExecutableArchitecture } from '../../instance/build/executable.js'

// A job program exports a handler; the wrapper feeds it the payload,
// which lives in s3 when it's too large for the task env.
export const buildJobExecutable = async (input: string, outputPath: string, architecture: ExecutableArchitecture) => {
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

	return buildExecutable(wrapperPath, outputPath, architecture)
}
