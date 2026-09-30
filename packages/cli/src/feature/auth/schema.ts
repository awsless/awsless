import { z } from 'zod'
import { ResourceIdSchema } from '../../config/schema/resource-id.js'
import { ConfigNameSchema } from '../config/schema.js'

// Slugs land verbatim in the "permissions" claim on an access token, so
// they're matched as-is by anything checking a permission.
const SlugSchema = z
	.string()
	.regex(/^[a-z0-9][a-z0-9:_-]*$/, 'Slugs may only contain lowercase letters, numbers, colons, dashes & underscores.')

const RoleSchema = z.object({
	name: z.string().describe('The display name of the role.'),

	description: z.string().optional(),

	permissions: SlugSchema.array()
		.default([])
		.describe('The complete set of permissions on the role. Anything left out is removed on deploy.'),
})

export const AuthDefaultSchema = z
	.record(
		ResourceIdSchema,
		z.object({
			issuer: z
				.url()
				.describe('Your AuthKit domain, e.g. https://auth.example.com or https://<tenant>.authkit.app'),

			clientId: z.string().describe('The WorkOS client id, starting with client_.'),

			apiKey: ConfigNameSchema.describe(
				[
					'The config value holding your WorkOS API key, starting with sk_.',
					'Only the deploy reads it - nothing running in your app ever needs it.',
				].join('\n')
			),

			permissions: z
				.record(SlugSchema, z.string())
				.default({})
				.describe('The permissions in your environment, as slug to display name.'),

			roles: z.record(SlugSchema, RoleSchema).default({}).describe('The roles a user can be assigned.'),

			redirectUris: z
				.url()
				.array()
				.default([])
				.describe('The https callbacks AuthKit is allowed to return users to after signing in.'),
		})
	)
	.default({})
	.describe('Define the WorkOS environments that authenticate your users.')
