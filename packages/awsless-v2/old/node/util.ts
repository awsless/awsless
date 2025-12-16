
/*@__NO_SIDE_EFFECTS__*/
export const createProxy = (cb:(name:string) => unknown) => {
	const cache = new Map<string, unknown>()

	return new Proxy({}, {
		get(_, name:string) {
			if(!cache.has(name)) {
				cache.set(name, cb(name))
			}

			return cache.get(name)
		},
	})
}
