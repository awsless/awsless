import { AnyZodObject, z } from 'zod'
import { Plugin } from '../../feature.js'

export const PluginSchema: z.ZodType<
	Plugin<AnyZodObject | undefined>,
	z.ZodTypeDef,
	Plugin<AnyZodObject | undefined>
> = z.object({
	name: z.string(),
	schema: z.custom<AnyZodObject>().optional(),
	// depends: z.array(z.lazy(() => PluginSchema)).optional(),
	onApp: z.function().returns(z.void()).optional(),
	onStack: z.function().returns(z.any()).optional(),
	onResource: z.function().returns(z.any()).optional(),
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
