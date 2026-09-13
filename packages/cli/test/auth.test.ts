import { describe, expect, it } from 'vitest'
import { createTestApp, listResources } from './_kit'

describe('auth', () => {
	it('creates a user pool, client & groups per auth', () => {
		const { app, binds, shared } = createTestApp({
			app: { auth: { users: { groups: ['admin', 'support'] } } },
		})

		const pool = listResources(app, 'aws_cognito_user_pool')[0]!
		const client = listResources(app, 'aws_cognito_user_pool_client')[0]!
		const groups = listResources(app, 'aws_cognito_user_group')

		expect(pool.input.name).toBe('test-app--auth--users')
		expect(pool.input.adminCreateUserConfig).toEqual({ allowAdminCreateUserOnly: false })
		expect(client.input.name).toBe('test-app--auth--users')
		expect(groups.map(meta => meta.input.name)).toEqual(['admin', 'support'])

		expect(binds.map(bind => bind.name)).toEqual(
			expect.arrayContaining(['AUTH_USERS_USER_POOL_ID', 'AUTH_USERS_CLIENT_ID'])
		)
		expect(shared.entry('auth', 'user-pool-id', 'users')).toBeDefined()
	})

	it('locks registration down to admins when asked', () => {
		const { app } = createTestApp({
			app: { auth: { users: { allowUserRegistration: false } } },
		})

		const pool = listResources(app, 'aws_cognito_user_pool')[0]!

		expect(pool.input.adminCreateUserConfig).toEqual({ allowAdminCreateUserOnly: true })
	})
})
