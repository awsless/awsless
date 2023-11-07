export type StoreData = Record<string, string>

export interface Store {
	hydrate: (data: StoreData) => Store
	get: <T>(key: string) => T | undefined
	set: (key: string, value: unknown) => Store
	remove: (key: string) => Store
}
