import { getRouteEnv } from 'awsless'

// RFC 9728. This document is the only thing standing between "paste a
// url into your client" and the client knowing where to send the user
// to log in.
export default async () => {
	const issuer = getRouteEnv('ISSUER')
	const scopes = getRouteEnv('SCOPES')

	return {
		statusCode: 200,
		headers: {
			'content-type': 'application/json',
			'cache-control': 'public, max-age=3600',
		},
		body: JSON.stringify({
			resource: getRouteEnv('RESOURCE'),
			authorization_servers: issuer ? [issuer] : [],
			bearer_methods_supported: ['header'],
			scopes_supported: scopes ? JSON.parse(scopes) : [],
		}),
	}
}
