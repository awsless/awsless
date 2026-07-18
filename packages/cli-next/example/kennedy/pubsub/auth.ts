import type { PubSubAuthorizerEvent, PubSubAuthorizerResponse } from 'awsless'

export default async ({ token }: PubSubAuthorizerEvent): Promise<PubSubAuthorizerResponse> => {
	console.log('pubsub auth', token)

	// Guests are only allowed to follow the public news feed.
	if (!token) {
		return {
			authorized: true,
			allowed: ['news'],
		}
	}

	return {
		authorized: true,
		allowed: ['news', `user/${token}`],
		context: { user: token },
	}
}
