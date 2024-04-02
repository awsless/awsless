// import { Resource } from '../../dist'
import { Input, Output } from './output'

export class SharedData<D extends Record<string, unknown> = {}> {
	private exported: Record<string, any> = {}
	private imported: Record<string, any> = {}
	private listeners = new Set<(data: D) => void>()
	// private resources = new Set<Resource>()

	set<K extends Extract<keyof D, string>>(key: K, value: Input<D[K]>) {
		this.exported[key] = value
		return this
	}

	get<K extends Extract<keyof D, string>>(key: K) {
		return new Output<D[K]>([], resolve => {
			if (key in this.exported) {
				resolve(this.exported[key])
			} else if (this.imported) {
				resolve(this.imported[key])
			} else {
				this.listeners.add(data => {
					resolve(data[key])
				})
			}
		})
	}

	populate(data: D) {
		for (const listener of this.listeners) {
			listener(data)
		}

		this.listeners.clear()
		this.imported = data
	}
}
