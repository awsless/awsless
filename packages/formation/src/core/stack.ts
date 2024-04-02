import { Node, flatten } from './node'
import { Input } from './output'
import { Resource } from './resource'

export class Stack extends Node {
	readonly exports: Record<string, Input<unknown>> = {}

	constructor(readonly name: string) {
		super('Stack', name)
	}

	get resources() {
		return flatten(this).filter(node => node instanceof Resource) as Resource[]
	}

	export(key: string, value: Input<unknown>) {
		this.exports[key] = value

		return this
	}
}
