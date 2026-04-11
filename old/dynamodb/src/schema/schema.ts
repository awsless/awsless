// import { AttributeValue } from '@aws-sdk/client-dynamodb'

import { NativeAttributeBinary } from '@aws-sdk/util-dynamodb'

export type AnySchema = Schema<
	//
	any,
	any,
	Array<string | number>,
	Array<string | number>,
	boolean
>

export type MarshalledInput = {
	S: string
	N: string
	B: Uint8Array
	BOOL: boolean

	M: Record<string, MarshalledInput>
	L: MarshalledInput[]

	SS: string[]
	NS: string[]
	BS: Uint8Array[]
}

export type MarshalledOutput = Partial<{
	S: string
	N: string
	B: NativeAttributeBinary
	BOOL: boolean

	M: Record<string, MarshalledOutput | undefined>
	L: Array<MarshalledOutput | undefined>

	SS: string[]
	NS: string[]
	BS: NativeAttributeBinary[]
}>

export class Schema<
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
		readonly marshall: (value: Input) => MarshalledOutput | undefined,
		readonly unmarshall: (value: MarshalledInput) => Output,
		readonly walk: undefined | ((...path: Array<string | number>) => AnySchema | undefined) = undefined
	) {}

	filterIn(value: Input | undefined): boolean {
		return typeof value === 'undefined'
	}

	filterOut(value: Input | undefined): boolean {
		return typeof value === 'undefined'
	}
}
