import { ListExpression } from '../expression/types'
import { BaseSchema, createSchema, GenericSchema } from './schema'

export type ArraySchema<T extends GenericSchema> = BaseSchema<
	//
	'L',
	T[symbol]['Type'][],
	ListExpression<T[symbol]['Type'][], T[]>
>

// export const array = <S extends GenericSchema>(schema: S): ArraySchema<S> =>
// 	createSchema({
// 		type: 'L',
// 		encode: value => value.map(item => schema.marshall(item) as MarshallInputTypes),
// 		decode: value => value.map(item => schema.unmarshall(item)),
// 		walk: (_, ...rest) => (rest.length ? schema.walk?.(...rest) : schema),
// 		validate: value => Array.isArray(value),
// 	})

export const array = <S extends GenericSchema>(schema: S): ArraySchema<S> =>
	createSchema({
		name: 'array',
		type: 'L',
		marshall: (value, path) => ({ L: value.map((item, i) => schema.marshall(item, [...path, i])) }),
		unmarshall: (value, path) => value.L.map((item, i) => schema.unmarshall(item, [...path, i])),
		// validate: value => Array.isArray(value),
		validateInput: value => Array.isArray(value),
		validateOutput: value => 'L' in value && Array.isArray(value.L),
		walk: (_, ...rest) => (rest.length ? schema.walk?.(...rest) : schema),
	})
