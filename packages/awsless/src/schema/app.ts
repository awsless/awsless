import { z } from "zod";
import { ResourceIdSchema } from './resource-id.js';
import { StackSchema } from './stack.js';
import { RegionSchema } from './region.js';
import { PluginSchema } from './plugin.js';

export const AppSchema = z.object({
	name: ResourceIdSchema,
	region: RegionSchema,
	profile: z.string(),
	stage: z.string().regex(/[a-z]+/).default('prod'),
	defaults: z.object({}).default({}),
	stacks: z.array(StackSchema).min(1),
	plugins: z.array(PluginSchema).optional(),
})

export type AppConfigInput = z.input<typeof AppSchema>
export type AppConfigOutput = z.output<typeof AppSchema>
