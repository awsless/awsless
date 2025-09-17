import { color } from '../../cli/ui/style.js'
import { defineFeature } from '../../feature.js'

export const testFeature = defineFeature({
	name: 'test',
	onStack(ctx) {
		if (ctx.stackConfig.tests) {
			ctx.registerTest(ctx.stackConfig.name, ctx.stackConfig.tests)
		} else {
			ctx.addWarning({
				message: `Stack ${color.info(ctx.stack.name)} has no tests defined. Consider adding test cases to ensure stability.`,
			})
		}
	},
})
