import { Stack } from '../formation/stack.js';
import { StackConfig } from '../schema/stack.js';

// export type StackNode = {
// 	stack: Stack
// 	children: StackNode[]
// }

export const createDeploymentLine = (stacks:{ stack:Stack, config?:StackConfig }[]) => {
	const list = stacks.map(({ stack, config }) => ({
		stack,
		depends: config?.depends?.map(dep => dep.name) || []
	}))

	const names = stacks.map(({stack}) => stack.name)
	const line:Stack[][] = []
	const deps:string[] = []
	let limit = 100

	while(deps.length < list.length) {
		const local:Stack[] = []

		for(const { stack, depends } of list) {
			if(
				!deps.includes(stack.name) &&
				depends.filter(dep => !deps.includes(dep)).length === 0
			) {
				local.push(stack)
			}
		}

		if(limit-- <= 0) {
			const circularNames = names.filter(name => deps.includes(name))
			throw new Error(`Circular stack dependencies arn't allowed: ${circularNames}`)
		}

		deps.push(...local.map(stack => stack.name))
		line.push(local)
	}

	return line
}
