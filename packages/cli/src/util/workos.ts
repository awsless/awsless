import { debug } from '../cli/debug.js'
import { ExpectedError } from '../error.js'

export type WorkOsUser = {
	id: string
	email: string
	firstName?: string
	lastName?: string
	emailVerified: boolean
	createdAt: string
}

export type WorkOsOrganization = {
	id: string
	name: string
}

export type WorkOsMembership = {
	id: string
	userId: string
	organizationId: string
	role?: string
	status: string
}

export type WorkOsClient = ReturnType<typeof createWorkOsClient>

const DEFAULT_BASE_URL = 'https://api.workos.com'

export const createWorkOsClient = (props: { apiKey: string; baseUrl?: string }) => {
	const request = async <T>(
		method: string,
		path: string,
		options: { body?: Record<string, unknown>; query?: Record<string, string | undefined> } = {}
	): Promise<T> => {
		const url = new URL(path, props.baseUrl ?? DEFAULT_BASE_URL)

		for (const [name, value] of Object.entries(options.query ?? {})) {
			if (value !== undefined) {
				url.searchParams.set(name, value)
			}
		}

		debug('WorkOS request', method, url.pathname)

		const response = await fetch(url, {
			method,
			headers: {
				authorization: `Bearer ${props.apiKey}`,
				...(options.body ? { 'content-type': 'application/json' } : {}),
			},
			body: options.body ? JSON.stringify(options.body) : undefined,
		})

		if (response.status === 204) {
			return undefined as T
		}

		const data = await response.json().catch(() => undefined)

		if (!response.ok) {
			// WorkOS enforces its own password & email rules, so its message
			// is the one worth showing instead of a local approximation.
			const error = data as { message?: string; errors?: { message?: string }[] } | undefined
			const message = error?.errors?.[0]?.message ?? error?.message

			throw new ExpectedError(message ?? `WorkOS request failed with status ${response.status}`)
		}

		return data as T
	}

	const toUser = (data: any): WorkOsUser => ({
		id: data.id,
		email: data.email,
		firstName: data.first_name ?? undefined,
		lastName: data.last_name ?? undefined,
		emailVerified: Boolean(data.email_verified),
		createdAt: data.created_at,
	})

	const toMembership = (data: any): WorkOsMembership => ({
		id: data.id,
		userId: data.user_id,
		organizationId: data.organization_id,
		role: data.role?.slug ?? undefined,
		status: data.status,
	})

	// Every list endpoint pages the same way, and a dev environment is
	// small enough to walk in full.
	const listAll = async <T>(path: string, query: Record<string, string | undefined>, map: (data: any) => T) => {
		const items: T[] = []
		let after: string | undefined

		do {
			const page = await request<{ data: any[]; list_metadata?: { after?: string | null } }>('GET', path, {
				query: { ...query, limit: '100', after },
			})

			items.push(...page.data.map(map))

			after = page.list_metadata?.after ?? undefined
		} while (after)

		return items
	}

	return {
		listOrganizations() {
			return listAll<WorkOsOrganization>('/organizations', {}, data => ({
				id: data.id,
				name: data.name,
			}))
		},

		listUsers() {
			return listAll('/user_management/users', {}, toUser)
		},

		async findUser(email: string) {
			const result = await request<{ data: any[] }>('GET', '/user_management/users', {
				query: { email, limit: '1' },
			})

			const user = result.data.at(0)

			return user ? toUser(user) : undefined
		},

		async createUser(input: { email: string; password: string; firstName?: string; lastName?: string }) {
			const user = await request<any>('POST', '/user_management/users', {
				body: {
					email: input.email,
					password: input.password,
					first_name: input.firstName,
					last_name: input.lastName,

					// An operator created the account, so there's nobody to
					// confirm the address.
					email_verified: true,
				},
			})

			return toUser(user)
		},

		async updateUser(id: string, input: { password?: string }) {
			const user = await request<any>('PUT', `/user_management/users/${id}`, {
				body: { password: input.password },
			})

			return toUser(user)
		},

		deleteUser(id: string) {
			return request<void>('DELETE', `/user_management/users/${id}`)
		},

		listMemberships(query: { userId?: string; organizationId?: string } = {}) {
			return listAll<WorkOsMembership>(
				'/user_management/organization_memberships',
				{ user_id: query.userId, organization_id: query.organizationId },
				toMembership
			)
		},

		async createMembership(input: { userId: string; organizationId: string; role?: string }) {
			const membership = await request<any>('POST', '/user_management/organization_memberships', {
				body: {
					user_id: input.userId,
					organization_id: input.organizationId,
					role_slug: input.role,
				},
			})

			return toMembership(membership)
		},

		async updateMembership(id: string, input: { role?: string }) {
			const membership = await request<any>('PUT', `/user_management/organization_memberships/${id}`, {
				body: { role_slug: input.role },
			})

			return toMembership(membership)
		},

		deleteMembership(id: string) {
			return request<void>(`DELETE`, `/user_management/organization_memberships/${id}`)
		},
	}
}
