import { kebabCase } from 'change-case'
import { z } from 'zod'

export const ResourceIdSchema = z
	.string()
	.min(2)
	.max(24)
	.regex(/^[a-z0-9-]+$/i, 'Invalid resource ID')
	.transform(value => kebabCase(value))
	// The runtime resource proxies never answer promise probes.
	.refine(value => value !== 'then', `The resource ID "then" is reserved.`)
