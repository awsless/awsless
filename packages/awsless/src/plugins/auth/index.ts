import { definePlugin } from '../../plugin.js'
import { TypeGen, TypeObject } from '../../util/type-gen.js'
import { formatArn, formatName } from '../../formation/util.js'
import { toLambdaFunction } from '../function/index.js'
import { UserPool, UserPoolEmail } from '../../formation/resource/cognito/user-pool.js'
import { Function } from '../../formation/resource/lambda/function.js'
import { Permission } from '../../formation/resource/lambda/permission.js'
import { constantCase } from 'change-case'
import { Code } from '../../formation/resource/lambda/code.js'
import { CustomResource } from '../../formation/resource/cloud-formation/custom-resource.js'

export const authPlugin = definePlugin({
	name: 'auth',
	async onTypeGen({ config, write }) {
		const gen = new TypeGen('@awsless/awsless')
		const resources = new TypeObject(1)

		for (const name of Object.keys(config.app.defaults.auth)) {
			const authName = formatName(`${config.app.name}-${name}`)
			resources.addType(
				name,
				`{ readonly name: '${authName}', readonly userPoolId: string, readonly clientId: string }`
			)
		}

		gen.addInterface('AuthResources', resources)

		await write('auth.d.ts', gen, true)
	},
	// onStack({ config, bootstrap, stackConfig, bind }) {
	// 	for (const [id, props] of Object.entries(stackConfig.auth ?? {})) {
	// 		if (props.access) {
	// 			const userPoolId = bootstrap.import(`auth-${id}-user-pool-id`)
	// 			const clientId = bootstrap.import(`auth-${id}-client-id`)
	// 			const name = constantCase(id)

	// 			bind(lambda => {
	// 				lambda.addEnvironment(`AUTH_${name}_USER_POOL_ID`, userPoolId)
	// 				lambda.addEnvironment(`AUTH_${name}_CLIENT_ID`, clientId)

	// 				if (config.app.defaults.auth?.[id]?.secret) {
	// 					const clientSecret = bootstrap.import(`auth-${id}-client-secret`)
	// 					lambda.addEnvironment(`AUTH_${name}_CLIENT_SECRET`, clientSecret)
	// 				}

	// 				lambda.addPermissions({
	// 					actions: ['cognito:*'],
	// 					resources: ['*'],
	// 				})
	// 			})
	// 		}
	// 	}
	// },
	onStack({ config, bootstrap, bind }) {
		// Give access to every lambda function in our app to our cognito instance.
		for (const [id, props] of Object.entries(config.app.defaults.auth)) {
			bind(lambda => {
				const userPoolArn = bootstrap.import(`auth-${id}-user-pool-arn`)
				const userPoolId = bootstrap.import(`auth-${id}-user-pool-id`)
				const clientId = bootstrap.import(`auth-${id}-client-id`)

				const name = constantCase(id)

				lambda.addEnvironment(`AUTH_${name}_USER_POOL_ID`, userPoolId)
				lambda.addEnvironment(`AUTH_${name}_CLIENT_ID`, clientId)

				// lambda.addEnvironment(`AWSLESS_PUBLIC_AUTH_${name}_USER_POOL_ID`, userPoolId)
				// lambda.addEnvironment(`AWSLESS_PUBLIC_AUTH_${name}_CLIENT_ID`, clientId)

				if (props.secret) {
					const clientSecret = bootstrap.import(`auth-${id}-client-secret`)
					lambda.addEnvironment(`AUTH_${name}_CLIENT_SECRET`, clientSecret)
				}

				lambda.addPermissions({
					actions: ['cognito:*'],
					resources: [userPoolArn],
				})
			})
		}
	},
	onApp(ctx) {
		const { config, bootstrap } = ctx

		if (Object.keys(config.app.defaults.auth).length === 0) {
			return
		}

		// const clientSecretScript = new Script(`auth-client-secret`, {
		// 	name: `${config.app.name}-auth-client-secret`,
		// 	onCreate: {
		// 		code: Code.fromFeature('cognito-client-secret'),
		// 		permissions: {
		// 			actions: ['cognito-idp:DescribeUserPoolClient'],
		// 			resources: ['*'],
		// 		},
		// 	},
		// })

		const clientSecretLambda = new Function(`auth-client-secret`, {
			name: `${config.app.name}-auth-client-secret`,
			code: Code.fromFeature('cognito-client-secret'),
		})

		clientSecretLambda.addPermissions({
			actions: ['cognito-idp:DescribeUserPoolClient'],
			resources: ['*'],
		})

		bootstrap.add(clientSecretLambda)

		for (const [id, props] of Object.entries(config.app.defaults.auth)) {
			const functions = new Map<string, Function>()
			const triggers: Record<string, string> = {}

			for (const [trigger, fnProps] of Object.entries(props.triggers ?? {})) {
				const lambda = toLambdaFunction(ctx as any, `auth-${id}-${trigger}`, fnProps)
				functions.set(trigger, lambda)
				triggers[trigger] = lambda.arn
			}

			for (const stack of config.stacks) {
				for (const [trigger, fnProps] of Object.entries(stack.auth?.[id]?.triggers ?? {})) {
					const lambda = toLambdaFunction(ctx as any, `auth-${id}-${trigger}`, fnProps)

					if (functions.has(trigger)) {
						throw new TypeError(
							`Only one "${trigger}" trigger can be defined for each auth instance: ${id}`
						)
					}

					functions.set(trigger, lambda)
					triggers[trigger] = lambda.arn
				}
			}

			let emailConfig: UserPoolEmail | undefined

			if (props.messaging) {
				const [_, ...parts] = props.messaging.fromEmail.split('@')
				const domainName = parts.join('@')

				emailConfig = UserPoolEmail.withSES({
					...props.messaging,
					sourceArn: formatArn({
						service: 'ses',
						resource: 'identity',
						resourceName: domainName,
					}),
				})
			}

			const userPool = new UserPool(id, {
				name: `${config.app.name}-${id}`,
				allowUserRegistration: props.allowUserRegistration,
				username: props.username,
				password: props.password,
				triggers,
				email: emailConfig,
			})

			const client = userPool.addClient({
				name: `${config.app.name}-${id}`,
				validity: props.validity,
				generateSecret: props.secret,
				supportedIdentityProviders: ['cognito'],
				authFlows: {
					userSrp: true,
				},
			})

			const domain = userPool.addDomain({
				domain: `${config.app.name}-${id}`,
			})

			// const clientSecret = clientSecretScript
			// 	.createInstance(id, {
			// 		params: {
			// 			userPoolId: userPool.id,
			// 			clientId: client.id,
			// 		},
			// 	})
			// 	.dependsOn(client, userPool)

			if (props.secret) {
				const clientSecret = new CustomResource(`${id}-client-secret`, {
					serviceToken: clientSecretLambda.arn,
					properties: {
						userPoolId: userPool.id,
						clientId: client.id,
					},
				}).dependsOn(client, userPool)

				bootstrap.add(clientSecret).export(`auth-${id}-client-secret`, clientSecret.getAtt('secret'))
			}

			bootstrap
				.add(userPool)
				.export(`auth-${id}-user-pool-arn`, userPool.arn)
				.export(`auth-${id}-user-pool-id`, userPool.id)
				.export(`auth-${id}-client-id`, client.id)
				.export(`auth-${id}-domain`, domain.domain)

			for (const [event, lambda] of functions) {
				const permission = new Permission(`auth-${id}-${event}`, {
					action: 'lambda:InvokeFunction',
					principal: 'cognito-idp.amazonaws.com',
					functionArn: lambda.arn,
					sourceArn: userPool.arn,
				}).dependsOn(lambda)

				bootstrap.add(lambda, permission)
			}

			// Give access to every lambda function in our app to our cognito instance.
			// bind(lambda => {
			// 	const userPoolArn = bootstrap.import(`auth-${id}-user-pool-arn`)
			// 	const userPoolId = bootstrap.import(`auth-${id}-user-pool-id`)
			// 	const clientId = bootstrap.import(`auth-${id}-client-id`)

			// 	const name = constantCase(id)

			// 	// lambda.

			// 	lambda.addEnvironment(`AUTH_${name}_USER_POOL_ID`, userPoolId)
			// 	lambda.addEnvironment(`AUTH_${name}_CLIENT_ID`, clientId)

			// 	// lambda.addEnvironment(`AWSLESS_PUBLIC_AUTH_${name}_USER_POOL_ID`, userPoolId)
			// 	// lambda.addEnvironment(`AWSLESS_PUBLIC_AUTH_${name}_CLIENT_ID`, clientId)

			// 	if (props.secret) {
			// 		const clientSecret = bootstrap.import(`auth-${id}-client-secret`)
			// 		lambda.addEnvironment(`AUTH_${name}_CLIENT_SECRET`, clientSecret)
			// 	}

			// 	lambda.addPermissions({
			// 		actions: ['cognito:*'],
			// 		resources: [userPoolArn],
			// 	})
			// })
		}

		// bind(lambda => {
		// 	lambda.addPermissions({
		// 		actions: ['cognito:*'],
		// 		resources: ['*'],
		// 	})
		// })
	},
})
