import {
	AdminAddUserToGroupCommand,
	AdminCreateUserCommand,
	AdminSetUserPasswordCommand,
	CognitoIdentityProviderClient,
	UsernameExistsException,
} from '@aws-sdk/client-cognito-identity-provider'
import { log, prompt } from '@awsless/clui'
import { Command } from 'commander'
import { ExpectedError } from '../../../../error.js'
import { layout } from '../../../ui/complex/layout.js'
import { createClients } from '../../util.js'
import { askUsername, loadUserPoolId, selectUserPool, validatePassword } from './util.js'

export const create = (program: Command) => {
	program
		.command('create')
		.description('Create an user in your userpool')
		.option('--pool <name>', 'The auth userpool name')
		.option('--username <username>', 'The username for the new user')
		.option('--password <password>', 'The password for the new user')
		.option('--groups <groups...>', 'The groups to add the new user to')
		.action(async (options: { pool?: string; username?: string; password?: string; groups?: string[] }) => {
			await layout('auth user create', async ({ appConfig, stackConfigs }) => {
				const { region, credentials, accountId } = await createClients(appConfig)

				const { name, props } = await selectUserPool(appConfig, options.pool)
				const userPoolId = await loadUserPoolId({ appConfig, stackConfigs, accountId, credentials, name })
				const username = await askUsername(options.username)

				let password = options.password

				if (password) {
					const issue = validatePassword(props, password)

					if (issue) {
						throw new ExpectedError(`Invalid password: ${issue}`)
					}
				} else {
					if (process.env.SKIP_PROMPT) {
						throw new ExpectedError('Pass --password <password> when running with --skip-prompt.')
					}

					password = await prompt.password({
						message: 'Password:',
						validate: value => validatePassword(props, value),
					})
				}

				let groups: string[] = options.groups ?? []

				for (const group of groups) {
					if (!props.groups.includes(group)) {
						throw new ExpectedError(`The group "${group}" doesn't exist.`)
					}
				}

				if (!options.groups && !process.env.SKIP_PROMPT && props.groups.length > 0) {
					groups = await prompt.multiSelect({
						message: 'Groups:',
						required: false,
						options: props.groups.map(g => ({
							value: g,
						})),
					})
				}

				const client = new CognitoIdentityProviderClient({
					region,
					credentials,
				})

				await log.task({
					initialMessage: 'Creating user...',
					successMessage: 'User created.',
					errorMessage: 'Failed creating user.',
					async task() {
						try {
							await client.send(
								new AdminCreateUserCommand({
									UserPoolId: userPoolId,
									Username: username,
									TemporaryPassword: password,
								})
							)
						} catch (error) {
							if (error instanceof UsernameExistsException) {
								throw new ExpectedError('User already exists')
							}

							throw error
						}

						await client.send(
							new AdminSetUserPasswordCommand({
								UserPoolId: userPoolId,
								Username: username,
								Password: password,
								Permanent: true,
							})
						)

						for (const group of groups) {
							await client.send(
								new AdminAddUserToGroupCommand({
									UserPoolId: userPoolId,
									Username: username,
									GroupName: group,
								})
							)
						}
					},
				})
			})
		})
}
