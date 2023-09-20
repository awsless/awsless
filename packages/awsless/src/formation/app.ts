import { Stack } from "./stack"
import { ConstructorOf } from "./util"

export class App {
	private list = new Map<string, Stack>()

	constructor(readonly name: string) {}

	add(...stacks: Stack[]) {
		stacks.forEach(stack => {
			this.list.set(stack.name, stack)
			stack.setApp(this)
		})

		return this
	}

	find<T>(resourceType: ConstructorOf<T>): T[] {
		return this.stacks.map(stack => stack.find(resourceType)).flat() as T[]
	}

	[ Symbol.iterator ]() {
		return this.list.values()
	}

	get stacks() {
		return [ ...this.list.values() ]
	}

	// get resources() {
	// 	return this.stacks.map(stack => stack.resources).flat()
	// }
}
