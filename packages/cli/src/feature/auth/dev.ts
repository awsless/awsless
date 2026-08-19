import {
	AdminAddUserToGroupCommand,
	AdminCreateUserCommand,
	AdminGetUserCommand,
	AdminListGroupsForUserCommand,
	AdminRemoveUserFromGroupCommand,
	AdminSetUserPasswordCommand,
	CognitoIdentityProviderClient,
	ListUserPoolClientsCommand,
	ListUserPoolsCommand,
	ListUsersCommand,
	UserNotFoundException,
	UsernameExistsException,
} from '@aws-sdk/client-cognito-identity-provider'
import { constantCase } from 'change-case'
import { debug } from '../../cli/debug.js'
import { AppConfig } from '../../config/app.js'
import { DevContext } from '../../feature.js'
import { getCredentials } from '../../util/aws.js'
import { formatGlobalResourceName } from '../../util/name.js'

type ResolvedPool = {
	userPoolId: string
	clientId: string
}

// Local dev never emulates Cognito - the local environment binds
// against the REAL deployed user pools instead, so logins & token
// verification behave exactly like production. The pools resolve from
// their deterministic resource names, once per dev session.
export const authOnDev = async (ctx: DevContext) => {
	const ids = Object.keys(ctx.appConfig.auth ?? {})

	if (ids.length === 0) {
		return
	}

	const pools = await ctx.keep('auth:pull', [...ids].toSorted().join(','), async () => {
		const values: Record<string, ResolvedPool> = {}

		try {
			ctx.log(`Resolving ${ids.length} auth userpool${ids.length === 1 ? '' : 's'} from Cognito...`)

			const credentials = await getCredentials(ctx.appConfig.profile)
			const client = new CognitoIdentityProviderClient({
				region: ctx.appConfig.region,
				credentials,
			})

			let timer: ReturnType<typeof setTimeout> | undefined
			const timeout = new Promise<never>((_, reject) => {
				timer = setTimeout(() => reject(new Error('the lookup timed out after 15s')), 15_000)
			})

			const resolve = async () => {
				// One pool listing serves every auth resource.
				const poolIdsByName: Record<string, string> = {}
				let token: string | undefined

				do {
					const result = await client.send(
						new ListUserPoolsCommand({
							MaxResults: 60,
							NextToken: token,
						})
					)

					for (const pool of result.UserPools ?? []) {
						if (pool.Name && pool.Id) {
							poolIdsByName[pool.Name] = pool.Id
						}
					}

					token = result.NextToken
				} while (token)

				for (const id of ids) {
					const name = formatGlobalResourceName({
						appName: ctx.appConfig.name,
						resourceType: 'auth',
						resourceName: id,
					})

					const userPoolId = poolIdsByName[name]

					if (!userPoolId) {
						ctx.log(`The auth userpool "${id}" isn't deployed yet - its login won't work locally.`)
						continue
					}

					const clients = await client.send(
						new ListUserPoolClientsCommand({
							UserPoolId: userPoolId,
							MaxResults: 60,
						})
					)

					const appClient =
						clients.UserPoolClients?.find(client => client.ClientName === name) ??
						clients.UserPoolClients?.[0]

					if (!appClient?.ClientId) {
						ctx.log(`The auth userpool "${id}" has no client - its login won't work locally.`)
						continue
					}

					values[id] = {
						userPoolId,
						clientId: appClient.ClientId,
					}
				}
			}

			await Promise.race([resolve(), timeout]).finally(() => clearTimeout(timer))
		} catch (error) {
			debug('Auth userpool lookup failed', error)
			ctx.log(
				`Couldn't resolve the auth userpools from Cognito (${
					error instanceof Error ? error.message : String(error)
				}) - logins won't work locally.`
			)
		}

		return { value: values, stop: () => {} }
	})

	for (const [id, pool] of Object.entries(pools)) {
		ctx.addEnv(`AUTH_${constantCase(id)}_USER_POOL_ID`, pool.userPoolId)
		ctx.addEnv(`AUTH_${constantCase(id)}_CLIENT_ID`, pool.clientId)
	}

	// Every configured pool lists on the dashboard - an unresolved one
	// shows its not-deployed state on the panel instead of hiding.
	for (const id of ids) {
		ctx.registerResource({
			kind: 'auth',
			id,
			detail: pools[id]?.userPoolId ?? 'not deployed',
		})
	}
}

// ------------------------------------------------------------------
// The dashboard's auth panel: list the users of a pool, create users
// & update their groups - the same operations as the auth user cli
// commands, against the same real deployed pool.

export type AuthUser = {
	username: string
	email?: string
	status?: string
	enabled: boolean
	createdAt?: string
	groups: string[]
}

export type AuthAdmin = ReturnType<typeof createAuthAdmin>

