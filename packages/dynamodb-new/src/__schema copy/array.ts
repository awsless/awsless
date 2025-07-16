import { AnySchema, MarshallInputTypes, Schema } from './schema'

type ArrayPaths<L extends AnySchema> = [number] | [number, ...L['PATHS']]
type ArrayOptPaths<L extends AnySchema> = [number] | [number, ...L['OPT_PATHS']]

type RequiredSchema = Schema<
	//
	any,
	any,
	any,
	Array<string | number>,
	Array<string | number>,
	false
>

export const array = <S extends RequiredSchema>(schema: S) =>
	new Schema<'L', S['INPUT'][], S['OUTPUT'][], ArrayPaths<S>, ArrayOptPaths<S>>(
		'L',
		unmarshalled => ({ L: unmarshalled.map(item => schema.marshall(item) as MarshallInputTypes) }),
		marshalled => marshalled.L.map(item => schema.unmarshall(item)),
		(_, ...rest) => {
			return rest.length ? schema.walk?.(...rest) : schema
		}
	)
