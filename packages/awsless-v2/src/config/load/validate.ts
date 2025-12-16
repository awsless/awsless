import { ZodSchema, z } from 'zod'
import { ConfigError } from '../../error.js'

export const validateConfig = async <S extends ZodSchema>(
	schema: S,
	file: string,
	data: unknown
): Promise<z.output<S>> => {
	try {
		const result = await schema.parseAsync(data)

		return result
	} catch (error) {
		if (error instanceof z.ZodError) {
			throw new ConfigError(file, error, data)
		}

		throw error
	}
}
