import { z } from 'zod'
import { definePlugin } from '../plugin.js'
import { ResourceIdSchema } from '../schema/resource-id.js'
import { TypeGen, TypeObject } from '../util/type-gen.js'
import { formatArn, formatName } from '../formation/util.js'
import { FunctionSchema, toLambdaFunction } from './function.js'
import { DurationSchema } from '../schema/duration.js'
import { UserPool, UserPoolEmail } from '../formation/resource/cognito/user-pool.js'
import { Function } from '../formation/resource/lambda/function.js'
import { Permission } from '../formation/resource/lambda/permission.js'
import { constantCase } from 'change-case'
import { EmailSchema } from '../schema/email.js'
import { Code } from '../formation/resource/lambda/code.js'
import { CustomResource } from '../formation/resource/cloud-formation/custom-resource.js'

// import { Script } from '../formation/resource/cloud-formation/script.js'
// export const AuthIdSchema = z.object({})

const TriggersSchema = z.object({
	/** A pre jwt token generation AWS Lambda trigger. */
	beforeToken: FunctionSchema.optional(),

	/** A pre user login AWS Lambda trigger. */
	beforeLogin: FunctionSchema.optional(),

	/** A post user login AWS Lambda trigger. */
	afterLogin: FunctionSchema.optional(),

	/** A pre user register AWS Lambda trigger. */
	beforeRegister: FunctionSchema.optional(),

	/** A post user register AWS Lambda trigger. */
	afterRegister: FunctionSchema.optional(),

	/** A custom message AWS Lambda trigger. */
	customMessage: FunctionSchema.optional(),

	// /** A custom email sender AWS Lambda trigger */
	// emailSender: FunctionSchema.optional(),

	/** Defines the authentication challenge. */
	defineChallenge: FunctionSchema.optional(),

	/** Creates an authentication challenge. */
	createChallenge: FunctionSchema.optional(),

	/** Verifies the authentication challenge response. */
	verifyChallenge: FunctionSchema.optional(),
})

