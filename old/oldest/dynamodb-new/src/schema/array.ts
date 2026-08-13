import { AnySchema, BaseSchema, createSchema, MarshallInputTypes } from './schema'

type ArrayPaths<L extends AnySchema> = [number] | [number, ...L['PATHS']]
type ArrayOptPaths<L extends AnySchema> = [number] | [number, ...L['OPT_PATHS']]

type RequiredSchema = BaseSchema<
	//
	any,
	any,
	any,
	Array<string | number>,
	Array<string | number>,
	false
>

export const array = <S extends RequiredSchema>(schema: S) =>
	createSchema<'L', S['INPUT'][], S['OUTPUT'][], ArrayPaths<S>, ArrayOptPaths<S>>({
		type: 'L',
		encode: value => value.map(item => schema.marshall(item) as MarshallInputTypes),
		decode: value => value.map(item => schema.unmarshall(item)),
		walk(_, ...rest) {
			return rest.length ? schema.walk?.(...rest) : schema
		},
	})
