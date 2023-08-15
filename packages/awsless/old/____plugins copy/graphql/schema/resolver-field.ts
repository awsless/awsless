

import { z } from 'zod'

export type ResolverField = `${string} ${string}`

export const ResolverFieldSchema = z.custom<ResolverField>((value) => {
	return z.string()
		.regex(/([a-z0-9\_]+)(\s){1}([a-z0-9\_]+)/gi)
		.safeParse(value).success
}, `Invalid resolver field. Valid example: "Query list"`)
