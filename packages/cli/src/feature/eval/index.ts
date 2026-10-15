import { defineFeature } from '../../feature.js'

export const evalFeature = defineFeature({
	name: 'eval',
	onStack(ctx) {
		const evals = ctx.stackConfig.evals

		if (evals) {
			ctx.registerEval({
				stackName: ctx.stack.name,
				name: ctx.stackConfig.name,
				paths: evals.path,
				configs: evals.configs,
				threshold: evals.threshold,
			})
		}
	},
})
