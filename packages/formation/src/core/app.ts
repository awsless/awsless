// import { ImportValueNotFound } from './error'
import { ExportedData } from './export'
import { Node } from './node'
import { Output } from './output'
import { Stack } from './stack'

export class App extends Node {
	private exported?: ExportedData
	private listeners = new Set<(data: ExportedData) => void>()

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

	import<T>(stack: string, key: string) {
		return new Output<T>([], resolve => {
			const get = (data: ExportedData) => {
				if (stack in data && key in data[stack]) {
					resolve(data[stack][key] as T)
					this.listeners.delete(get)
				}
			}

			this.listeners.add(get)

			if (this.exported) {
				get(this.exported)
			}
		})
	}

	setExportedData(data: ExportedData) {
		// console.log('exports', data)

		for (const listener of this.listeners) {
			listener(data)
		}

		// this.listeners.clear()
		this.exported = data
	}
}
