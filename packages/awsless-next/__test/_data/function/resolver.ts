import { Context, LambdaRequest } from '@aws-appsync/utils'

type Identity = {
	sourceIp: string[]
	sub: string
	username: string
	claims: object
}

type Headers = Record<string, string>
type Device = 'tablet' | 'smarttv' | 'mobile' | 'desktop'

const isViewer = (headers: Headers, key: Device) => {
	return headers[`cloudfront-is-${key}-viewer`] === 'true'
}

const getDevice = (headers: Headers): Device | 'unknown' => {
	if (isViewer(headers, 'smarttv')) return 'smarttv'
	if (isViewer(headers, 'mobile')) return 'mobile'
	if (isViewer(headers, 'tablet')) return 'tablet'
	if (isViewer(headers, 'desktop')) return 'desktop'

	return 'unknown'
}

export function request(ctx: Context): LambdaRequest {
	const identity = ctx.identity as Identity
	const headers = ctx.request.headers

	return {
		operation: 'Invoke',
		payload: {
			...ctx.arguments,
			player: {
				id: identity.sub,
				name: identity.username,
			},
			request: {
				id: headers['x-amzn-requestid'],
				traceId: headers['x-amzn-trace-id'],
				ip: identity.sourceIp,
				country: headers['cloudfront-viewer-country'],
				userAgent: headers['user-agent'],
				device: getDevice(headers),
				token: identity.claims,
			},
		},
	}
}

export function response(ctx: Context) {
	return ctx.result
}
