
import { z } from 'zod'
import { definePlugin } from '../plugin.js';
import { ResourceIdSchema } from '../schema/resource-id.js';
import { TypeGen } from '../util/type-gen.js';
import { formatName } from '../formation/util.js';
import { FunctionSchema, toLambdaFunction } from './function.js';
import { DurationSchema } from '../schema/duration.js';
import { UserPool } from '../formation/resource/cognito/user-pool.js';
import { Function } from '../formation/resource/lambda/function.js';
import { Permission } from '../formation/resource/lambda/permission.js';

// export const AuthIdSchema = z.object({})

export const authPlugin = definePlugin({
	name: 'auth',
	schema: z.object({
		defaults: z.object({
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
			auth: z.record(
				ResourceIdSchema,
				z.object({
					/** Specifies whether users can create an user account or if only the administrator can.
					 * @default true
					 */
					allowUserRegistration: z.boolean().default(true),

					/** The username policy. */
					username: z.object({
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
					}).default({}),

					/** The password policy. */
					password: z.object({
						/** Required users to have at least the minimum password length.
						 * @default 8
						 */
						minLength: z.number().int().min(6).max(99).default(8),

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
					}).default({}),

					/** Specifies the validity duration for every JWT token. */
					validity: z.object({
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
					}).default({}),

					/** Specifies the configuration for AWS Lambda triggers. */
					events: z.object({
						/** A pre jwt token generation AWS Lambda trigger. */
						preToken: FunctionSchema.optional(),

						/** A pre user login AWS Lambda trigger. */
						preLogin: FunctionSchema.optional(),

						/** A post user login AWS Lambda trigger. */
						postLogin: FunctionSchema.optional(),

						/** A pre user register AWS Lambda trigger. */
						preRegister: FunctionSchema.optional(),

						/** A post user register AWS Lambda trigger. */
						postRegister: FunctionSchema.optional(),

						/** A custom message AWS Lambda trigger. */
						customMessage: FunctionSchema.optional(),

						/** Defines the authentication challenge. */
						defineChallenge: FunctionSchema.optional(),

						/** Creates an authentication challenge. */
						createChallenge: FunctionSchema.optional(),

						/** Verifies the authentication challenge response. */
						verifyChallenge: FunctionSchema.optional(),
					}).optional()
				})
			).default({}),
		}).default({}),
	}),
	onTypeGen({ config }) {
		const gen = new TypeGen('@awsless/awsless', 'AuthResources')

		for(const name of Object.keys(config.defaults.auth)) {
			gen.addType(name, `{ name: '${ formatName(name) }' }`)
		}

		return gen.toString()
	},
	onApp(ctx) {
		const { config, bootstrap, bind } = ctx

		for(const [ id, props ] of Object.entries(config.defaults.auth)) {

			const functions = new Map<string, Function>()
			const events:Record<string, string> = {}

			for(const [ event, fnProps ] of Object.entries(props.events ?? {})) {
				const lambda = toLambdaFunction(ctx as any, `auth-${id}-${event}`, fnProps)
				functions.set(event, lambda)
				events[event] = lambda.arn
			}

			const userPool = new UserPool(id, {
				name: `${config.name}-${id}`,
				allowUserRegistration: props.allowUserRegistration,
				username: props.username,
				password: props.password,
				events,
			})

			const client = userPool.addClient({
				name: `${config.name}-${id}`,
				validity: props.validity,
				generateSecret: true,
				supportedIdentityProviders: [ 'cognito' ],
				authFlows: {
					userSrp: true
				},
			})

			const domain = userPool.addDomain({
				domain: `${config.name}-${id}`,
			})

			bootstrap
				.add(userPool)
				.export(`auth-${id}-user-pool-arn`, userPool.arn)
				.export(`auth-${id}-user-pool-id`, userPool.id)
				.export(`auth-${id}-client-id`, client.id)
				.export(`auth-${id}-domain`, domain.domain)

			for(const [ event, lambda ] of functions) {
				const permission = new Permission(`auth-${id}-${event}`, {
					action: 'lambda:InvokeFunction',
					principal: 'cognito-idp.amazonaws.com',
					functionArn: lambda.arn,
					sourceArn: userPool.arn,
				}).dependsOn(lambda)

				bootstrap.add(
					lambda,
					permission
				)
			}
		}

		bind(lambda => {
			lambda.addPermissions({
				actions: [ 'cognito:*' ],
				resources: [ '*' ],
			})
		})
	},
})
