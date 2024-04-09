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
			const authName = formatGlobalResourceName(ctx.appConfig.name, this.name, name)
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
			if (props.access) {
				const userPoolId = ctx.app.import<string>('base', `auth-${id}-user-pool-id`)
				const clientId = ctx.app.import<string>('base', `auth-${id}-client-id`)
				const name = constantCase(id)

				ctx.onFunction(({ lambda, policy }) => {
					lambda.addEnvironment(`AUTH_${name}_USER_POOL_ID`, userPoolId)
					lambda.addEnvironment(`AUTH_${name}_CLIENT_ID`, clientId)

					policy.addStatement({
						actions: ['cognito:*'],
						resources: [
							`arn:aws:cognito-idp:*:*:userpool/${userPoolId}`,
							`arn:aws:cognito-idp:*:*:userpool/${userPoolId}*`,
						],
					})
				})
			}
		}
	},
	onApp(ctx) {
		for (const [id, props] of Object.entries(ctx.appConfig.defaults.auth ?? {})) {
			const group = new Node(this.name, id)
			ctx.base.add(group)

			const triggers: Record<string, Output<aws.ARN>> = {}

			// const list = new Map<
			// 	string,
			// 	{
			// 		trigger: string
			// 		group: Node
			// 		lambda: aws.lambda.Function
			// 	}
			// >()

			const list: Record<
				string,
				{
					trigger: string
					group: Node
					lambda: aws.lambda.Function
				}
			> = {}

			for (const [trigger, triggerProps] of Object.entries(props.triggers ?? {})) {
				const triggerGroup = new Node('trigger', trigger)
				group.add(triggerGroup)

				const { lambda } = createLambdaFunction(
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
				}
			}

			// for (const [trigger, fnProps] of Object.entries(props.triggers ?? {})) {
			// 	const triggerGroup = new Node('trigger', trigger)
			// 	group.add(triggerGroup)

			// 	const { lambda } = createLambdaFunction(triggerGroup, ctx, this.name, `${id}-${trigger}`, fnProps)
			// 	functions.set(trigger, lambda)
			// 	triggers[trigger] = lambda.arn
			// }

			for (const stack of ctx.stackConfigs) {
				for (const [trigger, triggerProps] of Object.entries(stack.auth?.[id]?.triggers ?? {})) {
					if (trigger in list) {
						throw new TypeError(
							`Only one "${trigger}" trigger can be defined for each auth instance: ${id}`
						)
					}
					const triggerGroup = new Node('trigger', trigger)
					group.add(triggerGroup)

					const { lambda } = createLambdaFunction(
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
					}
				}
			}

			// let emailConfig: aws.cognito.UserPoolEmail | undefined
			let emailConfig: aws.cognito.UserPoolProps['email'] | undefined

			if (props.messaging) {
				const [_, domainName] = props.messaging.fromEmail.split('@')

				emailConfig = {
					type: 'developer',
					replyTo: props.messaging.replyTo,
					sourceArn: ctx.base.import<aws.ARN>(`mail-${domainName}-arn`),
					from: props.messaging.fromName
						? `${props.messaging.fromName} <${props.messaging.fromEmail}>`
						: props.messaging.fromEmail,
				}
			}

			const name = formatGlobalResourceName(ctx.appConfig.name, this.name, id)

			const userPool = new aws.cognito.UserPool('user-pool', {
				name,
				deletionProtection: true,
				allowUserRegistration: props.allowUserRegistration,
				username: props.username,
				password: props.password,
				triggers,
				email: emailConfig,
			})

			group.add(userPool)

			const client = new aws.cognito.UserPoolClient('client', {
				userPoolId: userPool.id,
				name,
				validity: props.validity,
				supportedIdentityProviders: ['cognito'],
				authFlows: {
					userSrp: true,
				},
			})

			group.add(client)

			// const domain = new aws.cognito.UserPoolDomain('domain', {
			// 	userPoolId: userPool.id,
			// 	domain: '',
			// })

			// ctx.base.add(userPool)
			ctx.base.export(`auth-${id}-user-pool-arn`, userPool.arn)
			ctx.base.export(`auth-${id}-user-pool-id`, userPool.id)
			ctx.base.export(`auth-${id}-client-id`, client.id)

			for (const item of Object.values(list)) {
				const permission = new aws.lambda.Permission(`permission`, {
					action: 'lambda:InvokeFunction',
					principal: 'cognito-idp.amazonaws.com',
					functionArn: item.lambda.arn,
					sourceArn: userPool.arn,
				})

				item.group.add(permission)
			}

			// for (const [event, lambda] of functions) {
			// 	const permission = new aws.lambda.Permission(`auth-${id}-${event}`, {
			// 		action: 'lambda:InvokeFunction',
			// 		principal: 'cognito-idp.amazonaws.com',
			// 		functionArn: lambda.arn,
			// 		sourceArn: userPool.arn,
			// 	})

			// 	ctx.base.add(permission)
			// }
		}
	},
})
