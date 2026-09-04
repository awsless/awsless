import { z } from 'zod'
import { DurationSchema } from '../../config/schema/duration.js'
import { ResourceIdSchema } from '../../config/schema/resource-id.js'

export const AuthDefaultSchema = z
	.record(
		ResourceIdSchema,
		z.object({
			allowUserRegistration: z
				.boolean()
				.default(true)
				.describe('Specifies whether users can create an user account or if only the administrator can.'),

			groups: z
				//
				.string()
				.array()
				.default([])
				.describe('Specifies a list of groups that a user can belong to.'),

			username: z
				.object({
					caseSensitive: z
						.boolean()
						.default(false)
						.describe(
							'Specifies whether username case sensitivity will be enabled. When usernames and email addresses are case insensitive, users can sign in as the same user when they enter a different capitalization of their user name.'
						),
				})
				.prefault({})
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

					temporaryPasswordValidity: DurationSchema.prefault('7 days').describe(
						"The duration a temporary password is valid. If the user doesn't sign in during this time, an administrator must reset their password."
					),
				})
				.prefault({})
				.describe('The password policy.'),

			validity: z
				.object({
					idToken: DurationSchema.prefault('1 hour').describe(
						"The ID token time limit. After this limit expires, your user can't use their ID token."
					),
					accessToken: DurationSchema.prefault('1 hour').describe(
						"The access token time limit. After this limit expires, your user can't use their access token."
					),
					refreshToken: DurationSchema.prefault('365 days').describe(
						"The refresh token time limit. After this limit expires, your user can't use their refresh token."
					),
				})
				.prefault({})
				.describe('Specifies the validity duration for every JWT token.'),
		})
	)
	.default({})
	.describe('Define the authenticatable users in your app.')
