import { z } from "zod";
import { ResourceIdSchema } from './resource-id.js';
import { StackSchema } from './stack.js';
import { RegionSchema } from './region.js';
import { PluginSchema } from './plugin.js';

export const AppSchema = z.object({
	/** App name */
	name: ResourceIdSchema,

	/** The AWS region to deploy to. */
	region: RegionSchema,

	/** The AWS profile to deploy to. */
	profile: z.string(),

	/** The deployment stage.
	 * @default 'prod'
	 */
	stage: z.string().regex(/^[a-z]+$/).default('prod'),

	/** Default properties. */
	defaults: z.object({}).default({}),

	/** The application stacks. */
	stacks: z.array(StackSchema).min(1).refine(stacks => {
		const unique = new Set(stacks.map(stack => stack.name))
		return unique.size === stacks.length
	}, 'Must be an array of unique stacks'),

	/** Custom plugins. */
	plugins: z.array(PluginSchema).optional(),
})

export type AppConfigInput = z.input<typeof AppSchema>
export type AppConfigOutput = z.output<typeof AppSchema>
