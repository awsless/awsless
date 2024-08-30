import { Struct, AnyStruct } from "./struct";

type RecordPaths<S extends AnyStruct> = [string] | [ string, ...S['PATHS'] ]
type RecordOptPaths<S extends AnyStruct> = [string] | [ string, ...S['OPT_PATHS'] ]

export const record = <S extends AnyStruct>(struct:S) => new Struct<
	Record<string, S['MARSHALLED']>,
	Record<string, S['INPUT']>,
	Record<string, S['OUTPUT']>,
	RecordPaths<S>,
	RecordOptPaths<S>
>(
	'M',
	(unmarshalled:Record<string, unknown>) => {
		const marshalled:Record<string, unknown> = {}
		for(const [ key, value ] of Object.entries(unmarshalled)) {
			marshalled[key] = struct.marshall(value)
		}

		return marshalled as Record<string, S['MARSHALLED']>
	},
	(marshalled:Record<string, Record<string, any>>) => {
		const unmarshalled:Record<string, unknown> = {}
		for(const [ key, value ] of Object.entries(marshalled)) {
			unmarshalled[key] = struct.unmarshall(value)
		}

		return unmarshalled as Record<string, S['INPUT']>
	}, (_, ...rest) => {
		return rest.length ? struct.walk?.(...rest) : struct
	}
)
