import { App } from './app'
// import { ImportValueNotFound } from './error'
import { Node, flatten } from './node'
import { Input } from './output'
import { Resource } from './resource'

export class Stack extends Node {
	readonly exported: Record<string, Input<unknown>> = {}
	readonly dependencies = new Set<Stack>()

	constructor(readonly app: App, readonly name: string) {
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

	get resources() {
		return flatten(this).filter(node => node instanceof Resource) as Resource[]
	}

	// export(key: string, value: Input<unknown>) {
	// 	this.exported[key] = value

	// 	return this
	// }

	// import<T>(key: string): Input<T> {
	// 	if (key in this.exported) {
	// 		return this.exported[key] as Input<T>
	// 	}

	// 	throw new ImportValueNotFound(this.name, key)
	// }
}
