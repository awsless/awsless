import { NativeAttributeBinary } from '@aws-sdk/util-dynamodb'

export type AnySchema = BaseSchema<
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

	SS: string[] | undefined
	NS: string[] | undefined
	BS: NativeAttributeBinary[] | undefined
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

export type SchemaProps<Type extends Types, Input, Output, Optional extends boolean = false> = {
	type?: Type
	optional?: Optional

	encode?(value: Input): MarshallInputTypes[Type]
	decode?(value: MarshallOutputTypes[Type]): Output

	marshall?(value: Input): Record<Type, MarshallInputTypes[Type]> | undefined
	unmarshall?(value: Record<Type, MarshallOutputTypes[Type]>): Output

	filterIn?(value: Input | undefined): boolean
	filterOut?(value: Input | undefined): boolean

	walk?: (...path: Array<string | number>) => AnySchema | undefined
}

export type BaseSchema<
	Type extends Types,
	Input,
	Output,
	Paths extends Array<string | number> = [],
	OptionalPaths extends Array<string | number> = [],
	Optional extends boolean = false,
> = {
	readonly INPUT: Input
	readonly OUTPUT: Output
	readonly PATHS: Paths
	readonly OPT_PATHS: OptionalPaths
	readonly OPTIONAL: Optional

	readonly type?: Type
	readonly optional: Optional

	encode(value: Input): MarshallInputTypes[Type]
	decode(value: MarshallOutputTypes[Type]): Output

	marshall(value: Input): Record<Type, MarshallInputTypes[Type]> | undefined
	unmarshall(value: Record<Type, MarshallOutputTypes[Type]>): Output

	filterIn(value: Input | undefined): boolean
	filterOut(value: Input | undefined): boolean

	walk?(...path: Array<string | number>): AnySchema | undefined
}

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
				[props.type!]: this.encode(value),
			} as Record<Type, MarshallInputTypes[Type]>
		},
		unmarshall(value) {
			return this.decode(value[props.type!])
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
