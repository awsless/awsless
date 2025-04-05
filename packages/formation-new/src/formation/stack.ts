import { App } from './app.ts'
import { Group } from './group.ts'

export class Stack extends Group {
	readonly dependencies = new Set<Stack>()

	constructor(
		readonly app: App,
		name: string
	) {
		super(app, 'Stack', name)
	}

	dependsOn(...stacks: Stack[]) {
		for (const stack of stacks) {
			if (stack.app !== this.app) {
				throw new Error(`Stacks that belong to different apps can't be dependent on each other`)
			}

			this.dependencies.add(stack)
		}

		return this
	}
}

export const findParentStack = (group: Group): Stack => {
	if (group instanceof Stack) {
		return group
	}

	if (!group.parent) {
		throw new Error('No stack found')
	}

	return findParentStack(group.parent)
}
