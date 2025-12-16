import { z } from 'zod'
import { ResourceIdSchema } from '../../config/schema/resource-id.js'

export const SearchsSchema = z.array(ResourceIdSchema).optional()
