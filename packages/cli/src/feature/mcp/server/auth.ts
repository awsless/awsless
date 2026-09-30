import { getRouteEnv } from 'awsless'
import { createRemoteJWKSet, jwtVerify } from 'jose'

export type Session = {
	userId: string
	sessionId?: string
	organizationId?: string
	role?: string
	permissions: string[]
}

export class UnauthorizedError extends Error {}

// Both live in module scope so a warm container verifies without any
// network calls at all. The key set refetches itself on rotation.
let keys: ReturnType<typeof createRemoteJWKSet> | undefined
let keysPromise: Promise<ReturnType<typeof createRemoteJWKSet>> | undefined

const getKeys = () => {
	if (keys) {
		return Promise.resolve(keys)
	}

	// Discovered rather than configured, so swapping auth providers stays
	// a change to the issuer url & nothing else.
	keysPromise ??= (async () => {
		const issuer = getRouteEnv('ISSUER')!
		const response = await fetch(new URL('/.well-known/oauth-authorization-server', issuer))

		if (!response.ok) {
			keysPromise = undefined

			throw new Error(`Failed to discover the authorization server: ${response.status}`)
		}

		const metadata = (await response.json()) as { jwks_uri: string }

		keys = createRemoteJWKSet(new URL(metadata.jwks_uri))

		return keys
	})()

	return keysPromise
}

export const isProtected = () => {
	return Boolean(getRouteEnv('ISSUER'))
}

export const authenticate = async (header?: string): Promise<Session | undefined> => {
	if (!isProtected()) {
		return
	}

	const token = header?.match(/^Bearer (.+)$/i)?.[1]

	if (!token) {
		throw new UnauthorizedError('No access token provided')
	}

	let payload

	try {
		const verified = await jwtVerify(token, await getKeys(), {
			issuer: getRouteEnv('ISSUER'),

			// RFC 8707. Providers that bind tokens to the resource indicator
			// put our own url here, which is what stops a token minted for
			// another service from working on this one.
			audience: getRouteEnv('AUDIENCE'),
		})

		payload = verified.payload
	} catch (error) {
		console.error(error)

		throw new UnauthorizedError('Invalid access token')
	}

	return {
		userId: payload.sub!,
		sessionId: payload.sid as string | undefined,
		organizationId: payload.org_id as string | undefined,
		role: payload.role as string | undefined,
		permissions: (payload.permissions as string[] | undefined) ?? [],
	}
}

// The 401 that starts the oauth flow. Without the resource_metadata
// pointer a client has no way to discover where to send the user.
export const unauthorized = (message: string) => {
	const resource = getRouteEnv('RESOURCE')!

	return {
		statusCode: 401,
		headers: {
			'content-type': 'application/json',
			'www-authenticate': [
				'Bearer error="invalid_token"',
				`error_description="${message}"`,
				`resource_metadata="${new URL(resource).origin}/.well-known/oauth-protected-resource"`,
			].join(', '),
		},
		body: JSON.stringify({ error: 'invalid_token', error_description: message }),
	}
}
