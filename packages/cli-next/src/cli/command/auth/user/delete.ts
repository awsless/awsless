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
		.option('--pool <name>', 'The auth userpool name')
		.option('--username <username>', 'The username of the user to delete')
		.action(async (options: { pool?: string; username?: string }) => {
			await layout('auth user delete', async ({ appConfig, stackConfigs }) => {
				const region = appConfig.region
				const profile = appConfig.profile
				const credentials = await getCredentials(profile)
				const accountId = await getAccountId(credentials, region)

				const pools = Object.keys(appConfig.defaults.auth ?? {})

				if (pools.length === 0) {
					throw new ExpectedError('No auth resources are defined.')
				}

				let name = options.pool

				if (name && !pools.includes(name)) {
					throw new ExpectedError(`The auth userpool "${name}" doesn't exist.`)
				}

				if (!name) {
					if (pools.length === 1) {
						name = pools[0]!
					} else if (process.env.SKIP_PROMPT) {
						throw new ExpectedError(
							`Pass --pool <name> when running with --skip-prompt: [ ${pools.join(', ')} ]`
						)
					} else {
						name = await prompt.select({
							message: 'Select the auth userpool:',
							initialValue: pools.at(0),
							options: pools.map(name => ({
								label: name,
								value: name,
							})),
						})
					}
				}

				const userPoolId = await log.task({
					initialMessage: 'Loading auth userpool...',
					successMessage: 'Done loading auth userpool.',
					errorMessage: 'Failed loading auth userpool.',
					async task() {
						const { shared, app } = createApp({ appConfig, stackConfigs, accountId })

						const { workspace } = await createWorkSpace({
							credentials,
							accountId,
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

				let username = options.username

				if (!username) {
					if (process.env.SKIP_PROMPT) {
						throw new ExpectedError('Pass --username <username> when running with --skip-prompt.')
					}

					username = await prompt.text({
						message: 'Username:',
						validate(value) {
							if (!value) {
								return 'Required'
							}

							return
						},
					})
				}

				if (!process.env.SKIP_PROMPT) {
					const confirm = await prompt.confirm({
						message: 'Are you sure you want to delete this user?',
						initialValue: false,
					})

					if (!confirm) {
						throw new Cancelled()
					}
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
