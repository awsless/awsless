import { defineFeature } from '../../feature.js'

export const testFeature = defineFeature({
	name: 'test',
	onStack(ctx) {
		if (ctx.stackConfig.tests) {
			ctx.registerTest(ctx.stackConfig.name, ctx.stackConfig.tests)
		}
	},
})
