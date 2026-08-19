import {
	AdminAddUserToGroupCommand,
	AdminGetUserCommand,
	AdminListGroupsForUserCommand,
	AdminRemoveUserFromGroupCommand,
	AdminSetUserPasswordCommand,
	CognitoIdentityProviderClient,
	UserNotFoundException,
} from '@aws-sdk/client-cognito-identity-provider'
import { log, prompt } from '@awsless/clui'
import { Command } from 'commander'
import { createApp } from '../../../../app.js'
import { ExpectedError } from '../../../../error.js'
import { getAccountId, getCredentials } from '../../../../util/aws.js'
import { createWorkSpace } from '../../../../util/workspace.js'
import { layout } from '../../../ui/complex/layout.js'

export const update = (program: Command) => {
	program
		.command('update')
		.description('Update an user in your userpool')
		.option('--pool <name>', 'The auth userpool name')
		.option('--username <username>', 'The username of the user')
		.option('--password <password>', 'The new password for the user')
		.option('--groups <groups...>', 'The groups the user should be in, replacing the current groups')
		.action(async (options: { pool?: string; username?: string; password?: string; groups?: string[] }) => {
			await layout('auth user update', async ({ appConfig, stackConfigs }) => {
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
							return await shared.entry('auth', `user-pool-id`, name)
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

				const client = new CognitoIdentityProviderClient({
					region,
					credentials,
				})

				const oldGroups = await log.task({
					initialMessage: 'Fetching user info...',
					successMessage: 'Done fetching user info.',
					errorMessage: `Failed fetching user info.`,
					async task() {
						try {
							await client.send(
								new AdminGetUserCommand({
									UserPoolId: userPoolId,
									Username: username,
								})
							)
						} catch (error) {
							if (error instanceof UserNotFoundException) {
								throw new ExpectedError('User does not exist')
							}

							throw error
						}

						const groups: string[] = []
						let token: string | undefined

						do {
							const result = await client.send(
								new AdminListGroupsForUserCommand({
									UserPoolId: userPoolId,
									Username: username,
									NextToken: token,
								})
							)

							groups.push(...(result.Groups?.map(g => g.GroupName!) ?? []))

							token = result.NextToken
						} while (token)

						return groups
					},
				})

				const validatePassword = (value: string | undefined) => {
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

				let password = options.password

				if (password) {
					const issue = validatePassword(password)

					if (issue) {
						throw new ExpectedError(`Invalid password: ${issue}`)
					}
				} else if (!process.env.SKIP_PROMPT) {
					const changePass = await prompt.confirm({
						message: `Do you wanna change the user's password`,
						initialValue: false,
					})

					if (changePass) {
						password = await prompt.password({
							message: 'New Password:',
							validate: validatePassword,
						})
					}
				}

				// Without an explicit groups flag a non-interactive run
				// keeps the current groups untouched.
				let newGroups: string[] = oldGroups

				if (options.groups) {
					newGroups = options.groups

					for (const group of newGroups) {
						if (!props.groups.includes(group)) {
							throw new ExpectedError(`The group "${group}" doesn't exist.`)
						}
					}
				} else if (!process.env.SKIP_PROMPT && props.groups.length > 0) {
					newGroups = await prompt.multiSelect({
						message: 'Groups:',
						required: false,
						initialValues: oldGroups,
						options: props.groups.map(g => ({
							value: g,
						})),
					})
				}

				await log.task({
					initialMessage: 'Updating user...',
					successMessage: 'User updated.',
					errorMessage: 'Failed updating user.',
					async task() {
						if (password) {
							await client.send(
								new AdminSetUserPasswordCommand({
									UserPoolId: userPoolId,
									Username: username,
									Password: password,
									Permanent: true,
								})
							)
						}

						const oldGroupSet = new Set(oldGroups)
						const newGroupSet = new Set(newGroups)

						// @ts-ignore
						const removedGroups = oldGroupSet.difference(newGroupSet)
						// @ts-ignore
						const addedGroups = newGroupSet.difference(oldGroupSet)

						for (const group of removedGroups) {
							await client.send(
								new AdminRemoveUserFromGroupCommand({
									UserPoolId: userPoolId,
									Username: username,
									GroupName: group,
								})
							)
						}

						for (const group of addedGroups) {
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
