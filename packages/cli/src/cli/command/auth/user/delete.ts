import {
	AdminDeleteUserCommand,
	CognitoIdentityProviderClient,
	UserNotFoundException,
} from '@aws-sdk/client-cognito-identity-provider'
import { log, prompt } from '@awsless/clui'
import { Command } from 'commander'
import { Cancelled, ExpectedError } from '../../../../error.js'
import { layout } from '../../../ui/complex/layout.js'
import { createClients } from '../../util.js'
import { askUsername, loadUserPoolId, selectUserPool } from './util.js'

export const del = (program: Command) => {
	program
		.command('delete')
		.description('Delete an user from your userpool')
		.option('--pool <name>', 'The auth userpool name')
		.option('--username <username>', 'The username of the user to delete')
		.action(async (options: { pool?: string; username?: string }) => {
			await layout('auth user delete', async ({ appConfig, stackConfigs }) => {
				const { region, credentials, accountId } = await createClients(appConfig)

				const { name } = await selectUserPool(appConfig, options.pool)
				const userPoolId = await loadUserPoolId({ appConfig, stackConfigs, accountId, credentials, name })
				const username = await askUsername(options.username)

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
