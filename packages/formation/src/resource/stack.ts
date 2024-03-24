import { Node, flatten } from './node'
import { Resource } from './resource'

export class Stack extends Node {
	constructor(readonly name: string) {
		super('Stack', name)
	}

	get resources() {
		return flatten(this).filter(node => node instanceof Resource) as Resource[]
	}
}
