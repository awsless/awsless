import { days, hours } from '@awsless/duration'
import { z } from 'zod'
import { DurationSchema, durationMax, durationMin } from '../../config/schema/duration.js'
import { ResourceIdSchema } from '../../config/schema/resource-id.js'

// Cognito takes whole hours for the id and access tokens and whole days for
// the refresh token here, so a validity in between would be rounded down
// (15 minutes to 0 hours). Within Cognito's own limits.
const TokenValiditySchema = DurationSchema.refine(
	duration => duration.value % hours(1).value === 0n,
	'A token validity must be whole hours.'
)
	.refine(durationMin(hours(1)), 'A token validity can not be under an hour.')
	.refine(durationMax(days(1)), 'A token validity can not be over a day.')

const RefreshTokenValiditySchema = DurationSchema.refine(
	duration => duration.value % days(1).value === 0n,
	'The refresh token validity must be whole days.'
)
	.refine(durationMin(days(1)), 'The refresh token validity can not be under a day.')
	.refine(durationMax(days(3650)), 'The refresh token validity can not be over 3650 days.')

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
					idToken: TokenValiditySchema.prefault('1 hour').describe(
						"The ID token time limit, in whole hours from 1 hour to 1 day. After this limit expires, your user can't use their ID token."
					),
					accessToken: TokenValiditySchema.prefault('1 hour').describe(
						"The access token time limit, in whole hours from 1 hour to 1 day. After this limit expires, your user can't use their access token."
					),
					refreshToken: RefreshTokenValiditySchema.prefault('365 days').describe(
						"The refresh token time limit, in whole days from 1 to 3650 days. After this limit expires, your user can't use their refresh token."
					),
				})
				.prefault({})
				.describe('Specifies the validity duration for every JWT token.'),
		})
	)
	.default({})
	.describe('Define the authenticatable users in your app.')
