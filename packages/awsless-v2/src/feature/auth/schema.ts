import { z } from 'zod'
import { ResourceIdSchema } from '../../config/schema/resource-id.js'
import { FunctionSchema } from '../function/schema.js'
import { DurationSchema } from '../../config/schema/duration.js'
import { EmailSchema } from '../../config/schema/email.js'

const TriggersSchema = z
	.object({
		beforeToken: FunctionSchema.optional().describe('A pre jwt token generation AWS Lambda trigger.'),

		beforeLogin: FunctionSchema.optional().describe('A pre user login AWS Lambda trigger.'),
		afterLogin: FunctionSchema.optional().describe('A post user login AWS Lambda trigger.'),

		beforeRegister: FunctionSchema.optional().describe('A pre user register AWS Lambda trigger.'),
		afterRegister: FunctionSchema.optional().describe('A post user register AWS Lambda trigger.'),

		customMessage: FunctionSchema.optional().describe('A custom message AWS Lambda trigger.'),

		// /** A custom email sender AWS Lambda trigger */
		// emailSender: FunctionSchema.optional(),

		defineChallenge: FunctionSchema.optional().describe('Defines the authentication challenge.'),
		createChallenge: FunctionSchema.optional().describe('Creates an authentication challenge.'),
		verifyChallenge: FunctionSchema.optional().describe('Verifies the authentication challenge response.'),
	})
	.describe('Specifies the configuration for AWS Lambda triggers.')

export const AuthSchema = z
	.record(
		ResourceIdSchema,
		z.object({
			access: z
				.boolean()
				.default(false)
				.describe('Give access to every function in this stack to your cognito instance.'),

			triggers: TriggersSchema.optional(),
		})
	)
	.optional()
	.describe('Define the auth triggers in your stack.')

export const AuthDefaultSchema = z
	.record(
		ResourceIdSchema,
		z.object({
			allowUserRegistration: z
				.boolean()
				.default(true)
				.describe('Specifies whether users can create an user account or if only the administrator can.'),

			messaging: z
				.object({
					fromEmail: EmailSchema.describe("Specifies the sender's email address."),
					fromName: z.string().optional().describe("Specifies the sender's name."),
					replyTo: EmailSchema.optional().describe(
						'The destination to which the receiver of the email should reply.'
					),
				})
				.optional()
				.describe('The email configuration for sending messages.'),

			// secret: z.boolean().default(false).describe('Specifies whether you want to generate a client secret.'),

			username: z
				.object({
					emailAlias: z.boolean().default(true).describe('Allow the user email to be used as username.'),
					caseSensitive: z
						.boolean()
						.default(false)
						.describe(
							'Specifies whether username case sensitivity will be enabled. When usernames and email addresses are case insensitive, users can sign in as the same user when they enter a different capitalization of their user name.'
						),
				})
				.default({})
				.describe('The username policy.'),

			password: z
				.object({
					minLength: z
						.number()
						.int()
						.min(6)
						.max(99)
						.default(12)
						.describe('Required users to have at least the minimum password length.'),

					uppercase: z
						.boolean()
						.default(true)
						.describe('Required users to use at least one uppercase letter in their password.'),

					lowercase: z
						.boolean()
						.default(true)
						.describe('Required users to use at least one lowercase letter in their password.'),

					numbers: z
						.boolean()
						.default(true)
						.describe('Required users to use at least one number in their password.'),

					symbols: z
						.boolean()
						.default(true)
						.describe('Required users to use at least one symbol in their password.'),

					temporaryPasswordValidity: DurationSchema.default('7 days').describe(
						"The duration a temporary password is valid. If the user doesn't sign in during this time, an administrator must reset their password."
					),
				})
				.default({})
				.describe('The password policy.'),

			validity: z
				.object({
					idToken: DurationSchema.default('1 hour').describe(
						"The ID token time limit. After this limit expires, your user can't use their ID token."
					),
					accessToken: DurationSchema.default('1 hour').describe(
						"The access token time limit. After this limit expires, your user can't use their access token."
					),
					refreshToken: DurationSchema.default('365 days').describe(
						"The refresh token time limit. After this limit expires, your user can't use their refresh token."
					),
				})
				.default({})
				.describe('Specifies the validity duration for every JWT token.'),

			triggers: TriggersSchema.optional(),
		})
	)
	.default({})
	.describe('Define the authenticatable users in your app.')
