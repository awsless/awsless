import { ExpectedError } from '../../error.js'

export type CompiledRoutePattern = {
	key: string
	match?: string
	params?: string[]
}

const PARAM_TOKEN = /\{([a-zA-Z_][a-zA-Z0-9_]*)\}|\*/g

const escapeRegex = (value: string) => {
	return value.replace(/[|\\{}()[\]^$+*?.-]/g, '\\$&')
}

// Compile a route pattern into the key used for the route store lookup,
// plus an optional regex for patterns that are more specific than the
// lookup key can express.
//
// The viewer request function looks up the exact request path, the first
// path segment wildcard (/root/*) and the catch-all (/*), plus the file
// wildcards (/root/*. and /*.) that only the static site routes register.
// So every dynamic pattern needs a static & dot-free first path segment
// to be reachable.
export const compileRoutePattern = (pattern: string): CompiledRoutePattern => {
	if (!pattern.startsWith('/')) {
		throw new ExpectedError(`Route pattern "${pattern}" must start with a slash (/)`)
	}

	// Reject unsupported brace syntax early - a {name+} style pattern would
	// otherwise silently compile into an unreachable static route key.
	for (const brace of pattern.match(/\{[^}]*\}?/g) ?? []) {
		if (!/^\{[a-zA-Z_][a-zA-Z0-9_]*\}$/.test(brace)) {
			throw new ExpectedError(
				`Route pattern "${pattern}" contains unsupported param syntax "${brace}". Use {name} for a single path segment or * for a wildcard.`
			)
		}
	}

	// Catch-all route.
	if (pattern === '/*') {
		return { key: pattern }
	}

	const params: string[] = []
	let regex = ''
	let stars = 0
	let last = 0
	let token: RegExpExecArray | null

	PARAM_TOKEN.lastIndex = 0

	while ((token = PARAM_TOKEN.exec(pattern))) {
		regex += escapeRegex(pattern.slice(last, token.index))

		const param = token[1]
		if (param) {
			if (params.includes(param)) {
				throw new ExpectedError(`Duplicate param "${param}" in route pattern "${pattern}"`)
			}

			params.push(param)
			regex += '([^/]+)'
		} else {
			stars++
			regex += '.*'
		}

		last = PARAM_TOKEN.lastIndex
	}

	// Static routes match on the exact path.
	if (params.length === 0 && stars === 0) {
		return { key: pattern }
	}

	regex += escapeRegex(pattern.slice(last))

	const root = pattern.split('/')[1] ?? ''

	if (root === '' || root.includes('*') || root.includes('{')) {
		throw new ExpectedError(
			`The first path segment of route pattern "${pattern}" must be static when the pattern contains params or wildcards.`
		)
	}

	if (root.includes('.')) {
		throw new ExpectedError(
			`The first path segment of route pattern "${pattern}" can't contain a dot when the pattern contains params or wildcards.`
		)
	}

	// A basic first path segment wildcard can match on the route key directly.
	if (params.length === 0 && pattern === `/${root}/*`) {
		return { key: pattern }
	}

	return {
		key: `/${root}/*`,
		match: `^${regex}$`,
		params: params.length > 0 ? params : undefined,
	}
}
