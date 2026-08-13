import { AnySchema, Schema } from './schema'

type ArrayPaths<L extends AnySchema> = [number] | [number, ...L['PATHS']]
type ArrayOptPaths<L extends AnySchema> = [number] | [number, ...L['OPT_PATHS']]

export const array = <S extends AnySchema>(schema: S) =>
	new Schema<S['INPUT'][], S['OUTPUT'][], ArrayPaths<S>, ArrayOptPaths<S>>(
		unmarshalled => ({ L: unmarshalled.map(item => schema.marshall(item)) }),
		marshalled => marshalled.L.map(item => schema.unmarshall(item)),
		(_, ...rest) => {
			return rest.length ? schema.walk?.(...rest) : schema
		}
	)
