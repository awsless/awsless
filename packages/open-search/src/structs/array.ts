
import { AnyStruct, Struct } from "./struct";

export const array = <S extends AnyStruct>(struct:S) => {
	return new Struct<S['ENCODED'][], S['INPUT'][], S['OUTPUT'][]>(
		(input) => input.map(item => struct.encode(item)),
		(encoded) => encoded.map(item => struct.decode(item)),
		struct.props,
	)
}
