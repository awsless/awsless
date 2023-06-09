
import { AnyStruct, Struct } from "./struct";

export const set = <S extends AnyStruct>(struct:S) => {
	return new Struct<S['ENCODED'][], Set<S['INPUT']>, Set<S['OUTPUT']>>(
		(input) => [ ...input ].map(item => struct.encode(item)),
		(encoded) => new Set(encoded.map(item => struct.decode(item))),
		struct.props,
	)
}
