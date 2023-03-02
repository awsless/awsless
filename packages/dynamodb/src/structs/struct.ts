
export type AttributeTypes = 'S' | 'N' | 'B' | 'BOOL' | 'L' | 'M' | 'SS' | 'NS' | 'BS'

export type AnyStruct = Struct<any, any, any, any, Array<string | number>, boolean>

export class Struct<
	Type extends AttributeTypes,
	Marshalled,
	Input,
	Output,
	Paths extends Array<string | number> = [],
	Optional extends boolean = false,
> {
	declare readonly TYPE: Type
	declare readonly MARSHALLED: Marshalled
	declare readonly INPUT: Input
	declare readonly OUTPUT: Output
	declare readonly PATHS: Paths
	// declare readonly OPTIONAL: Optional
	constructor(
		readonly marshall: (value:Input) => Record<Type, Marshalled>,
		readonly unmarshall: (value:Record<Type, Marshalled>) => Output,
		readonly walk: undefined | ((...path:Array<string | number>) => AnyStruct | undefined) = undefined,
		readonly optional: Optional = false as Optional
	) {}
}
