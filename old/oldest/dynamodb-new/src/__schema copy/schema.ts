// import { AttributeValue } from '@aws-sdk/client-dynamodb'

// // type T = AttributeValue

// // const t: T = { '$unknown': '' }

import { NativeAttributeBinary } from '@aws-sdk/util-dynamodb'

export type AnySchema = Schema<
	//
	any,
	any,
	any,
	Array<string | number>,
	Array<string | number>,
	boolean
>

export type MarshallInputTypes = {
	S: string
	N: string
	B: NativeAttributeBinary
	BOOL: boolean

	M: Record<string, Partial<MarshallInputTypes>>
	L: MarshallInputTypes[]

	SS: string[]
	NS: string[]
	BS: NativeAttributeBinary[]
}

export type MarshallOutputTypes = {
	S: string
	N: string
	B: Uint8Array
	BOOL: boolean

	M: Record<string, Partial<MarshallOutputTypes>>
	L: MarshallOutputTypes[]

	SS: string[]
	NS: string[]
	BS: Uint8Array[]
}

export type Types = keyof MarshallInputTypes

export class Schema<
	Type extends Types,
	Input,
	Output,
	Paths extends Array<string | number> = [],
	OptionalPaths extends Array<string | number> = [],
	Optional extends boolean = false,
> {
	declare readonly INPUT: Input
	declare readonly OUTPUT: Output
	declare readonly PATHS: Paths
	declare readonly OPT_PATHS: OptionalPaths
	declare readonly OPTIONAL: Optional

	constructor(
		readonly type: Type | undefined,
		readonly encode: (value: Input) => MarshallInputTypes[Type],
		readonly decode: (value: MarshallOutputTypes[Type]) => Output,
		readonly walk: undefined | ((...path: Array<string | number>) => AnySchema | undefined) = undefined
		// readonly optional: Optional = false as Optional
	) {}

	marshall(value: Input): Record<Type, MarshallInputTypes[Type]> | undefined {
		return {
			[this.type!]: this.encode(value),
		} as Record<Type, MarshallInputTypes[Type]>
	}

	unmarshall(value: Record<Type, MarshallOutputTypes[Type]>): Output {
		return this.decode(value[this.type!])
	}

	filterIn(value: Input | undefined): boolean {
		return typeof value === 'undefined'
	}

	filterOut(value: Input | undefined): boolean {
		return typeof value === 'undefined'
	}
}

export type SchemaProps<Type extends Types, Input, Output, Optional extends boolean = false> = {
	type: Type
	optional?: Optional

	encode?(value: Input): MarshallInputTypes[Type]
	decode?(value: MarshallOutputTypes[Type]): Output

	marshall?(value: Input): Record<Type, MarshallInputTypes[Type]> | undefined
	unmarshall?(value: Record<Type, MarshallOutputTypes[Type]>): Output

	filterIn?(value: Input | undefined): boolean
	filterOut?(value: Input | undefined): boolean
}

export type BaseSchema<
	Type extends Types,
	Input,
	Output,
	Paths extends Array<string | number> = [],
	OptionalPaths extends Array<string | number> = [],
	Optional extends boolean = false,
> = Readonly<
	Required<SchemaProps<Type, Input, Output, Optional>> & {
		INPUT: Input
		OUTPUT: Output
		PATHS: Paths
		OPT_PATHS: OptionalPaths
		OPTIONAL: Optional
	}
>

// type Schema<
// 	Type extends Types,
// 	Input,
// 	Output,
// 	Paths extends Array<string | number> = [],
// 	OptionalPaths extends Array<string | number> = [],
// 	Optional extends boolean = false,
// > = {
// 	encode(value: Input): MarshallInputTypes[Type]
// 	decode(value: MarshallOutputTypes[Type]): Output

// 	marshall(value: Input): Record<Type, MarshallInputTypes[Type]> | undefined
// 	unmarshall(value: Record<Type, MarshallOutputTypes[Type]>): Output

// 	filterIn(value: Input | undefined): boolean
// 	filterOut(value: Input | undefined): boolean
// }

export const createSchema = <
	Type extends Types,
	Input,
	Output,
	Paths extends Array<string | number> = [],
	OptionalPaths extends Array<string | number> = [],
	Optional extends boolean = false,
>(
	props: SchemaProps<Type, Input, Output, Optional>
) => {
	return {
		optional: false,
		encode(value) {
			return value
		},
		decode(value) {
			return value
		},
		marshall(value) {
			return {
				[props.type]: this.encode(value),
			} as Record<Type, MarshallInputTypes[Type]>
		},
		unmarshall(value) {
			return this.decode(value[props.type])
		},
		filterIn(value) {
			return typeof value === 'undefined'
		},
		filterOut(value) {
			return typeof value === 'undefined'
		},
		...props,
	} as BaseSchema<Type, Input, Output, Paths, OptionalPaths, Optional>
}
