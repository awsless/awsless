import { SSMClient, putParameter } from '@awsless/ssm'
import { readFile } from 'fs/promises'
import { homedir } from 'os'
import { join } from 'path'
import { gzipSync } from 'zlib'
import type { CommandHandler } from '../../../src/command.js'

const CONFIG_NAME = 'codex-oauth-token'

const getParameterPath = () => {
	const app = process.env.APP

	if (!app) {
		throw new Error('APP environment variable is not set')
	}

	return `/.awsless/${app}/${CONFIG_NAME}`
}

const loadCompressedAuthToken = async () => {
	const path = join(homedir(), '.codex', 'auth.json')
	const file = await readFile(path, 'utf8')
	const compact = JSON.stringify(JSON.parse(file))
	const encoded = gzipSync(Buffer.from(compact, 'utf8'), {
		level: 9,
	}).toString('base64')

	if (encoded.length > 4096) {
		throw new Error(`Compressed auth token is still too large for standard SSM (${encoded.length} bytes)`)
	}

	return encoded
}

const handler: CommandHandler = async ({ region, credentials }) => {
	const value = await loadCompressedAuthToken()
	const name = getParameterPath()
	const client = new SSMClient({
		region,
		credentials,
	})

	await putParameter({
		client,
		name,
		value,
		type: 'String',
	})

	console.log(`Stored ${CONFIG_NAME} in ${name}`)
}

export default handler
