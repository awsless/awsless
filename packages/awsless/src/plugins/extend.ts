
import { z } from 'zod'
import { AppContext, StackContext, definePlugin } from '../plugin';

export const extendPlugin = definePlugin({
	name: 'extend',
	schema: z.object({
		/** Extend your app with custom resources */
		extend: z.custom<(ctx:AppContext) => void>().optional(),
		stacks: z.object({
			/** Extend your stack with custom resources */
			extend: z.custom<(ctx:StackContext) => void>().optional(),
		}).array()
	}),
	onApp(ctx) {
		ctx.config.extend?.(ctx as unknown as AppContext)
	},
	onStack(ctx) {
		ctx.stackConfig.extend?.(ctx)
	},
})
