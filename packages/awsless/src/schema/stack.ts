import { z } from "zod";
import { ResourceIdSchema } from "./resource-id";

export type StackConfig = {
	name: string
	depends?: Array<StackConfig>
}

export const StackSchema: z.ZodType<StackConfig, z.ZodTypeDef, StackConfig> = z.object({
	name: ResourceIdSchema,
	depends: z.array(z.lazy(() => StackSchema)).optional()
})
