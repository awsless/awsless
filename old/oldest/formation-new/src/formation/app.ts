import { Group } from './group.ts'
import { Stack } from './stack.ts'

export class App extends Group {
	constructor(readonly name: string) {
		super(undefined, 'app', name)
	}

	get stacks(): Stack[] {
		return this.children.filter(child => child instanceof Stack)
	}
}
