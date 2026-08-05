import { StackConfig } from '../../../old/index.js'
import { Code } from '../../../old/formation/resource/lambda/code.js'
import { Function } from '../../../old/formation/resource/lambda/function.js'

export const extendedStack: StackConfig = {
	name: 'extended',
	extend({ stack }) {
		const lambda = new Function('extend', {
			code: Code.fromFile('extend', __dirname + '/../function/route.ts'),
		})

		stack.add(lambda)
	},
}
