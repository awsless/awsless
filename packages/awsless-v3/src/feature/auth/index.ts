import { Group } from '@terraforge/core'
import { aws } from '@terraforge/aws'
import { constantCase } from 'change-case'
import { defineFeature } from '../../feature.js'
import { TypeFile } from '../../type-gen/file.js'
import { TypeObject } from '../../type-gen/object.js'
import { formatGlobalResourceName } from '../../util/name.js'
// import { createAsyncLambdaFunction } from '../function/util.js'
import { toDays, toHours } from '@awsless/duration'

// const typeGenCode = `
// import { ListUsersCommandOutput } from '@aws-sdk/client-cognito-identity-provider'

// type Auth = {
// 	readonly userPoolId: string
// 	readonly clientId: string
// 	// readonly listUsers: (limit: number, filter?: string) => Promise<ListUsersCommandOutput>
// }
// `

export const authFeature = defineFeature({
	name: 'auth',
	async onTypeGen(ctx) {
		const gen = new TypeFile('@awsless/awsless')
		const resources = new TypeObject(1)

		for (const name of Object.keys(ctx.appConfig.defaults.auth)) {
			resources.addType(name, `{ readonly userPoolId: string, readonly clientId: string }`)
		}

		// gen.addCode(typeGenCode)
		gen.addInterface('AuthResources', resources)

		await ctx.write('auth.d.ts', gen, true)
	},
	// onStack(ctx) {
	// 	for (const [id, props] of Object.entries(ctx.stackConfig.auth ?? {})) {
	// 		const group = new Group(ctx.stack, 'auth', id)

	// 		const userPoolId = ctx.shared.get<string>(`auth-${id}-user-pool-id`)
	// 		const userPoolArn = ctx.shared.get<string>(`auth-${id}-user-pool-arn`)
	// 		const clientId = ctx.shared.get<string>(`auth-${id}-client-id`)

	// 		const triggers: Record<string, Output<aws.ARN>> = {}
	// 		const list: Record<
	// 			string,
	// 			{
	// 				trigger: string
	// 				group: Node
	// 				lambda: aws.lambda.Function
	// 				policy: aws.iam.RolePolicy
	// 			}
	// 		> = {}

	// 		for (const [trigger, triggerProps] of Object.entries(props.triggers ?? {})) {
	// 			const triggerGroup = new Node(group, 'trigger', trigger)

	// 			const { lambda, policy } = createAsyncLambdaFunction(
	// 				triggerGroup,
	// 				ctx,
	// 				'auth',
	// 				`${id}-${trigger}`,
	// 				triggerProps
	// 			)

	// 			triggers[trigger] = lambda.arn

	// 			list[trigger] = {
	// 				trigger,
	// 				group: triggerGroup,
	// 				lambda,
	// 				policy,
	// 			}
	// 		}

	// 		new aws.cognito.LambdaTriggers(group, 'lambda-triggers', {
	// 			userPoolId,
	// 			triggers,
	// 		})

	// 		for (const item of Object.values(list)) {
	// 			new aws.lambda.Permission(item.group, `permission`, {
	// 				action: 'lambda:InvokeFunction',
	// 				principal: 'cognito-idp.amazonaws.com',
	// 				functionArn: item.lambda.arn,
	// 				sourceArn: userPoolArn,
	// 			})

	// 			item.lambda.addEnvironment(`AUTH_${constantCase(id)}_USER_POOL_ID`, userPoolId)
	// 			item.lambda.addEnvironment(`AUTH_${constantCase(id)}_CLIENT_ID`, clientId)
	// 			item.policy.addStatement({
	// 				actions: ['cognito-idp:*'],
	// 				resources: [
	// 					// Not yet known if this is correct way to grant access to all resources
	// 					userPoolArn,

	// 					// userPoolId.apply<aws.ARN>(
	// 					// 	id => `arn:aws:cognito-idp:${ctx.appConfig.region}:${ctx.accountId}:userpool/${id}`
	// 					// ),
	// 					// userPoolId.apply<aws.ARN>(
	// 					// 	id => `arn:aws:cognito-idp:${ctx.appConfig.region}:${ctx.accountId}:userpool/${id}*`
	// 					// ),
	// 				],
	// 			})
	// 		}
	// 	}

	// 	// for (const [id, props] of Object.entries(ctx.stackConfig.auth ?? {})) {
	// 	// 	if (props.access) {
	// 	// 		const userPoolId = ctx.app.import<string>('base', `auth-${id}-user-pool-id`)
	// 	// 		const clientId = ctx.app.import<string>('base', `auth-${id}-client-id`)
	// 	// 		const name = constantCase(id)
	// 	//
	// 	// 		ctx.onFunction(({ lambda, policy }) => {
	// 	// 			lambda.addEnvironment(`AUTH_${name}_USER_POOL_ID`, userPoolId)
	// 	// 			lambda.addEnvironment(`AUTH_${name}_CLIENT_ID`, clientId)
	// 	//
	// 	// 			policy.addStatement({
	// 	// 				actions: ['cognito:*'],
	// 	// 				resources: [
	// 	// 					// Not yet known if this is correct way to grant access to all resources
	// 	// 					`arn:aws:cognito-idp:*:*:userpool/${userPoolId}`,
	// 	// 					`arn:aws:cognito-idp:*:*:userpool/${userPoolId}*`,
	// 	// 				],
	// 	// 			})
	// 	// 		})
	// 	// 	}
	// 	// }
	// },
	onApp(ctx) {
		for (const [id, props] of Object.entries(ctx.appConfig.defaults.auth ?? {})) {
			const group = new Group(ctx.base, 'auth', id)

			// let emailConfig: aws.cognito.UserPoolProps['email'] | undefined

			// if (props.messaging) {
			// 	const [_, domainName] = props.messaging.fromEmail.split('@')

			// 	emailConfig = {
			// 		type: 'developer',
			// 		replyTo: props.messaging.replyTo,
			// 		sourceArn: ctx.shared.get<aws.ARN>(`mail-${domainName}-arn`),
			// 		configurationSet: ctx.shared.get<string>('mail-configuration-set'),
			// 		from: props.messaging.fromName
			// 			? `${props.messaging.fromName} <${props.messaging.fromEmail}>`
			// 			: props.messaging.fromEmail,
			// 	}
			// }

			const name = formatGlobalResourceName({
				appName: ctx.app.name,
				resourceType: 'auth',
				resourceName: id,
			})

			// props.username

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
					// aliasAttributes: ['email'],
					// autoVerifiedAttributes: ['email'],
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
					deletionProtection: ctx.appConfig.protect ? 'ACTIVE' : 'INACTIVE',
				},
				{
					retainOnDelete: ctx.appConfig.removal === 'retain',
					import: ctx.import ? name : undefined,
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

			ctx.shared.add('auth', 'user-pool-arn', id, userPool.arn)
			ctx.shared.add('auth', 'user-pool-id', id, userPool.id)
			ctx.shared.add('auth', 'client-id', id, client.id)
		}
	},
})
