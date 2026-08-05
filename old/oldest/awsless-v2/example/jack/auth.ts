import { AppSyncAuthorizerEvent, AppSyncAuthorizerResult } from 'aws-lambda'

export default async (event: AppSyncAuthorizerEvent): Promise<AppSyncAuthorizerResult<{ user: string }>> => {
	console.log(event)

	return {
		isAuthorized: true,
		resolverContext: {
			user: 'demo',
		},
	}
}
