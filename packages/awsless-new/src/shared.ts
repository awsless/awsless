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
