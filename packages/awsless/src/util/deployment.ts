import { Stack } from "aws-cdk-lib";
import { StackConfig } from "../schema/stack";

export type StackNode = {
	stack: Stack
	level: number
	children: StackNode[]
}

type FlatStack = {
	stack: Stack
	depends: string[]
}

export const flattenDependencyTree = (stacks: StackNode[]) => {
	const list:StackNode[] = []
	const walk = (stacks: StackNode[]) => {
		stacks.forEach(node => {
			list.push(node)
			walk(node.children)
		})
	}

	walk(stacks)

	return list
}

export const createDependencyTree = (stacks:{ stack:Stack, config?:StackConfig }[]) => {
	const list: FlatStack[] = stacks.map(({ stack, config }) => ({
		stack,
		depends: config?.depends?.map(dep => dep.name) || []
	}))

	const findChildren = (list:FlatStack[], parents:string[], level:number): StackNode[] => {

		// debug('STACKS', list.map(item => ({ name: item.stack.artifactId, depends: item.depends })))

		const children:FlatStack[] = []
		const rests:FlatStack[] = []

		for(const item of list) {
			const isChild = item.depends.filter(dep => !parents.includes(dep)).length === 0
			if(isChild) {
				children.push(item)
			} else {
				rests.push(item)
			}
		}

		if(!rests.length) {
			return children.map(({ stack }) => ({
				stack,
				level,
				children: [],
			}))
		}

		return children.map(({ stack }) => {
			return {
				stack,
				level,
				children: findChildren(rests, [ ...parents, stack.artifactId ], level + 1)
			}
		})
	}

	return findChildren(list, [], 1)
}

export const createDeploymentLine = (stacks:StackNode[]) => {
	const flat = flattenDependencyTree(stacks)
	const line:Stack[][] = []

	flat.forEach(node => {
		const level = node.level

		if(!line[level]) {
			line[level] = []
		}

		line[level].push(node.stack)
	})

	return line
}
