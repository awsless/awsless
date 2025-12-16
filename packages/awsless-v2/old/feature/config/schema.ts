import { z } from 'zod'

const ConfigNameSchema = z.string().regex(/[a-z0-9\-]/g, 'Invalid config name')

export const ConfigsSchema = z
	.array(ConfigNameSchema)
	.optional()
	.describe('Define the config values for your stack.')
