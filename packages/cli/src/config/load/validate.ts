import { ZodSchema, z } from 'zod'
import { ConfigError } from '../../error.js'

const isPlainObject = (value: unknown): value is Record<string, unknown> => {
	if (value === null || typeof value !== 'object') {
		return false
	}

	const proto = Object.getPrototypeOf(value)

	return proto === Object.prototype || proto === null
}

// zod 4 parses async records in random key order, so we sort the
// keys to keep the parsed config deterministic.
export const sortKeysDeep = <T>(value: T): T => {
	if (Array.isArray(value)) {
		return value.map(entry => sortKeysDeep(entry)) as T
	}

	if (isPlainObject(value)) {
		const sorted: Record<string, unknown> = {}

		for (const key of Object.keys(value).toSorted()) {
			sorted[key] = sortKeysDeep(value[key])
		}

		return sorted as T
	}

	return value
}

export const validateConfig = async <S extends ZodSchema>(
	schema: S,
	file: string,
	data: unknown
): Promise<z.output<S>> => {
	try {
		const result = await schema.parseAsync(data)

		return sortKeysDeep(result)
	} catch (error) {
		if (error instanceof z.ZodError) {
			throw new ConfigError(file, error, data)
		}

		throw error
	}
}
