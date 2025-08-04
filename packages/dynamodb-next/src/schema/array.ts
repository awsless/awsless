import { ListExpression } from '../expression/types'
import { AnySchema, BaseSchema, createSchema, MarshallInputTypes } from './schema'

export type ArraySchema<T extends AnySchema> = BaseSchema<
	//
	'L',
	T[symbol]['Type'][],
	ListExpression<T[symbol]['Type'][], T[]>
>

export const array = <S extends AnySchema>(schema: S): ArraySchema<S> =>
	createSchema({
		type: 'L',
		encode: value => value.map(item => schema.marshall(item) as MarshallInputTypes),
		decode: value => value.map(item => schema.unmarshall(item)),
		walk(_, ...rest) {
			return rest.length ? schema.walk?.(...rest) : schema
		},
	})
