import {
	AdminDeleteUserCommand,
	CognitoIdentityProviderClient,
	UserNotFoundException,
} from '@aws-sdk/client-cognito-identity-provider'
import { Cancelled, log, prompt } from '@awsless/clui'
import { Command } from 'commander'
import { createApp } from '../../../../app.js'
import { ExpectedError } from '../../../../error.js'
import { getAccountId, getCredentials } from '../../../../util/aws.js'
import { createWorkSpace } from '../../../../util/workspace.js'
import { layout } from '../../../ui/complex/layout.js'

export const del = (program: Command) => {
	program
		.command('delete')
		.description('Delete an user from your userpool')
		.action(async () => {
			await layout('auth user delete', async ({ appConfig, stackConfigs }) => {
				const region = appConfig.region
				const profile = appConfig.profile
				const credentials = await getCredentials(profile)
				const accountId = await getAccountId(credentials, region)

				if (Object.keys(appConfig.defaults.auth ?? {}).length === 0) {
					throw new ExpectedError('No auth resources are defined.')
				}

				const name = await prompt.select({
					message: 'Select the auth userpool:',
					initialValue: Object.keys(appConfig.defaults.auth).at(0),
					options: Object.keys(appConfig.defaults.auth).map(name => ({
						label: name,
						value: name,
					})),
				})

				const userPoolId = await log.task({
					initialMessage: 'Loading auth userpool...',
					successMessage: 'Done loading auth userpool.',
					errorMessage: 'Failed loading auth userpool.',
					async task() {
						const { shared, app } = createApp({ appConfig, stackConfigs, accountId })

						const { workspace } = await createWorkSpace({
							credentials,
							accountId,
							profile,
							region,
						})

						await workspace.hydrate(app)

						try {
							return await shared.entry('auth', `user-pool-id`, name!)
						} catch (_) {
							throw new ExpectedError(`The auth userpool hasn't been deployed yet.`)
						}
					},
				})

				const username = await prompt.text({
					message: 'Username:',
					validate(value) {
						if (!value) {
							return 'Required'
						}

						return
					},
				})

				const confirm = await prompt.confirm({
					message: 'Are you sure you want to delete this user?',
					initialValue: false,
				})

				if (!confirm) {
					throw new Cancelled()
				}

				const client = new CognitoIdentityProviderClient({
					region,
					credentials,
				})

				await log.task({
					initialMessage: 'Deleting user...',
					successMessage: 'User deleted.',
					errorMessage: 'Failed deleting user.',
					async task() {
						try {
							await client.send(
								new AdminDeleteUserCommand({
									UserPoolId: userPoolId,
									Username: username,
								})
							)
						} catch (error) {
							if (error instanceof UserNotFoundException) {
								throw new ExpectedError(`User doesn't exist`)
							}

							throw error
						}
					},
				})
			})
		})
}
