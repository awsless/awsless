import { z } from 'zod'
import { LocalDirectorySchema } from '../../config/schema/local-directory.js'

export const TestsSchema = z
	.union([LocalDirectorySchema.transform(v => [v]), LocalDirectorySchema.array()])
	.describe('Define the location of your tests for your stack.')
	.optional()
