import { StackConfig } from "../../../src";
import { Code } from "../../../src/formation/resource/lambda/code";
import { Function } from "../../../src/formation/resource/lambda/function";

export const extendedStack:StackConfig = {
	name: 'extended',
	extend({ stack }) {
		const lambda = new Function('extend', {
			code: Code.fromFile('extend', __dirname + '/../function/route.ts')
		})

		stack.add(lambda)
	}
}
