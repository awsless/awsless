
export const getResourceName = (type: string, id: string) => {
	const key = `RESOURCE_${type.toUpperCase()}_${id}`
	const value = process.env[key]

	if(!value) {
		throw new TypeError(`Resource type: "${type}" id: "${id}" doesn't exist.`)
	}

	return value
}

export const getResourceProxy = (type: string) => {
	return new Proxy({}, {
		get(_, id: string) {
			return getResourceName(type, id)
		}
	})
}

export const Table = getResourceProxy('TABLE')
export const Queue = getResourceProxy('QUEUE')
export const Store = getResourceProxy('STORE')
