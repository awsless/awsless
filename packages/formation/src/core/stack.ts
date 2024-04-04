import { ImportValueNotFound } from './error'
import { Node, flatten } from './node'
import { Input } from './output'
import { Resource } from './resource'

export class Stack extends Node {
	readonly exported: Record<string, Input<unknown>> = {}

	constructor(readonly name: string) {
		super('Stack', name)
	}

	get resources() {
		return flatten(this).filter(node => node instanceof Resource) as Resource[]
	}

	export(key: string, value: Input<unknown>) {
		this.exported[key] = value

		return this
	}

	import<T>(key: string): Input<T> {
		if (key in this.exported) {
			return this.exported[key] as Input<T>
		}

		throw new ImportValueNotFound(this.name, key)
	}
}