export const createAuthAdmin = (props: {
	appConfig: AppConfig
	resolvedPools: () => Record<string, ResolvedPool> | undefined
}) => {
	let client: CognitoIdentityProviderClient | undefined

	const getClient = async () => {
		client ??= new CognitoIdentityProviderClient({
			region: props.appConfig.region,
			credentials: await getCredentials(props.appConfig.profile),
		})

		return client
	}

	const getPool = (id: string) => {
		const authProps = props.appConfig.auth?.[id]
		const resolved = props.resolvedPools()?.[id]

		if (!authProps) {
			throw new Error(`The auth userpool "${id}" doesn't exist.`)
		}

		if (!resolved) {
			throw new Error(`The auth userpool "${id}" isn't deployed yet.`)
		}

		return { ...authProps, userPoolId: resolved.userPoolId }
	}

	// The same password policy check as the auth user cli commands.
	const validatePassword = (pool: ReturnType<typeof getPool>, value: string) => {
		if (!value) {
			return 'A password is required'
		}

		if (value.length < pool.password.minLength) {
			return `The password min length is ${pool.password.minLength}`
		}

		if (pool.password.lowercase && value.toUpperCase() === value) {
			return `The password should include lowercase characters`
		}

		if (pool.password.uppercase && value.toLowerCase() === value) {
			return `The password should include uppercase characters`
		}

		if (pool.password.numbers && !/\d/.test(value)) {
			return `The password should include numbers`
		}

		if (pool.password.symbols && !/[ `!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?~]/.test(value)) {
			return `The password should include symbols`
		}

		return
	}

	const validateGroups = (pool: ReturnType<typeof getPool>, groups: string[]) => {
		for (const group of groups) {
			if (!pool.groups.includes(group)) {
				throw new Error(`The group "${group}" doesn't exist.`)
			}
		}
	}

	const listUserGroups = async (userPoolId: string, username: string) => {
		const client = await getClient()
		const groups: string[] = []
		let token: string | undefined

		do {
			const result = await client.send(
				new AdminListGroupsForUserCommand({
					UserPoolId: userPoolId,
					Username: username,
					NextToken: token,
				})
			)

			groups.push(...(result.Groups?.map(group => group.GroupName!) ?? []))
			token = result.NextToken
		} while (token)

		return groups
	}

	return {
		describePool(id: string) {
			const pool = getPool(id)

			// Only json-safe fields - the password policy holds Duration
			// bigints & the panel never needs it, validation runs here.
			return {
				groups: pool.groups,
			}
		},

		async listUsers(id: string): Promise<AuthUser[]> {
			const pool = getPool(id)
			const client = await getClient()

			const users: AuthUser[] = []
			let token: string | undefined

			do {
				const result = await client.send(
					new ListUsersCommand({
						UserPoolId: pool.userPoolId,
						PaginationToken: token,
					})
				)

				for (const user of result.Users ?? []) {
					users.push({
						username: user.Username!,
						email: user.Attributes?.find(a => a.Name === 'email')?.Value,
						status: user.UserStatus,
						enabled: user.Enabled ?? true,
						createdAt: user.UserCreateDate?.toISOString(),
						groups: [],
					})
				}

				token = result.PaginationToken

				// An admin pool stays small - a runaway listing is capped
				// instead of hammering cognito.
			} while (token && users.length < 500)

			await Promise.all(
				users.map(async user => {
					user.groups = await listUserGroups(pool.userPoolId, user.username)
				})
			)

			return users.toSorted((a, b) => a.username.localeCompare(b.username))
		},

		async createUser(id: string, input: { username: string; password: string; groups: string[] }) {
			const pool = getPool(id)

			if (!input.username) {
				throw new Error('A username is required')
			}

			const issue = validatePassword(pool, input.password)

			if (issue) {
				throw new Error(issue)
			}

			validateGroups(pool, input.groups)

			const client = await getClient()

			try {
				await client.send(
					new AdminCreateUserCommand({
						UserPoolId: pool.userPoolId,
						Username: input.username,
						TemporaryPassword: input.password,
					})
				)
			} catch (error) {
				if (error instanceof UsernameExistsException) {
					throw new Error('The user already exists', { cause: error })
				}

				throw error
			}

			await client.send(
				new AdminSetUserPasswordCommand({
					UserPoolId: pool.userPoolId,
					Username: input.username,
					Password: input.password,
					Permanent: true,
				})
			)

			for (const group of input.groups) {
				await client.send(
					new AdminAddUserToGroupCommand({
						UserPoolId: pool.userPoolId,
						Username: input.username,
						GroupName: group,
					})
				)
			}
		},

		async updateUser(id: string, input: { username: string; groups: string[]; password?: string }) {
			const pool = getPool(id)

			validateGroups(pool, input.groups)

			if (input.password) {
				const issue = validatePassword(pool, input.password)

				if (issue) {
					throw new Error(issue)
				}
			}

			const client = await getClient()

			let oldGroups: string[]

			try {
				await client.send(
					new AdminGetUserCommand({
						UserPoolId: pool.userPoolId,
						Username: input.username,
					})
				)

				oldGroups = await listUserGroups(pool.userPoolId, input.username)
			} catch (error) {
				if (error instanceof UserNotFoundException) {
					throw new Error('The user does not exist', { cause: error })
				}

				throw error
			}

			if (input.password) {
				await client.send(
					new AdminSetUserPasswordCommand({
						UserPoolId: pool.userPoolId,
						Username: input.username,
						Password: input.password,
						Permanent: true,
					})
				)
			}

			const removed = oldGroups.filter(group => !input.groups.includes(group))
			const added = input.groups.filter(group => !oldGroups.includes(group))

			for (const group of removed) {
				await client.send(
					new AdminRemoveUserFromGroupCommand({
						UserPoolId: pool.userPoolId,
						Username: input.username,
						GroupName: group,
					})
				)
			}

			for (const group of added) {
				await client.send(
					new AdminAddUserToGroupCommand({
						UserPoolId: pool.userPoolId,
						Username: input.username,
						GroupName: group,
					})
				)
			}
		},
	}
}
