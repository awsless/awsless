import { constantCase } from 'change-case'
import { AppConfig } from '../../config/app.js'
import { DevContext } from '../../feature.js'
import { createWorkOsClient, WorkOsClient } from '../../util/workos.js'

// Local dev never emulates WorkOS - it binds against the REAL
// environment, so logins & token verification behave exactly like
// production. Point a dev app at your WorkOS staging environment.
export const authOnDev = async (ctx: DevContext) => {
	for (const [id, props] of Object.entries(ctx.appConfig.auth ?? {})) {
		ctx.addEnv(`AUTH_${constantCase(id)}_ISSUER`, props.issuer)
		ctx.addEnv(`AUTH_${constantCase(id)}_CLIENT_ID`, props.clientId)

		ctx.registerResource({
			kind: 'auth',
			id,
			detail: props.issuer,
		})
	}
}

// ------------------------------------------------------------------
// The dashboard's auth panel: list the users of an environment, create
// users & change their role - the same operations as the auth user cli
// commands, against the same real WorkOS environment.

export type AuthUser = {
	username: string
	email?: string
	status?: string
	enabled: boolean
	createdAt?: string
	groups: string[]
}

export type AuthAdmin = ReturnType<typeof createAuthAdmin>

export const createAuthAdmin = (props: { appConfig: AppConfig; apiKeys: () => Record<string, string> | undefined }) => {
	const clients = new Map<string, WorkOsClient>()

	const getEnvironment = (id: string) => {
		const auth = props.appConfig.auth?.[id]

		if (!auth) {
			throw new Error(`The auth environment "${id}" doesn't exist.`)
		}

		return auth
	}

	const getClient = (id: string) => {
		let client = clients.get(id)

		if (!client) {
			const apiKey = props.apiKeys()?.[getEnvironment(id).apiKey]

			if (!apiKey) {
				throw new Error(`The auth environment "${id}" has no WorkOS api key configured.`)
			}

			client = createWorkOsClient({ apiKey })

			clients.set(id, client)
		}

		return client
	}

	// Roles hang off an organization membership. The panel has no place
	// to pick one, so it manages the single organization case & sends
	// everyone else to the cli, which takes --organization.
	const getOrganization = async (id: string) => {
		const organizations = await getClient(id).listOrganizations()

		if (organizations.length > 1) {
			throw new Error(
				`The "${id}" environment has more than one organization - use "awsless auth user" with --organization.`
			)
		}

		return organizations.at(0)
	}

	const validateRole = (id: string, role: string) => {
		if (!(role in getEnvironment(id).roles)) {
			throw new Error(`The role "${role}" doesn't exist.`)
		}
	}

	return {
		describePool(id: string) {
			return {
				groups: Object.keys(getEnvironment(id).roles),
			}
		},

		async listUsers(id: string): Promise<AuthUser[]> {
			const client = getClient(id)
			const [users, memberships] = await Promise.all([client.listUsers(), client.listMemberships()])

			return users.map(user => ({
				username: user.email,
				email: user.email,
				status: user.emailVerified ? 'VERIFIED' : 'UNVERIFIED',
				enabled: true,
				createdAt: user.createdAt,
				groups: memberships
					.filter(membership => membership.userId === user.id && membership.role)
					.map(membership => membership.role!),
			}))
		},

		async createUser(id: string, input: { username: string; password: string; groups: string[] }) {
			const client = getClient(id)

			input.groups.forEach(role => validateRole(id, role))

			if (await client.findUser(input.username)) {
				throw new Error('User already exists')
			}

			const organization = await getOrganization(id)
			const user = await client.createUser({ email: input.username, password: input.password })

			if (organization) {
				await client.createMembership({
					userId: user.id,
					organizationId: organization.id,
					role: input.groups.at(0),
				})
			}
		},

		async updateUser(id: string, input: { username: string; password?: string; groups: string[] }) {
			const client = getClient(id)

			input.groups.forEach(role => validateRole(id, role))

			const user = await client.findUser(input.username)

			if (!user) {
				throw new Error('User does not exist')
			}

			if (input.password) {
				await client.updateUser(user.id, { password: input.password })
			}

			const organization = await getOrganization(id)

			if (!organization) {
				return
			}

			const role = input.groups.at(0)
			const memberships = await client.listMemberships({ userId: user.id })
			const membership = memberships.find(entry => entry.organizationId === organization.id)

			if (role === membership?.role) {
				return
			}

			if (membership) {
				await client.updateMembership(membership.id, { role })
			} else {
				await client.createMembership({ userId: user.id, organizationId: organization.id, role })
			}
		},
	}
}
