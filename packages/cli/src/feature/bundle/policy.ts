// Every handler shares one lambda role, so the grants of all stacks
// land in a single policy that grows past the 10240 byte AWS quota
// for larger apps. Merging equivalent statements keeps the policy
// small without changing the effective permissions.

export type PolicyStatement = {
	effect?: 'allow' | 'deny'
	actions: string[]
	resources: string[]
	conditions?: unknown
}

export const compactPolicyStatements = (statements: PolicyStatement[]) => {
	const merged = mergeEqualStatements(statements)
	const absorbed = merged.map(absorbWildcardResources)

	return mergeConditionValues(absorbed)
}

// Statements with the same effect, actions & conditions can union their
// resource lists into a single statement.
const mergeEqualStatements = (statements: PolicyStatement[]) => {
	const groups = new Map<string, PolicyStatement>()

	for (const statement of statements) {
		const key = JSON.stringify([
			statement.effect ?? 'allow',
			[...statement.actions].toSorted(),
			statement.conditions ?? null,
		])

		const group = groups.get(key)

		if (!group) {
			groups.set(key, { ...statement, resources: [...statement.resources] })
			continue
		}

		for (const resource of statement.resources) {
			if (!group.resources.includes(resource)) {
				group.resources.push(resource)
			}
		}
	}

	return Array.from(groups.values())
}

// Resources that are already matched by a "prefix*" wildcard sibling in
// the same statement are redundant.
const absorbWildcardResources = (statement: PolicyStatement): PolicyStatement => {
	const prefixes = statement.resources
		.filter(resource => {
			return resource.endsWith('*') && !resource.slice(0, -1).includes('*') && !resource.includes('?')
		})
		.map(resource => resource.slice(0, -1))

	const resources = statement.resources.filter(resource => {
		return !prefixes.some(prefix => {
			return resource !== `${prefix}*` && resource.startsWith(prefix)
		})
	})

	return { ...statement, resources }
}

// Statements that are identical except for the value of a single
// StringEquals condition can union their values into one array. This is
// only safe for StringEquals, where a value array means "any of".
const mergeConditionValues = (statements: PolicyStatement[]) => {
	type Group = {
		statement: PolicyStatement
		conditionKey: string
		values: string[]
	}

	const output: Array<PolicyStatement | Group> = []
	const groups = new Map<string, Group>()

	for (const statement of statements) {
		const condition = singleStringEqualsCondition(statement)

		if (!condition) {
			output.push(statement)
			continue
		}

		const key = JSON.stringify([
			statement.effect ?? 'allow',
			[...statement.actions].toSorted(),
			[...statement.resources].toSorted(),
			condition.key,
		])

		const group = groups.get(key)

		if (!group) {
			const entry = { statement, conditionKey: condition.key, values: [...condition.values] }
			groups.set(key, entry)
			output.push(entry)
			continue
		}

		for (const value of condition.values) {
			if (!group.values.includes(value)) {
				group.values.push(value)
			}
		}
	}

	return output.map(entry => {
		if (!('conditionKey' in entry)) {
			return entry
		}

		if (entry.values.length === 1) {
			return entry.statement
		}

		return {
			...entry.statement,
			conditions: {
				StringEquals: {
					[entry.conditionKey]: entry.values,
				},
			},
		}
	})
}

const singleStringEqualsCondition = (statement: PolicyStatement) => {
	const conditions = statement.conditions

	if (typeof conditions !== 'object' || conditions === null) {
		return
	}

	const operators = Object.keys(conditions)

	if (operators.length !== 1 || operators[0] !== 'StringEquals') {
		return
	}

	const values = (conditions as Record<string, unknown>).StringEquals

	if (typeof values !== 'object' || values === null) {
		return
	}

	const keys = Object.keys(values)
	const key = keys[0]

	if (keys.length !== 1 || !key) {
		return
	}

	const value = (values as Record<string, unknown>)[key]

	if (typeof value === 'string') {
		return { key, values: [value] }
	}

	if (Array.isArray(value) && value.every(entry => typeof entry === 'string')) {
		return { key, values: value }
	}

	return
}
