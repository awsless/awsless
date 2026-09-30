import { log } from '@awsless/clui'
import { Command } from 'commander'
import { ExpectedError } from '../../../../error.js'
import { layout } from '../../../ui/complex/layout.js'
import { createClients } from '../../util.js'
import { askEmail, askPassword, askRole, createClient, selectAuthEnvironment, selectOrganization } from './util.js'

export const create = (program: Command) => {
	program
		.command('create')
		.description('Create an user in your auth environment')
		.option('--env <name>', 'The auth environment name')
		.option('--email <email>', 'The email for the new user')
		.option('--password <password>', 'The password for the new user')
		.option('--organization <name>', 'The organization to add the new user to')
		.option('--role <role>', 'The role the new user gets in the organization')
		.action(
			async (options: {
				env?: string
				email?: string
				password?: string
				organization?: string
				role?: string
			}) => {
				await layout('auth user create', async ({ appConfig }) => {
					const { credentials } = await createClients(appConfig)

					const { props } = await selectAuthEnvironment(appConfig, options.env)
					const client = await createClient({ appConfig, credentials, auth: props })

					const email = await askEmail(options.email)
					const password = await askPassword(options.password)

					const organization = await selectOrganization(client, options.organization)
					const role = organization ? await askRole(props, options.role) : undefined

					if (options.role && !organization) {
						throw new ExpectedError('A role needs an organization, and this environment has none.')
					}

					await log.task({
						initialMessage: 'Creating user...',
						successMessage: 'User created.',
						errorMessage: 'Failed creating user.',
						async task() {
							if (await client.findUser(email)) {
								throw new ExpectedError('User already exists')
							}

							const user = await client.createUser({ email, password })

							if (organization) {
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
