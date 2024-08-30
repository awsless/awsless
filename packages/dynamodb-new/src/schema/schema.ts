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
		readonly marshall: (value: Input) => Record<Type, MarshallInputTypes[Type]> | undefined,
		readonly unmarshall: (value: Record<Type, MarshallOutputTypes[Type]>) => Output,
		readonly walk: undefined | ((...path: Array<string | number>) => AnySchema | undefined) = undefined
		// readonly optional: Optional = false as Optional
	) {}

	filterIn(value: Input | undefined): boolean {
		return typeof value === 'undefined'
	}

	filterOut(value: Input | undefined): boolean {
		return typeof value === 'undefined'
	}
}
