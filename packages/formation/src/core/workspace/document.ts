// import { ResourceDocument } from '../cloud'
// import { Output } from '../output'
// import { URN } from '../resource'

export const cloneObject = <T>(document: T, replacer?: any): T => {
	return JSON.parse(JSON.stringify(document, replacer))
}

// export const unwrapOutputsFromDocument = (urn: URN, document: ResourceDocument): ResourceDocument => {
// 	const replacer = (_: string, value: unknown) => {
// 		if (value instanceof Output) {
// 			return value.valueOf()
// 		}

// 		if (typeof value === 'bigint') {
// 			return Number(value)
// 		}

// 		return value
// 	}

// 	try {
// 		// 1. Smart hack to transform all outputs to values
// 		// 2. It also converts bigints to numbers

// 		return cloneObject(document, replacer)
// 	} catch (error) {
// 		if (error instanceof TypeError) {
// 			throw new TypeError(`Resource has unresolved inputs: ${urn}`)
// 		}

// 		throw error
// 	}
// }

export const compareDocuments = <T>(left: T, right: T) => {
	// order the object keys so that the comparison works.
	const replacer = (_: unknown, value: unknown) => {
		if (value !== null && value instanceof Object && !Array.isArray(value)) {
			return Object.keys(value)
				.sort()
				.reduce((sorted: Record<string, unknown>, key) => {
					sorted[key] = value[key as keyof typeof value]
					return sorted
				}, {})
		}
		return value
	}

	const l = JSON.stringify(left, replacer)
	const r = JSON.stringify(right, replacer)

	return l === r
}
