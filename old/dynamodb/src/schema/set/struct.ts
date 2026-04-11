import { AnySchema } from '../schema'

export class SetSchema<
	Input extends Set<any>,
	Output extends Set<any>,
	Paths extends Array<string | number> = [],
	OptionalPaths extends Array<string | number> = [],
	Optional extends boolean = false,
> {
	declare readonly INPUT: Input
	declare readonly OUTPUT: Output
	declare readonly PATHS: Paths
	declare readonly OPT_PATHS: OptionalPaths
	constructor(
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
