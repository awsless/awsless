import { WeakCache } from '@awsless/weak-cache'
import { APIGatewayProxyEventV2 } from 'aws-lambda'
import { verify } from 'jsonwebtoken'
import jwksClient from 'jwks-rsa'
import { config } from './config.js'

const client = jwksClient({ jwksUri: `${config.auth.issuer}/.well-known/jwks.json` })
const cache = new WeakCache<string, Date>()

export const verifyToken = (token: string) => {
	return new Promise(resolve => {
		verify(
			token,
			(header, callback) => {
				client.getSigningKey(header.kid, (error, key) => {
					callback(error, key?.getPublicKey())
				})
			},
			{
				audience: config.auth.audience,
				issuer: config.auth.issuer,
				algorithms: ['RS256'],
			},
			(error, decoded) => {
				error ? resolve(undefined) : resolve(decoded)
			}
		)
	})
}

export const isAuthorized = async (event: APIGatewayProxyEventV2) => {
	const token = event.headers?.authentication
	if (!token) {
		return false
	}

	const now = new Date()
	const ttl = cache.get(token)

	if (ttl && isAfter(ttl, now)) {
		return true
	}

	const verifiedToken = await verifyToken(token)
	if (!verifiedToken) {
		return false
	}

	cache.set(verifiedToken, addHours(new Date(), 1))

	return true
}
