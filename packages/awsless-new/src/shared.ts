export class SharedData {
	protected data: Record<string, unknown> = {}

	get<T>(key: string) {
		return this.data[key] as T
	}

	set(key: string, value: unknown) {
		this.data[key] = value
		return this
	}
}

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
