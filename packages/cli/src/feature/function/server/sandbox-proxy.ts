import { InvokeCommand, LambdaClient } from '@aws-sdk/client-lambda'
import { getBundleName, LIVE_BUNDLE_ALIAS } from '../../bundle/config.js'

const client = new LambdaClient({})
const routes = new Set<string>(JSON.parse(process.env.SANDBOX_ROUTES ?? '[]'))

type SandboxEvent = {
	'$awsless-route'?: string
}

// Forwards the allowlisted bundle routes for a sandboxed function,
// which only holds iam permission to invoke this proxy. The payload
// passes through untouched in both directions with plain JSON, so
// the patched bundle wire format is preserved exactly & never decoded.
export default async (event: SandboxEvent) => {
	const route = event?.['$awsless-route']

	if (!route || !routes.has(route)) {
		throw new Error(`Sandboxed route is not allowed: ${route}`)
	}

	// Task routes are fire & forget, so they forward asynchronously &
	// the bundle alias keeps its own retry & failure handling.
	const asynchronous = route.split(':')[1] === 'task'

	const result = await client.send(
		new InvokeCommand({
			FunctionName: getBundleName(),
			Qualifier: LIVE_BUNDLE_ALIAS,
			InvocationType: asynchronous ? 'Event' : 'RequestResponse',
			Payload: JSON.stringify(event),
		})
	)

	if (asynchronous) {
		return
	}

	const payload = result.Payload ? Buffer.from(result.Payload).toString('utf8') : undefined

	if (result.FunctionError) {
		const info = payload ? JSON.parse(payload) : {}
		const error = new Error(info.errorMessage ?? 'The sandboxed invoke failed.')
		error.name = info.errorType ?? 'Error'

		throw error
	}

	return payload ? JSON.parse(payload) : undefined
}
