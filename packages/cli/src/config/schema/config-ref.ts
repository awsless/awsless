import { z } from 'zod'

// References a remote config value, like "config:private-phone".
export const ConfigRefSchema = z.string().regex(/^config:[a-z0-9-]+$/, 'Invalid config reference')

export const isConfigRef = (value: unknown): value is string => {
	return ConfigRefSchema.safeParse(value).success
}

export const configRefName = (value: string) => {
	return value.slice('config:'.length)
}
