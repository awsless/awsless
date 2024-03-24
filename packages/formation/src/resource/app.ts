import { Node } from './node'
import { Stack } from './stack'

export class App extends Node {
	constructor(readonly name: string) {
		super('App', name)
	}

	get stacks() {
		return this.children as Set<Stack>
	}

	add(stack: Stack) {
		if (stack instanceof Stack) {
			return super.add(stack)
		}

		throw new TypeError('You can only add stacks to an app')
	}
}
