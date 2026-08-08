import { z } from 'zod'

export const ConfigNameSchema = z.string().regex(/^[a-z0-9-]+$/, 'Invalid config name')

export const ConfigsSchema = z.array(ConfigNameSchema).optional().describe('Define the config values for your app.')
