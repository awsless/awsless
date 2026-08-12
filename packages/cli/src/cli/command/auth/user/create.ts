import {
	AdminAddUserToGroupCommand,
	AdminCreateUserCommand,
	AdminSetUserPasswordCommand,
	CognitoIdentityProviderClient,
	UsernameExistsException,
} from '@aws-sdk/client-cognito-identity-provider'
import { log, prompt } from '@awsless/clui'
import { Command } from 'commander'
import { createApp } from '../../../../app.js'
import { ExpectedError } from '../../../../error.js'
import { getAccountId, getCredentials } from '../../../../util/aws.js'
import { createWorkSpace } from '../../../../util/workspace.js'
import { layout } from '../../../ui/complex/layout.js'

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
				const region = appConfig.region
				const profile = appConfig.profile
				const credentials = await getCredentials(profile)
				const accountId = await getAccountId(credentials, region)

				const pools = Object.keys(appConfig.auth ?? {})

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

				const props = appConfig.auth[name]!

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

				const validatePassword = (value: string) => {
					if (!value) {
						return 'Required'
					}

					if (value.length < props.password.minLength) {
						return `Min length is ${props.password.minLength}`
					}

					if (props.password.lowercase && value.toUpperCase() === value) {
						return `Should include lowercase characters`
					}

					if (props.password.uppercase && value.toLowerCase() === value) {
						return `Should include uppercase characters`
					}

					if (props.password.numbers && !/\d/.test(value)) {
						return `Should include numbers`
					}

					if (props.password.symbols && !/[ `!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~]/.test(value)) {
						return `Should include symbols`
					}

					return
				}

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

				let password = options.password

				if (password) {
					const issue = validatePassword(password)

					if (issue) {
						throw new ExpectedError(`Invalid password: ${issue}`)
					}
				} else {
					if (process.env.SKIP_PROMPT) {
						throw new ExpectedError('Pass --password <password> when running with --skip-prompt.')
					}

					password = await prompt.password({
						message: 'Password:',
						validate: validatePassword,
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

						if (groups.length > 0) {
							for (const group of groups) {
								await client.send(
									new AdminAddUserToGroupCommand({
										UserPoolId: userPoolId,
										Username: username,
										GroupName: group,
									})
								)
							}
						}
					},
				})

				// return 'User created.'
			})
		})
}
