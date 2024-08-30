import { AnySchema, Schema } from './schema'

type RecordPaths<S extends AnySchema> = [string] | [string, ...S['PATHS']]
type RecordOptPaths<S extends AnySchema> = [string] | [string, ...S['OPT_PATHS']]

export const record = <S extends AnySchema>(schema: S) =>
	new Schema<
		//
		'M',
		Record<string, S['INPUT']>,
		Record<string, S['OUTPUT']>,
		RecordPaths<S>,
		RecordOptPaths<S>
	>(
		'M',
		unmarshalled => {
			const marshalled: Record<string, any> = {}

			for (const [key, value] of Object.entries(unmarshalled)) {
				marshalled[key] = schema.marshall(value)
			}

			return { M: marshalled }
		},
		marshalled => {
			const unmarshalled: Record<string, S['OUTPUT']> = {}

			for (const [key, value] of Object.entries(marshalled.M)) {
				unmarshalled[key] = schema.unmarshall(value)
			}

			return unmarshalled
		},
		(_, ...rest) => {
			return rest.length ? schema.walk?.(...rest) : schema
		}
	)
