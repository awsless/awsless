import { AnySchema, MarshallInputTypes, MarshallOutputTypes, Schema, Types } from '../schema'

export class SetSchema<
	Type extends Types,
	Input extends Set<any>,
	Output extends Set<any>,
	Paths extends Array<string | number> = [],
	OptionalPaths extends Array<string | number> = [],
	Optional extends boolean = false,
> extends Schema<Type, Input, Output, Paths, OptionalPaths, Optional> {
	constructor(
		type: Type | undefined,
		marshall: (value: Input) => Record<Type, MarshallInputTypes[Type]> | undefined,
		unmarshall: (value: Record<Type, MarshallOutputTypes[Type]>) => Output,
		walk: undefined | ((...path: Array<string | number>) => AnySchema | undefined) = undefined
		// readonly optional: Optional = false as Optional
	) {
		super(type, marshall, unmarshall, walk)
	}

	filterIn(value: Input | undefined) {
		return typeof value === 'undefined' || value.size === 0
	}

	filterOut() {
		return false
	}

	// marshall(value: Input): Record<Type, Marshalled> {
	// 	return {
	// 		[this.type]: this._marshall(value),
	// 	} as Record<Type, Marshalled>
	// }

	// unmarshall(value: Record<Type, Marshalled> | undefined): Output {
	// 	if (typeof value === 'undefined') {
	// 		return new Set() as Output
	// 	}

	// 	return this._unmarshall(value[this.type])
	// }
}
