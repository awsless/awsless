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
	UnionSchema,
} from 'valibot'

const REDACTED = '[REDACTED]' as any

export const redact = (): MetadataAction<string, { redact: true }> => {
	return metadata({ redact: true })
}

const isPlainObject = (input: unknown) => input?.constructor === Object

export const applyRedaction = <T>(schema: GenericSchema, input: T): T => {
	// 1. Check if the current schema/pipe is marked for redaction
	const metadata = getMetadata(schema)

	if (metadata.redact === true) {
		return REDACTED
	}

	if (schema.type === 'union' || schema.type === 'variant') {
		const s = schema as UnionSchema<any, any>

		// 2. Handle Unions/Variants (Smart Branch Matching)
		// Try to find the first branch that actually matches the input
		const matchingBranch = s.options.find((option: any) => safeParse(option, input).success)

		if (matchingBranch) {
			// If a branch matches, recurse into ONLY that branch
			return applyRedaction(matchingBranch, input)
		}
	}

	if (schema.type === 'array' && Array.isArray(input)) {
		const s = schema as ArraySchema<any, any>
		const i = input as any
		return i.map((item: any) => applyRedaction(s.item, item))
	}

	if (schema.type === 'object' && isPlainObject(input)) {
		const s = schema as ObjectSchema<any, any>
		const i = input as Record<string, any>

		const redacted: any = {}

		for (const key in s.entries) {
			if (key in i) {
				redacted[key] = applyRedaction(s.entries[key], i[key])
			}
		}

		return redacted
	}

	if (schema.type === 'record' && isPlainObject(input)) {
		const s = schema as RecordSchema<any, any, any>
		const i = input as Record<string, any>
		const redacted: any = {}

		for (const key in i) {
			redacted[applyRedaction(s.key, key)] = applyRedaction(s.value, i[key])
		}

		return redacted
	}

	if (schema.type === 'set' && input instanceof Set) {
		const s = schema as SetSchema<any, any>
		const redacted: any = new Set()

		for (const value of input) {
			redacted.add(applyRedaction(s.value, value))
		}

		return redacted
	}

	if (schema.type === 'map' && input instanceof Map) {
		const s = schema as MapSchema<any, any, any>
		const redacted: any = new Map()

		for (const [key, value] of input.entries()) {
			redacted.set(applyRedaction(s.key, key), applyRedaction(s.value, value))
		}

		return redacted
	}

	return input
}
