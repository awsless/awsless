const RESERVED = new Set(['then', 'toJSON', 'toString', 'valueOf'])

/*@__NO_SIDE_EFFECTS__*/
export const createProxy = (cb: (name: string) => unknown) => {
	const cache = new Map<string, unknown>()

	return new Proxy(
		{},
		{
			get(_, name: string | symbol) {
				// Probing these must not hand the engine a resource action to call.
				if (typeof name === 'symbol' || RESERVED.has(name)) {
					return undefined
				}

				if (!cache.has(name)) {
					cache.set(name, cb(name))
				}

				return cache.get(name)
			},
		}
	)
}
