import { z } from "zod";
import { ResourceIdSchema } from "./resource-id";
import { StackSchema } from "./stack";
import { RegionSchema } from "./region";
import { PluginSchema } from "./plugin";
import { Credentials } from "../util/credentials";

export const AppSchema = z.object({
	name: ResourceIdSchema,
	region: RegionSchema,
	profile: z.string(),
	stage: z.string().regex(/[a-z]+/).default('prod'),
	defaults: z.object({}).optional(),
	stacks: z.array(StackSchema),
	plugins: z.array(PluginSchema).optional(),
})

export type AppConfig = z.infer<typeof AppSchema> & {
	stage: string
	account: string
	credentials: Credentials
}
