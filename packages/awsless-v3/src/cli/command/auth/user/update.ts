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
		.action(async () => {
			await layout('auth user update', async ({ appConfig, stackConfigs }) => {
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

				const props = appConfig.defaults.auth[name]!

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

				const changePass = await prompt.confirm({
					message: `Do you wanna change the user's password`,
					initialValue: false,
				})

				let password: string | undefined
				if (changePass) {
					password = await prompt.password({
						message: 'New Password:',
						validate(value) {
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
						},
					})
				}

				let newGroups: string[] = []
				if (props.groups.length > 0) {
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
						if (changePass && password) {
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
