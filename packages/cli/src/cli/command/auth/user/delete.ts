import { log, prompt } from '@awsless/clui'
import { Command } from 'commander'
import { Cancelled, ExpectedError } from '../../../../error.js'
import { layout } from '../../../ui/complex/layout.js'
import { createClients } from '../../util.js'
import { askEmail, createClient, selectAuthEnvironment } from './util.js'

export const del = (program: Command) => {
	program
		.command('delete')
		.description('Delete an user from your auth environment')
		.option('--env <name>', 'The auth environment name')
		.option('--email <email>', 'The email of the user to delete')
		.action(async (options: { env?: string; email?: string }) => {
			await layout('auth user delete', async ({ appConfig }) => {
				const { credentials } = await createClients(appConfig)

				const { props } = await selectAuthEnvironment(appConfig, options.env)
				const client = await createClient({ appConfig, credentials, auth: props })

				const email = await askEmail(options.email)

				if (!process.env.SKIP_PROMPT) {
					const confirm = await prompt.confirm({
						message: 'Are you sure you want to delete this user?',
						initialValue: false,
					})

					if (!confirm) {
						throw new Cancelled()
					}
				}

				await log.task({
					initialMessage: 'Deleting user...',
					successMessage: 'User deleted.',
					errorMessage: 'Failed deleting user.',
					async task() {
						const user = await client.findUser(email)

						if (!user) {
							throw new ExpectedError(`User doesn't exist`)
						}

						// Memberships go with the user, so only the user itself
						// has to be removed.
						await client.deleteUser(user.id)
					},
				})
			})
		})
}
