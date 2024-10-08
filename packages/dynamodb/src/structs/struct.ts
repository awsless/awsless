import { AttributeValue } from '@aws-sdk/client-dynamodb'

export type AttributeTypes = keyof AttributeValue

export type AnyStruct = Struct<
	any,
	any,
	any,
	// any,
	// any,
	Array<string | number>,
	Array<string | number>,
	// any,
	// any
	AttributeTypes,
	boolean
>

export class Struct<
	Marshalled,
	Input,
	Output,
	Paths extends Array<string | number> = [],
	OptionalPaths extends Array<string | number> = [],
	Type extends AttributeTypes = AttributeTypes,
	Optional extends boolean = false,
> {
	// declare readonly TYPE: Type
	declare readonly MARSHALLED: Marshalled
	declare readonly INPUT: Input
	declare readonly OUTPUT: Output
	declare readonly PATHS: Paths
	declare readonly OPT_PATHS: OptionalPaths
	// declare readonly OPTIONAL: Optional
	constructor(
		readonly type: Type,
		readonly _marshall: (value: Input) => Marshalled,
		readonly _unmarshall: (value: Marshalled) => Output,
		readonly walk: undefined | ((...path: Array<string | number>) => AnyStruct | undefined) = undefined,
		readonly optional: Optional = false as Optional
	) {}

	filterIn(value: Input | undefined): boolean {
		// if(!this.optional){
		// 	return false
		// }

		return typeof value === 'undefined'
	}

	filterOut(value: Input | undefined): boolean {
		return typeof value === 'undefined'
	}

	marshall(value: Input): Record<Type, Marshalled> {
		return {
			[this.type]: this._marshall(value),
		} as Record<Type, Marshalled>
	}

	unmarshall(value: Record<Type, Marshalled>): Output {
		return this._unmarshall(value[this.type])
	}
}
