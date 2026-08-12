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
		.action(async () => {
			await layout('auth user create', async ({ appConfig, stackConfigs }) => {
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

				const password = await prompt.password({
					message: 'Password:',
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

				let groups: string[] = []
				if (props.groups.length > 0) {
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
