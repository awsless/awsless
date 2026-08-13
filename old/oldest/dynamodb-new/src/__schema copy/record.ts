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
		input => {
			const result: Record<string, any> = {}

			for (const [key, value] of Object.entries(input)) {
				result[key] = schema.marshall(value)
			}

			return result
		},
		output => {
			const result: Record<string, S['OUTPUT']> = {}

			for (const [key, value] of Object.entries(output)) {
				result[key] = schema.unmarshall(value)
			}

			return result
		},
		(_, ...rest) => {
			return rest.length ? schema.walk?.(...rest) : schema
		}
	)
