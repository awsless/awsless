
import { Struct, AttributeTypes } from "./struct";

export const optional = <
	T extends AttributeTypes, M, I, O, P extends Array<string | number
> = []>(struct:Struct<T, M, I, O, P>):Struct<T, M, I, O, P, true> => {
	// struct.optional = true
	// return struct
	return new Struct(struct.marshall, struct.unmarshall, struct.walk, true)
}


// export class Struct<
// 	Type extends 'S' | 'N' | 'B' | 'BOOL' | 'L' | 'M' | 'SS' | 'NS' | 'BS',
// 	Marshalled,
// 	Input,
// 	Output,
// 	Paths extends Array<string | number> = []
// > {
// 	declare readonly TYPE: Type
// 	declare readonly MARSHALLED: Marshalled
// 	declare readonly INPUT: Input
// 	declare readonly OUTPUT: Output
// 	declare readonly PATHS: Paths

// 	constructor(
// 		readonly marshall:(value:Input) => Record<Type, Marshalled>,
// 		readonly unmarshall:(value:Record<Type, Marshalled>) => Output,
// 		readonly optional: true | false = false,
// 	) {}
// }
