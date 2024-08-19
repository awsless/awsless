import { AnyStruct, AttributeTypes } from '../struct'

export class SetStruct<
	Marshalled,
	Input extends Set<any>,
	Output extends Set<any>,
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

	filterIn(value: Input | undefined) {
		return typeof value === 'undefined' || value.size === 0
	}

	filterOut() {
		return false
	}

	marshall(value: Input): Record<Type, Marshalled> {
		return {
			[this.type]: this._marshall(value),
		} as Record<Type, Marshalled>
	}

	unmarshall(value: Record<Type, Marshalled> | undefined): Output {
		if (typeof value === 'undefined') {
			return new Set() as Output
		}

		return this._unmarshall(value[this.type])
	}
}
