
import { Struct, AttributeTypes } from "./struct";

export const optional = <
	M, I, O,
	P extends Array<string | number> = [],
	OP extends Array<string | number> = [],
	T extends AttributeTypes = AttributeTypes,
>(struct:Struct<M, I, O, P, OP, T>) => {

	return new Struct<M, I, O, P, OP, T, true>(
		struct.type,
		struct._marshall,
		struct._unmarshall,
		struct.walk,
		true
	)
}