export const authPlugin = definePlugin({
	name: 'auth',
	schema: z.object({
		defaults: z
			.object({
				/** Define the authenticatable users in your app.
				 * @example
				 * {
				 *   auth: {
				 *     AUTH_NAME: {
				 *       password: {
				 *         minLength: 10,
				 *       },
				 *       validity: {
				 *         refreshToken: '30 days',
				 *       }
				 *     }
				 *   }
				 * }
				 */
				auth: z
					.record(
						ResourceIdSchema,
						z.object({
							/** Specifies whether users can create an user account or if only the administrator can.
							 * @default true
							 */
							allowUserRegistration: z.boolean().default(true),

							/** The email configuration for sending messages.
							 */
							messaging: z
								.object({
									// Specifies the sender's email address.
									fromEmail: EmailSchema,

									// Specifies the sender's name.
									fromName: z.string().optional(),

									// The destination to which the receiver of the email should reply.
									replyTo: EmailSchema.optional(),
								})
								.optional(),

							/** The username policy. */
							username: z
								.object({
									/** Allow the user email to be used as username.
									 * @default true
									 */
									emailAlias: z.boolean().default(true),

									/** Specifies whether username case sensitivity will be enabled.
									 * When usernames and email addresses are case insensitive,
									 * users can sign in as the same user when they enter a different capitalization of their user name.
									 * @default false
									 */
									caseSensitive: z.boolean().default(false),
								})
								.default({}),

							/** The password policy. */
							password: z
								.object({
									/** Required users to have at least the minimum password length.
									 * @default 12
									 */
									minLength: z.number().int().min(6).max(99).default(12),

									/** Required users to use at least one uppercase letter in their password.
									 * @default true
									 */
									uppercase: z.boolean().default(true),

									/** Required users to use at least one lowercase letter in their password.
									 * @default true
									 */
									lowercase: z.boolean().default(true),

									/** Required users to use at least one number in their password.
									 * @default true
									 */
									numbers: z.boolean().default(true),

									/** Required users to use at least one symbol in their password.
									 * @default true
									 */
									symbols: z.boolean().default(true),

									/** The duration a temporary password is valid.
									 * If the user doesn't sign in during this time, an administrator must reset their password.
									 * @default '7 days'
									 */
									temporaryPasswordValidity: DurationSchema.default('7 days'),
								})
								.default({}),

							/** Specifies the validity duration for every JWT token. */
							validity: z
								.object({
									/** The ID token time limit.
									 * After this limit expires, your user can't use their ID token.
									 * @default '1 hour'
									 */
									idToken: DurationSchema.default('1 hour'),

									/** The access token time limit.
									 * After this limit expires, your user can't use their access token.
									 * @default '1 hour'
									 */
									accessToken: DurationSchema.default('1 hour'),

									/** The refresh token time limit.
									 * After this limit expires, your user can't use their refresh token.
									 * @default '365 days'
									 */
									refreshToken: DurationSchema.default('365 days'),
								})
								.default({}),

							/** Specifies the configuration for AWS Lambda triggers. */
							triggers: TriggersSchema.optional(),
						})
					)
					.default({}),
			})
			.default({}),

		stacks: z
			.object({
				/** Define the auth triggers in your stack.
				 * @example
				 * {
				 *   auth: {
				 *     AUTH_NAME: {
				 *       triggers: {
				 *         beforeLogin: 'function.ts',
				 *       }
				 *     }
				 *   }
				 * }
				 */
				auth: z
					.record(
						ResourceIdSchema,
						z.object({
							/** Give access to every function in this stack to your cognito instance.
							 * @default false
							 */
							access: z.boolean().default(false),

							/** Specifies the configuration for AWS Lambda triggers. */
							triggers: TriggersSchema.optional(),
						})
					)
					.optional(),
			})
			.array(),
	}),
	onTypeGen({ config }) {
		const gen = new TypeGen('@awsless/awsless')
		const resources = new TypeObject(1)

		for (const name of Object.keys(config.defaults.auth)) {
			const authName = formatName(`${config.name}-${name}`)
			resources.addType(
				name,
				`{ readonly name: '${authName}', readonly userPoolId: string, readonly clientId: string }`
			)
		}

		gen.addInterface('AuthResources', resources)

		return gen.toString()
	},
	onStack({ bootstrap, stackConfig, bind }) {
		for (const [id, props] of Object.entries(stackConfig.auth ?? {})) {
			if (props.access) {
				const userPoolId = bootstrap.import(`auth-${id}-user-pool-id`)
				const clientId = bootstrap.import(`auth-${id}-client-id`)
				const clientSecret = bootstrap.import(`auth-${id}-client-secret`)
				const name = constantCase(id)

				bind(lambda => {
					lambda.addEnvironment(`AUTH_${name}_USER_POOL_ID`, userPoolId)
					lambda.addEnvironment(`AUTH_${name}_CLIENT_ID`, clientId)
					lambda.addEnvironment(`AUTH_${name}_CLIENT_SECRET`, clientSecret)
					lambda.addPermissions({
						actions: ['cognito:*'],
						resources: ['*'],
					})
				})
			}
		}
	},
	onApp(ctx) {
		const { config, bootstrap } = ctx

		if (Object.keys(config.defaults.auth).length === 0) {
			return
		}

		// const clientSecretScript = new Script(`auth-client-secret`, {
		// 	name: `${config.name}-auth-client-secret`,
		// 	onCreate: {
		// 		code: Code.fromFeature('cognito-client-secret'),
		// 		permissions: {
		// 			actions: ['cognito-idp:DescribeUserPoolClient'],
		// 			resources: ['*'],
		// 		},
		// 	},
		// })

		const clientSecretLambda = new Function(`auth-client-secret`, {
			name: `${config.name}-auth-client-secret`,
			code: Code.fromFeature('cognito-client-secret'),
		})

		clientSecretLambda.addPermissions({
			actions: ['cognito-idp:DescribeUserPoolClient'],
			resources: ['*'],
		})

		bootstrap.add(clientSecretLambda)

		for (const [id, props] of Object.entries(config.defaults.auth)) {
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
				name: `${config.name}-${id}`,
				allowUserRegistration: props.allowUserRegistration,
				username: props.username,
				password: props.password,
				triggers,
				email: emailConfig,
			})

			const client = userPool.addClient({
				name: `${config.name}-${id}`,
				validity: props.validity,
				generateSecret: true,
				supportedIdentityProviders: ['cognito'],
				authFlows: {
					userSrp: true,
				},
			})

			const domain = userPool.addDomain({
				domain: `${config.name}-${id}`,
			})

			// const clientSecret = clientSecretScript
			// 	.createInstance(id, {
			// 		params: {
			// 			userPoolId: userPool.id,
			// 			clientId: client.id,
			// 		},
			// 	})
			// 	.dependsOn(client, userPool)

			const clientSecret = new CustomResource(`${id}-client-secret`, {
				serviceToken: clientSecretLambda.arn,
				properties: {
					userPoolId: userPool.id,
					clientId: client.id,
				},
			}).dependsOn(client, userPool)

			bootstrap
				.add(userPool)
				.add(clientSecret)
				.export(`auth-${id}-user-pool-arn`, userPool.arn)
				.export(`auth-${id}-user-pool-id`, userPool.id)
				.export(`auth-${id}-client-id`, client.id)
				.export(`auth-${id}-client-secret`, clientSecret.getAtt('secret'))
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
		}

		// bind(lambda => {
		// 	lambda.addPermissions({
		// 		actions: ['cognito:*'],
		// 		resources: ['*'],
		// 	})
		// })
	},
})
