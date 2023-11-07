import { refine, Struct } from 'superstruct'

export function unique<T extends any[], S extends any>(
	struct: Struct<T, S>,
	compare: (a: T[number], b:T[number]) => boolean = (a, b) => a === b
): Struct<T, S> {
	return refine(struct, 'unique', (value) => {
		for(const x in value) {
			for(const y in value) {
				if(x !== y && compare(value[x], value[y])) {
					return `Expected a ${struct.type} with unique values, but received "${value}"`
				}
			}
		}

		return true
	})
}
