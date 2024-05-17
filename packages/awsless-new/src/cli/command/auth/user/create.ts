import { Command } from 'commander'
import { createApp } from '../../../../app.js'
import { layout } from '../../../ui/complex/layout.js'
import { getAccountId, getCredentials } from '../../../../util/aws.js'
import { unwrap } from '@awsless/formation'
import { createWorkSpace } from '../../../../util/workspace.js'
import {
	AdminCreateUserCommand,
	AdminSetUserPasswordCommand,
	CognitoIdentityProviderClient,
} from '@aws-sdk/client-cognito-identity-provider'
import { password, select, text } from '@clack/prompts'

export const create = (program: Command) => {
	program
		.command('create')
		.argument('[name]', 'The name of the auth instance')
		.description('Create an user for your userpool')
		.action(async (name: string | undefined) => {
			await layout('auth user create', async ({ appConfig, stackConfigs }) => {
				const region = appConfig.region
				const credentials = getCredentials(appConfig.profile)
				const accountId = await getAccountId(credentials, region)

				if (!name) {
					name = (await select({
						message: 'Select the auth userpool:',
						options: Object.keys(appConfig.defaults.auth).map(name => ({
							label: name,
							value: name,
						})),
					})) as string
				}

				if (!(name! in appConfig.defaults.auth)) {
					throw new Error(`Provided auth name doesn't exist inside your app config.`)
				}

				const { shared, app } = createApp({ appConfig, stackConfigs, accountId })

				const { workspace } = createWorkSpace({
					credentials,
					region,
				})

				await workspace.hydrate(app)

				let userPoolId: string
				try {
					userPoolId = unwrap(shared.get(`auth-${name}-user-pool-id`))
				} catch (_) {
					throw new Error(`The auth userpool hasn't been deployed yet.`)
				}

				const user = await text({
					message: 'Username:',
					validate(value) {
						if (!value) {
							return 'Required'
						}

						return
					},
				})

				const pass = await password({
					message: 'Password:',
					mask: '*',
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
