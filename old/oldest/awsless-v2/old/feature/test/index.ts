import { definePlugin } from '../../feature.js'

export const testPlugin = definePlugin({
	name: 'test',
	onStack({ tests, stackConfig }) {
		if (stackConfig.tests) {
			tests.set(stackConfig.name, stackConfig.tests)
		}
	},
})
