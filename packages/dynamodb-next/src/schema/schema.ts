import { NativeAttributeBinary } from '@aws-sdk/util-dynamodb'

export type AnySchema = BaseSchema<any>

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

export type AttributeType = keyof MarshallInputTypes
export type AttributeInputValue<T extends AttributeType = AttributeType> = MarshallInputTypes[T]
export type AttributeOutputValue<T extends AttributeType = AttributeType> = MarshallOutputTypes[T]
export type AttributeInput<T extends AttributeType = AttributeType> = Record<T, AttributeInputValue<T>>
export type AttributeOutput<T extends AttributeType = AttributeType> = Record<T, AttributeOutputValue<T>>

// const lol: AttributeInput = {
// 	''
// }

export type SchemaProps<A extends AttributeType, T = any> = {
	type?: A

	encode?(value: T): AttributeInputValue<A> | undefined
	decode?(value: AttributeOutputValue<A>): T

	marshall?(value: T): AttributeInput<A> | undefined
	unmarshall?(value: AttributeOutput<A>): T

	filterIn?(value: T | undefined): boolean
	filterOut?(value: T | undefined): boolean

	walk?: (...path: Array<string | number>) => AnySchema | undefined
}

export type Expression<U = any, C = any, RU = any, RC = any> = {
	Update: U
	Condition: C
	Root: {
		Update: RU
		Condition: RC
	}
}

export type BaseSchema<A extends AttributeType, T = any, Exp extends Expression = Expression> = {
	[key: symbol]: {
		Type: T
		Expression: Exp
	}

	readonly type?: A

	encode(value: T): AttributeInputValue<A> | undefined
	decode(value: AttributeOutputValue<A>): T

	marshall(value: T): AttributeInput<A> | undefined
	unmarshall(value: AttributeOutput<A>): T

	// filterIn(value: T | undefined): boolean
	// filterOut(value: T | undefined): boolean

	walk?(...path: Array<string | number>): AnySchema | undefined
}

export const createSchema = <A extends AttributeType, T>(props: SchemaProps<A, T>): BaseSchema<A, T> => {
	return {
		encode(value) {
			return value as AttributeInputValue<A>
		},
		decode(value) {
			return value as T
		},
		marshall(value) {
			return {
				[props.type!]: this.encode(value),
			} as AttributeInput<A>
		},
		unmarshall(value) {
			return this.decode(value[props.type!])
		},
		// filterIn(value) {
		// 	return typeof value === 'undefined'
		// },
		// filterOut(value) {
		// 	return typeof value === 'undefined'
		// },
		...props,
	}
}
