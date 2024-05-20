// import { AttributeTypes } from './struct'

class Any {
	declare readonly MARSHALLED: any
	declare readonly INPUT: any
	declare readonly OUTPUT: any
	declare readonly PATHS: []
	declare readonly OPT_PATHS: []

	filterIn(value: any) {
		return typeof value === 'undefined'
	}
	filterOut(value: any) {
		return typeof value === 'undefined'
	}

	marshall(value: any) {
		return value
	}
	unmarshall(value: any) {
		return value
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

export const any = () => new Any()
