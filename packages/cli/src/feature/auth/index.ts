import { toDays, toHours } from '@awsless/duration'
import { aws } from '@terraforge/aws'
import { Group } from '@terraforge/core'
import { constantCase } from 'change-case'
import { defineFeature } from '../../feature.js'
import { TypeFile } from '../../type-gen/file.js'
import { TypeObject } from '../../type-gen/object.js'
import { formatGlobalResourceName } from '../../util/name.js'
import { authOnDev } from './dev.js'

export const authFeature = defineFeature({
	name: 'auth',
	onDev: authOnDev,
	async onTypeGen(ctx) {
		const gen = new TypeFile('awsless')
		const resources = new TypeObject(1)

		for (const name of Object.keys(ctx.appConfig.auth)) {
			resources.addType(name, `{ readonly userPoolId: string, readonly clientId: string }`)
		}

		gen.addInterface('AuthResources', resources)

		await ctx.write('auth.d.ts', gen, true)
	},
	onApp(ctx) {
		for (const [id, props] of Object.entries(ctx.appConfig.auth ?? {})) {
			const group = new Group(ctx.base, 'auth', id)

			const name = formatGlobalResourceName({
				appName: ctx.app.name,
				resourceType: 'auth',
				resourceName: id,
			})

			const userPool = new aws.cognito.UserPool(
				group,
				'user-pool',
				{
					name,
					adminCreateUserConfig: {
						allowAdminCreateUserOnly: !props.allowUserRegistration,
					},
					accountRecoverySetting: {
						recoveryMechanism: [
							{
								name: 'verified_email',
								priority: 1,
							},
						],
					},
					usernameConfiguration: {
						caseSensitive: props.username.caseSensitive,
					},
					deviceConfiguration: {
						deviceOnlyRememberedOnUserPrompt: false,
					},
					passwordPolicy: {
						minimumLength: props.password.minLength,
						requireLowercase: props.password.lowercase,
						requireUppercase: props.password.uppercase,
						requireNumbers: props.password.numbers,
						requireSymbols: props.password.symbols,
						temporaryPasswordValidityDays: toDays(props.password.temporaryPasswordValidity),
					},
					deletionProtection: ctx.appConfig.removal === 'retain' ? 'ACTIVE' : 'INACTIVE',
				},
				{
					retainOnDelete: ctx.appConfig.removal === 'retain',
				}
			)

			const client = new aws.cognito.UserPoolClient(group, 'client', {
				userPoolId: userPool.id,
				name,
				idTokenValidity: toHours(props.validity.idToken),
				accessTokenValidity: toHours(props.validity.accessToken),
				refreshTokenValidity: toDays(props.validity.refreshToken),
				tokenValidityUnits: [
					{
						idToken: 'hours',
						accessToken: 'hours',
						refreshToken: 'days',
					},
				],
				supportedIdentityProviders: ['COGNITO'],
				explicitAuthFlows: ['ALLOW_USER_SRP_AUTH', 'ALLOW_REFRESH_TOKEN_AUTH'],
				preventUserExistenceErrors: 'ENABLED',
			})

			for (const name of props.groups) {
				new aws.cognito.UserGroup(group, name, {
					name,
					userPoolId: userPool.id,
				})
			}

			ctx.bind(`AUTH_${constantCase(id)}_USER_POOL_ID`, userPool.id)
			ctx.bind(`AUTH_${constantCase(id)}_CLIENT_ID`, client.id)

			ctx.shared.add('auth', 'user-pool-id', id, userPool.id)
		}
	},
})
