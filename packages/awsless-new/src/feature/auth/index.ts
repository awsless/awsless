import { constantCase } from 'change-case'
import { defineFeature } from '../../feature.js'
import { TypeFile } from '../../type-gen/file.js'
import { TypeObject } from '../../type-gen/object.js'
import { formatGlobalResourceName } from '../../util/name.js'
import { Node, Output, aws } from '@awsless/formation'
import { createLambdaFunction } from '../function/util.js'

export const authFeature = defineFeature({
	name: 'auth',
	async onTypeGen(ctx) {
		const gen = new TypeFile('@awsless/awsless')
		const resources = new TypeObject(1)

		for (const name of Object.keys(ctx.appConfig.defaults.auth)) {
			const authName = formatGlobalResourceName(ctx.appConfig.name, 'auth', name)
			resources.addType(
				name,
				`{ readonly name: '${authName}', readonly userPoolId: string, readonly clientId: string }`
			)
		}

		gen.addInterface('AuthResources', resources)

		await ctx.write('auth.d.ts', gen, true)
	},
	onStack(ctx) {
		for (const [id, props] of Object.entries(ctx.stackConfig.auth ?? {})) {
			const group = new Node(ctx.stack, 'auth', id)

			const userPoolId = ctx.shared.get<string>(`auth-${id}-user-pool-id`)
			const userPoolArn = ctx.shared.get<aws.ARN>(`auth-${id}-user-pool-arn`)
			const clientId = ctx.shared.get<string>(`auth-${id}-client-id`)

			const triggers: Record<string, Output<aws.ARN>> = {}
			const list: Record<
				string,
				{
					trigger: string
					group: Node
					lambda: aws.lambda.Function
					policy: aws.iam.RolePolicy
				}
			> = {}

			for (const [trigger, triggerProps] of Object.entries(props.triggers ?? {})) {
				const triggerGroup = new Node(group, 'trigger', trigger)

				const { lambda, policy } = createLambdaFunction(
					triggerGroup,
					ctx,
					this.name,
					`${id}-${trigger}`,
					triggerProps
				)

				triggers[trigger] = lambda.arn

				list[trigger] = {
					trigger,
					group: triggerGroup,
					lambda,
					policy,
				}
			}

			new aws.cognito.LambdaTriggers(group, 'lambda-triggers', {
				userPoolId,
				triggers,
			})

			for (const item of Object.values(list)) {
				new aws.lambda.Permission(item.group, `permission`, {
					action: 'lambda:InvokeFunction',
					principal: 'cognito-idp.amazonaws.com',
					functionArn: item.lambda.arn,
					sourceArn: userPoolArn,
				})

				item.lambda.addEnvironment(`AUTH_${constantCase(id)}_USER_POOL_ID`, userPoolId)
				item.lambda.addEnvironment(`AUTH_${constantCase(id)}_CLIENT_ID`, clientId)
				item.policy.addStatement({
					actions: ['cognito:*'],
					resources: [
						// Not yet known if this is correct way to grant access to all resources
						userPoolArn,

						// userPoolId.apply<aws.ARN>(
						// 	id => `arn:aws:cognito-idp:${ctx.appConfig.region}:${ctx.accountId}:userpool/${id}`
						// ),
						// userPoolId.apply<aws.ARN>(
						// 	id => `arn:aws:cognito-idp:${ctx.appConfig.region}:${ctx.accountId}:userpool/${id}*`
						// ),
					],
				})
			}
		}

		// for (const [id, props] of Object.entries(ctx.stackConfig.auth ?? {})) {
		// 	if (props.access) {
		// 		const userPoolId = ctx.app.import<string>('base', `auth-${id}-user-pool-id`)
		// 		const clientId = ctx.app.import<string>('base', `auth-${id}-client-id`)
		// 		const name = constantCase(id)

		// 		ctx.onFunction(({ lambda, policy }) => {
		// 			lambda.addEnvironment(`AUTH_${name}_USER_POOL_ID`, userPoolId)
		// 			lambda.addEnvironment(`AUTH_${name}_CLIENT_ID`, clientId)

		// 			policy.addStatement({
		// 				actions: ['cognito:*'],
		// 				resources: [
		// 					// Not yet known if this is correct way to grant access to all resources
		// 					`arn:aws:cognito-idp:*:*:userpool/${userPoolId}`,
		// 					`arn:aws:cognito-idp:*:*:userpool/${userPoolId}*`,
		// 				],
		// 			})
		// 		})
		// 	}
		// }
	},
	onApp(ctx) {
		for (const [id, props] of Object.entries(ctx.appConfig.defaults.auth ?? {})) {
			const group = new Node(ctx.base, 'auth', id)

			let emailConfig: aws.cognito.UserPoolProps['email'] | undefined

			if (props.messaging) {
				const [_, domainName] = props.messaging.fromEmail.split('@')

				emailConfig = {
					type: 'developer',
					replyTo: props.messaging.replyTo,
					sourceArn: ctx.shared.get<aws.ARN>(`mail-${domainName}-arn`),
					configurationSet: ctx.shared.get<string>('mail-configuration-set'),
					from: props.messaging.fromName
						? `${props.messaging.fromName} <${props.messaging.fromEmail}>`
						: props.messaging.fromEmail,
				}
			}

			const name = formatGlobalResourceName(ctx.appConfig.name, 'auth', id)

			const userPool = new aws.cognito.UserPool(group, 'user-pool', {
				name,
				// deletionProtection: true,
				allowUserRegistration: props.allowUserRegistration,
				username: props.username,
				password: props.password,
				email: emailConfig,
			})

			const client = new aws.cognito.UserPoolClient(group, 'client', {
				userPoolId: userPool.id,
				name,
				validity: props.validity,
				supportedIdentityProviders: ['cognito'],
				authFlows: {
					userSrp: true,
				},
			})

			// const domain = new aws.cognito.UserPoolDomain('domain', {
			// 	userPoolId: userPool.id,
			// 	domain: '',
			// })

			ctx.shared.set(`auth-${id}-user-pool-arn`, userPool.arn)
			ctx.shared.set(`auth-${id}-user-pool-id`, userPool.id)
			ctx.shared.set(`auth-${id}-client-id`, client.id)
		}
	},
})
