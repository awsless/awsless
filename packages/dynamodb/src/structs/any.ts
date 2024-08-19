// import { AttributeTypes } from './struct'

import { marshall, marshallOptions, unmarshall, unmarshallOptions } from '@aws-sdk/util-dynamodb'
import { AnyStruct } from './struct'

// import { Struct } from './struct'

type Options = marshallOptions & unmarshallOptions

class Any {
	declare readonly MARSHALLED: any
	declare readonly INPUT: any
	declare readonly OUTPUT: any
	declare readonly PATHS: []
	declare readonly OPT_PATHS: []

	constructor(private options: Options = {}) {}

	filterIn(value: any) {
		return typeof value === 'undefined'
	}

	filterOut(value: any) {
		return typeof value === 'undefined'
	}

	marshall(value: any) {
		return marshall({ value }, this.options).value as any
	}

	unmarshall(value: any) {
		return unmarshall({ value }, this.options).value as any
	}

	_marshall(value: any) {
		return value
	}

	_unmarshall(value: any) {
		return value
	}

	type: any
	optional = true

	walk: undefined
}

export const any = (options: Options = {}): AnyStruct => new Any(options)

// export const any = () =>
// 	new Struct<string, any, any>(
// 		'S',
// 		value => JSON.stringify(value),
// 		value => (typeof value === 'undefined' ? value : JSON.parse(value))
// 	)
