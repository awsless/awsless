import { log, prompt } from '@awsless/clui'
import { Command } from 'commander'
import { ExpectedError } from '../../../../error.js'
import { layout } from '../../../ui/complex/layout.js'
import { createClients } from '../../util.js'
import { askEmail, askRole, createClient, selectAuthEnvironment, selectOrganization } from './util.js'

export const update = (program: Command) => {
	program
		.command('update')
		.description('Update an user in your auth environment')
		.option('--env <name>', 'The auth environment name')
		.option('--email <email>', 'The email of the user')
		.option('--password <password>', 'The new password for the user')
		.option('--organization <name>', 'The organization the role applies to')
		.option('--role <role>', 'The role the user should have, replacing the current one')
		.action(
			async (options: {
				env?: string
				email?: string
				password?: string
				organization?: string
				role?: string
			}) => {
				await layout('auth user update', async ({ appConfig }) => {
					const { credentials } = await createClients(appConfig)

					const { props } = await selectAuthEnvironment(appConfig, options.env)
					const client = await createClient({ appConfig, credentials, auth: props })

					const email = await askEmail(options.email)

					const user = await log.task({
						initialMessage: 'Fetching user info...',
						successMessage: 'Done fetching user info.',
						errorMessage: 'Failed fetching user info.',
						async task() {
							const user = await client.findUser(email)

							if (!user) {
								throw new ExpectedError('User does not exist')
							}

							return user
						},
					})

					let password = options.password

					if (!password && !process.env.SKIP_PROMPT) {
						const change = await prompt.confirm({
							message: `Do you wanna change the user's password`,
							initialValue: false,
						})

						if (change) {
							password = await prompt.password({
								message: 'New Password:',
								validate: value => (value ? undefined : 'Required'),
							})
						}
					}

					const organization = await selectOrganization(client, options.organization)
					const memberships = await client.listMemberships({ userId: user.id })
					const membership = organization
						? memberships.find(entry => entry.organizationId === organization.id)
						: undefined

					// Without an explicit role flag a non-interactive run keeps
					// the current role untouched.
					const role = organization ? await askRole(props, options.role, membership?.role) : undefined

					await log.task({
						initialMessage: 'Updating user...',
						successMessage: 'User updated.',
						errorMessage: 'Failed updating user.',
						async task() {
							if (password) {
								await client.updateUser(user.id, { password })
							}

							if (!organization || role === membership?.role) {
								return
							}

							if (membership) {
								await client.updateMembership(membership.id, { role })
							} else {
								await client.createMembership({
									userId: user.id,
									organizationId: organization.id,
									role,
								})
							}
						},
					})
				})
			}
		)
}
