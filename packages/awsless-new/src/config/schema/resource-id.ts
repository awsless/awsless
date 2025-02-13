import { paramCase } from 'change-case'
import { z } from 'zod'

export const ResourceIdSchema = z
	.string()
	.min(3)
	.max(24)
	.regex(/^[a-z0-9\-]+$/i, 'Invalid resource ID')
	.transform(value => paramCase(value))
