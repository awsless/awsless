import {
	ArraySchema,
	GenericSchema,
	getMetadata,
	MapSchema,
	metadata,
	MetadataAction,
	ObjectSchema,
	RecordSchema,
	safeParse,
	SetSchema,
	TupleSchema,
	UnionSchema,
} from 'valibot'

export const REDACTED = '[REDACTED]' as any

/** Marks a value to be left out of logs: its logged input shows `[REDACTED]`. */
export const redact = <TInput>(): MetadataAction<TInput, { redact: true }> => {
	return metadata({ redact: true })
}

export type Redactor = (input: unknown) => unknown

/**
 * Redacts a value that a schema can't describe field by field, like a json
 * string or an http request's headers, with a function of its own.
 */
export const redactWith = <TInput>(redactor: Redactor): MetadataAction<TInput, { redactWith: Redactor }> => {
	return metadata({ redactWith: redactor })
}

const isPlainObject = (input: unknown) => input?.constructor === Object

// Schemas that only wrap another one: optional, nullable and the like.
const WRAPPERS = new Set([
	'optional',
	'exact_optional',
	'nullable',
	'nullish',
	'undefinedable',
	'non_optional',
	'non_nullable',
	'non_nullish',
])

const OBJECTS = new Set(['object', 'loose_object', 'strict_object', 'object_with_rest'])
const TUPLES = new Set(['tuple', 'loose_tuple', 'strict_tuple', 'tuple_with_rest'])

/** The input with every value its schema marks with `redact()` or `redactWith()` replaced. */
export const applyRedaction = <T>(schema: GenericSchema, input: T): T => {
	// 1. The schema, or one in its pipe, is marked.
	const meta = getMetadata(schema) as { redact?: boolean; redactWith?: Redactor }

	if (meta.redact === true) {
		return REDACTED
	}

	if (typeof meta.redactWith === 'function') {
		return meta.redactWith(input) as T
	}

	const s = schema as any

	// 2. A wrapper redacts like what it wraps.
	if (WRAPPERS.has(s.type)) {
		return applyRedaction(s.wrapped, input)
	}

	if (s.type === 'lazy') {
		return applyRedaction(s.getter(input), input)
	}

	// 3. Unions and variants: the branch the input matches.
	if (s.type === 'union' || s.type === 'variant') {
		const union = s as UnionSchema<any, any>
		const matchingBranch = union.options.find((option: any) => safeParse(option, input).success)

		if (matchingBranch) {
			return applyRedaction(matchingBranch, input)
		}
	}

	if (s.type === 'array' && Array.isArray(input)) {
		const array = s as ArraySchema<any, any>
		return (input as any[]).map(item => applyRedaction(array.item, item)) as T
	}

	if (TUPLES.has(s.type) && Array.isArray(input)) {
		const tuple = s as TupleSchema<any, any>
		return (input as any[]).map((item, index) => {
			const itemSchema = tuple.items[index] ?? s.rest
			return itemSchema ? applyRedaction(itemSchema, item) : item
		}) as T
	}

	// 4. Objects: their known entries, and the rest by the rest schema. A
	// plain or strict object drops what it doesn't know, a loose one keeps it.
	if (OBJECTS.has(s.type) && isPlainObject(input)) {
		const object = s as ObjectSchema<any, any>
		const i = input as Record<string, any>
		const redacted: any = {}

		for (const key in i) {
			if (key in object.entries) {
				redacted[key] = applyRedaction(object.entries[key], i[key])
			} else if (s.type === 'object_with_rest') {
				redacted[key] = applyRedaction(s.rest, i[key])
			} else if (s.type === 'loose_object') {
				redacted[key] = i[key]
			}
		}

		return redacted
	}

	if (s.type === 'record' && isPlainObject(input)) {
		const record = s as RecordSchema<any, any, any>
		const i = input as Record<string, any>
		const redacted: any = {}

		for (const key in i) {
			redacted[applyRedaction(record.key, key)] = applyRedaction(record.value, i[key])
		}

		return redacted
	}

	if (s.type === 'set' && input instanceof Set) {
		const set = s as SetSchema<any, any>
		const redacted: any = new Set()

		for (const value of input) {
			redacted.add(applyRedaction(set.value, value))
		}

		return redacted
	}

	if (s.type === 'map' && input instanceof Map) {
		const map = s as MapSchema<any, any, any>
		const redacted: any = new Map()

		for (const [key, value] of input.entries()) {
			redacted.set(applyRedaction(map.key, key), applyRedaction(map.value, value))
		}

		return redacted
	}

	return input
}
