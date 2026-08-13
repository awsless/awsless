import { kebabCase } from 'change-case'

// The physical name of a search index inside the shared domain: the
// index name prefixed with its stack. Must stay in sync with the
// runtime derivation in awsless-next lib/server/search.ts.
export const formatSearchIndexName = (stackName: string, indexName: string) => {
	return `${kebabCase(stackName)}--${indexName}`
}

type ShorthandField = string | Record<string, unknown> | [Record<string, unknown>] | unknown

const compileField = (field: ShorthandField): Record<string, unknown> => {
	// "keyword" - a plain type, where text gets the ".keyword" sub
	// field for sorting & filtering, like the dynamic mapping default.
	if (typeof field === 'string') {
		if (field === 'text') {
			return { type: 'text', fields: { keyword: { type: 'keyword' } } }
		}

		return { type: field }
	}

	// [{ ... }] - an array of objects, indexed as a nested field so
	// queries match within one element.
	if (Array.isArray(field)) {
		return { type: 'nested', properties: compileFields(field[0] as Record<string, unknown>) }
	}

	if (typeof field === 'object' && field !== null) {
		// { $type: ... } - a raw field definition passed through as-is.
		if ('$type' in field) {
			const { $type, ...rest } = field as Record<string, unknown>

			return { type: $type, ...rest }
		}

		// { ... } - an object field with sub fields.
		return { properties: compileFields(field as Record<string, unknown>) }
	}

	throw new Error(`Invalid search schema field: ${JSON.stringify(field)}`)
}

const compileFields = (fields: Record<string, unknown>) => {
	return Object.fromEntries(Object.entries(fields).map(([name, field]) => [name, compileField(field)]))
}

// Resolve the mappings of an index declaration: the shorthand schema
// compiles down to the raw OpenSearch mappings, which stay available
// as the escape hatch for anything exotic.
export const resolveSearchMappings = (props: {
	schema?: Record<string, unknown>
	strict?: boolean
	mappings?: Record<string, unknown>
}): Record<string, unknown> | undefined => {
	if (props.schema) {
		return {
			...(props.strict ? { dynamic: 'strict' } : {}),
			properties: compileFields(props.schema),
		}
	}

	return props.mappings
}
