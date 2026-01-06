import {
	AdminCreateUserCommand,
	AdminSetUserPasswordCommand,
	CognitoIdentityProviderClient,
} from '@aws-sdk/client-cognito-identity-provider'
import { prompt } from '@awsless/clui'
import { Command } from 'commander'
import { createApp } from '../../../../app.js'
import { ExpectedError } from '../../../../error.js'
import { getAccountId, getCredentials } from '../../../../util/aws.js'
import { createWorkSpace } from '../../../../util/workspace.js'
import { layout } from '../../../ui/complex/layout.js'

export const create = (program: Command) => {
	program
		.command('create')
		.argument('[name]', 'The name of the auth instance')
		.description('Create an user for your userpool')
		.action(async (name: string | undefined) => {
			await layout('auth user create', async ({ appConfig, stackConfigs }) => {
				const region = appConfig.region
				const profile = appConfig.profile
				const credentials = await getCredentials(profile)
				const accountId = await getAccountId(credentials, region)

				if (Object.keys(appConfig.defaults.auth ?? {}).length === 0) {
					throw new ExpectedError('No auth resources are defined.')
				}

				if (!name) {
					name = await prompt.select({
						message: 'Select the auth userpool:',
						initialValue: Object.keys(appConfig.defaults.auth).at(0),
						options: Object.keys(appConfig.defaults.auth).map(name => ({
							label: name,
							value: name,
						})),
					})
				}

				if (!(name! in appConfig.defaults.auth)) {
					throw new ExpectedError(`Provided auth name doesn't exist inside your app config.`)
				}

				const { shared, app } = createApp({ appConfig, stackConfigs, accountId })

				const { workspace } = await createWorkSpace({
					credentials,
					accountId,
					profile,
					region,
				})

				await workspace.hydrate(app)

				let userPoolId: string
				try {
					userPoolId = await shared.entry('auth', `user-pool-id`, name)
				} catch (_) {
					throw new ExpectedError(`The auth userpool hasn't been deployed yet.`)
				}

				const user = await prompt.text({
					message: 'Username:',
					validate(value) {
						if (!value) {
							return 'Required'
						}

						return
					},
				})

				const pass = await prompt.password({
					message: 'Password:',
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

				await client.send(
					new AdminCreateUserCommand({
						UserPoolId: userPoolId,
						Username: user.toString(),
						TemporaryPassword: pass.toString(),
					})
				)

				await client.send(
					new AdminSetUserPasswordCommand({
						UserPoolId: userPoolId,
						Username: user.toString(),
						Password: pass.toString(),
						Permanent: true,
					})
				)

				return 'User created.'
			})
		})
}
