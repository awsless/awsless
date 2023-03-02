
import { Struct, AnyStruct } from "./struct";

type ArrayPaths<L extends AnyStruct> = [number] | [ number, ...L['PATHS'] ]

export const array = <S extends AnyStruct>(struct:S) => new Struct<
	'L',
	S['MARSHALLED'][],
	S['INPUT'][],
	S['OUTPUT'][],
	ArrayPaths<S>
>(
	(unmarshalled) => ({ L: unmarshalled.map(item => struct.marshall(item)) }),
	(marshalled) => marshalled.L.map(item => struct.unmarshall(item)),
	(_, ...rest) => {
		return rest.length ? struct.walk?.(...rest) : struct
	}
)
