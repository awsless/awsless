import { z } from 'zod'
import { ResourceIdSchema } from '../../config/schema/resource-id.js'

export const StoresSchema = z.array(ResourceIdSchema).optional().describe('Define the stores in your stack.')
