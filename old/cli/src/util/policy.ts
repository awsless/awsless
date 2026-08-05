import { pascalCase } from 'change-case'

export type ResolvedPolicyStatement = {
	effect?: 'allow' | 'deny'
	actions: string[]
	resources: string[]
	conditions?: unknown
}

const sortKeysDeep = (value: unknown): unknown => {
	if (Array.isArray(value)) {
		return value.map(sortKeysDeep)
	}

	if (value && typeof value === 'object') {
		const entries = Object.entries(value as Record<string, unknown>)

		return Object.fromEntries(
			entries
				.sort(([a], [b]) => a.localeCompare(b))
				.map(([key, entry]) => {
					return [key, sortKeysDeep(entry)]
				})
		)
	}

	return value
}

const unique = (list: string[]) => {
	return [...new Set(list)]
}

// Merge policy statements with an identical effect, action list & conditions
// into a single statement with all their resources combined.
// This significantly reduces the policy document size, which is
// limited to 10240 characters for all inline role policies.

export const mergePolicyStatements = <T extends ResolvedPolicyStatement>(statements: T[]): ResolvedPolicyStatement[] => {
	const merged = new Map<string, ResolvedPolicyStatement>()

	for (const statement of statements) {
		const effect = statement.effect ?? 'allow'
		const actions = unique(statement.actions).sort()
		const key = JSON.stringify([effect, actions, sortKeysDeep(statement.conditions) ?? null])

		const entry = merged.get(key)

		if (entry) {
			entry.resources = unique([...entry.resources, ...statement.resources])
		} else {
			merged.set(key, {
				effect,
				actions,
				resources: unique(statement.resources),
				conditions: statement.conditions,
			})
		}
	}

	return [...merged.values()]
}

export const formatPolicyDocument = (statements: ResolvedPolicyStatement[]) => {
	return {
		Version: '2012-10-17',
		Statement: mergePolicyStatements(statements).map(statement => ({
			Effect: pascalCase(statement.effect ?? 'allow'),
			Action: statement.actions,
			Resource: statement.resources,
			Condition: statement.conditions,
		})),
	}
}
