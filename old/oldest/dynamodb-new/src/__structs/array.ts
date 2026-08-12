
import { Struct, AnyStruct } from "./struct";

type ArrayPaths<L extends AnyStruct> = [number] | [ number, ...L['PATHS'] ]
type ArrayOptPaths<L extends AnyStruct> = [number] | [ number, ...L['OPT_PATHS'] ]

export const array = <S extends AnyStruct>(struct:S) => new Struct<
	S['MARSHALLED'][],
	S['INPUT'][],
	S['OUTPUT'][],
	ArrayPaths<S>,
	ArrayOptPaths<S>
>(
	'L',
	(unmarshalled) => unmarshalled.map(item => struct.marshall(item)),
	(marshalled) => marshalled.map(item => struct.unmarshall(item)),
	(_, ...rest) => {
		return rest.length ? struct.walk?.(...rest) : struct
	}
)
