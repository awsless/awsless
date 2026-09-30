import { describe, expect, it } from 'vitest'
import { AppSchema } from '../src/config/app'
import { validateFeatures } from '../src/feature/validate'
import { createTestApp, listResources } from './_kit'

// onValidate runs from the cli layout, not from the synth, so the
// config checks are driven straight through it.
const validate = (app: Record<string, unknown>) => {
	return validateFeatures({
		appConfig: AppSchema.parse({ name: 'test-app', region: 'us-east-1', profile: 'test', ...app }),
		stackConfigs: [],
	})
}

const auth = {
	users: {
		issuer: 'https://auth.example.com',
		clientId: 'client_test',
		apiKey: 'workos-api-key',
		permissions: {
			'orders:read': 'Read orders',
			'orders:write': 'Write orders',
		},
		roles: {
			admin: { name: 'Administrator', permissions: ['orders:read', 'orders:write'] },
			support: { name: 'Support', permissions: ['orders:read'] },
		},
		redirectUris: ['https://app.example.com/callback'],
	},
}

describe('auth', () => {
	it('declares the permissions, roles & redirect uris per environment', () => {
		const { app, binds, shared } = createTestApp({
			app: { configs: ['workos-api-key'], auth },
		})

		const permissions = listResources(app, 'workos_permission')
		const roles = listResources(app, 'workos_environment_role')
		const uris = listResources(app, 'workos_redirect_uri')

		expect(permissions.map(meta => meta.input.slug)).toEqual(['orders:read', 'orders:write'])
		expect(roles.map(meta => meta.input.slug)).toEqual(['admin', 'support'])
		expect(roles[1]!.input.permissions).toEqual(['orders:read'])
		expect(uris.map(meta => meta.input.uri)).toEqual(['https://app.example.com/callback'])

		expect(binds.map(bind => bind.name)).toEqual(
			expect.arrayContaining(['AUTH_USERS_ISSUER', 'AUTH_USERS_CLIENT_ID'])
		)
		expect(shared.entry('auth', 'issuer', 'users')).toBe('https://auth.example.com')
	})

	it('rejects a role that needs an undeclared permission', () => {
		expect(() =>
			validate({
				configs: ['workos-api-key'],
				auth: {
					users: {
						...auth.users,
						permissions: {},
						roles: { admin: { name: 'Administrator', permissions: ['orders:read'] } },
					},
				},
			})
		).toThrow('"orders:read"')
	})

	it('rejects an api key that has no config', () => {
		expect(() => validate({ auth })).toThrow('"workos-api-key"')
	})
})
