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
import { ExpectedError } from '../../../../error.js'
import { getAccountId, getCredentials } from '../../../../util/aws.js'
import { layout } from '../../../ui/complex/layout.js'
import { askUsername, loadUserPoolId, selectUserPool, validatePassword } from './util.js'

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

				const { name, props } = await selectUserPool(appConfig, options.pool)
				const userPoolId = await loadUserPoolId({ appConfig, stackConfigs, accountId, credentials, name })
				const username = await askUsername(options.username)

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

				let password = options.password

				if (password) {
					const issue = validatePassword(props, password)

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
							validate: value => validatePassword(props, value),
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
