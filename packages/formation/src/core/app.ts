// import { ImportValueNotFound } from './error'
// import { ExportedData } from './export'
import { Node } from './node'
// import { Output } from './output'
import { Stack } from './stack'

export class App extends Node {
	// private exported: ExportedData = {}
	// private listeners = new Set<(data: ExportedData) => void>()

	constructor(readonly name: string) {
		super(undefined, 'App', name)
	}

	get stacks() {
		return this.children as Stack[]
	}

	// add(stack: Stack) {
	// 	if (stack instanceof Stack) {
	// 		return super.add(stack)
	// 	}

	// 	throw new TypeError('You can only add stacks to an app')
	// }

	// import<T>(stack: string, key: string) {
	// 	return new Output<T>([], resolve => {
	// 		const get = (data: ExportedData) => {
	// 			if (typeof data[stack]?.[key] !== 'undefined') {
	// 				resolve(data[stack]?.[key] as T)
	// 				this.listeners.delete(get)
	// 			}
	// 		}

	// 		this.listeners.add(get)
	// 		get(this.exported)
	// 	})
	// }

	// setExportedData(stackName: string, data: ExportedData[string]) {
	// 	this.exported[stackName] = data

	// 	for (const listener of this.listeners) {
	// 		listener(this.exported)
	// 	}
	// }
}
