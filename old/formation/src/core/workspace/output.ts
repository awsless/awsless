import { Output } from '../output'
import { URN } from '../resource'
import { cloneObject } from './document'

export const unwrapOutputs = <T>(urn: URN, document: T): T => {
	const replacer = (_: string, value: unknown) => {
		if (value instanceof Output) {
			return value.valueOf()
		}

		if (typeof value === 'bigint') {
			return Number(value)
		}

		return value
	}

	try {
		// 1. Smart hack to transform all outputs to values
		// 2. It also converts bigints to numbers

		return cloneObject(document, replacer)
	} catch (error) {
		if (error instanceof TypeError) {
			throw new TypeError(`Resource has unresolved inputs: ${urn}`)
		}

		throw error
	}
}
