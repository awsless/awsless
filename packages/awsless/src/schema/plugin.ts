import { Schema, z } from "zod"
import { Plugin } from "../plugin"

export const PluginSchema: z.ZodType<Plugin<Schema | undefined>, z.ZodTypeDef, Plugin<Schema | undefined>> = z.object({
	name: z.string(),
	schema: z.custom<Schema>().optional(),
	depends: z.array(z.lazy(() => PluginSchema)).optional(),
	onBootstrap: z.function().optional(),
	onStack: z.function().returns(z.any()).optional(),
	onApp: z.function().optional(),
	// bind: z.function().optional(),
})

// export type Plugin<PluginSchema extends Schema, Depends extends PluginDepends = undefined> = {
// 	name: string
// 	depends?: Depends
// 	schema: PluginSchema
// 	onBootstrap?: (config: BootstrapContext<PluginSchema, Depends>, bootstrap: Stack) => void
// 	onStack?: (context: StackContext<PluginSchema, Depends>) => void
// 	onApp?: (config:AppContext<PluginSchema, Depends>) => void
// }
