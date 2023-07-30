
// export const getResourceName = (type: ResourceType, stack: string, id: string) => {
// 	const key = `RESOURCE_${type.toUpperCase()}_${stack}_${id}`
// 	const value = process.env[key]

// 	if(!value) {
// 		throw new TypeError(`Resource type: "${type}" stack: "${stack}" id: "${id}" doesn't exist.`)
// 	}

// 	return value
// }

export const getResourceName = (
	type: string,
	id: string,
	stack: string = (process.env.STACK || 'default')
) => {
	const key = `RESOURCE_${type.toUpperCase()}_${stack}_${id}`
	const value = process.env[key]

	if(!value) {
		throw new TypeError(`Resource type: "${type}" stack: "${stack}" id: "${id}" doesn't exist.`)
	}

	return value
}

export const getFunctionName = (id: string, stack?: string) => {
	return getResourceName('function', id, stack)
}

export const getTableName = (id: string, stack?: string) => {
	return getResourceName('table', id, stack)
}

export const getQueueName = (id: string, stack?: string) => {
	return getResourceName('queue', id, stack)
}

export const getStoreName = (id: string, stack?: string) => {
	return getResourceName('store', id, stack)
}



// getResourceName('function', 'id', 'assets')

// export const getResourceProxy = (type: string): Record<string, string> => {
// 	return new Proxy({}, {
// 		get(_, id: string) {
// 			return getResourceName(type, id)
// 		}
// 	})
// }

// export const Function = /* @__PURE__ */ getResourceProxy('FUNCTION')
// export const Table = /* @__PURE__ */ getResourceProxy('TABLE')
// export const Queue = /* @__PURE__ */ getResourceProxy('QUEUE')
// export const Store = /* @__PURE__ */ getResourceProxy('STORE')
