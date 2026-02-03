import { NativeAttributeBinary } from '@aws-sdk/util-dynamodb'

export type GenericSchema = BaseSchema<any>

export type MarshallInputTypes = {
	S: string
	N: string
	B: NativeAttributeBinary
	BOOL: boolean
	NULL: true

	M: Record<string, Partial<MarshallInputTypes>>
	L: Partial<MarshallInputTypes>[]

	SS: string[] | undefined
	NS: string[] | undefined
	BS: NativeAttributeBinary[] | undefined
}

export type MarshallOutputTypes = {
	S: string
	N: string
	B: Uint8Array
	BOOL: boolean
	NULL: true

	M: Record<string, Partial<MarshallOutputTypes>>
	L: Partial<MarshallOutputTypes>[]

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

	// validate(value: T): boolean

	validateInput(value: T): boolean
	validateOutput(value: AttributeOutput<A>): boolean

	// encode?(value: T): AttributeInputValue<A>
	// decode?(value: AttributeOutputValue<A>): T

	marshall(value: T): AttributeInput<A>
	unmarshall(value: AttributeOutput<A>): T

	// filterIn?(value: T | undefined): boolean
	// filterOut?(value: T | undefined): boolean

	// marshallInner?(value: T): AttributeInput<A> | undefined

	walk?(...path: Array<string | number>): GenericSchema | undefined
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

	validateInput(value: T): boolean
	validateOutput(value: AttributeOutput<A>): boolean

	// encode(value: T): AttributeInputValue<A>
	// decode(value: AttributeOutputValue<A>): T

	marshall(value: T): AttributeInput<A>
	unmarshall(value: AttributeOutput<A>): T

	// marshallInner?(value: T): AttributeInput<A> | undefined
	// filterIn(value: T | undefined): boolean
	// filterOut(value: T | undefined): boolean

	walk?(...path: Array<string | number>): GenericSchema | undefined
}

export const createSchema = <A extends AttributeType, T>(props: SchemaProps<A, T>): BaseSchema<A, T> => {
	return {
		// encode(value) {
		// 	return value as AttributeInputValue<A>
		// },
		// decode(value) {
		// 	return value as T
		// },
		// marshall(value) {
		// 	return {
		// 		[props.type!]: this.encode(value),
		// 	} as AttributeInput<A>
		// },
		// unmarshall(value) {
		// 	return this.decode(value[props.type!])
		// },
		// validate() {
		// 	return true
		// },
		// filterIn(value) {
		// 	return typeof value === 'undefined'
		// },
		// filterOut(value) {
		// 	return typeof value === 'undefined'
		// },
		//
		//
		// walk() {
		// 	throw new TypeError('There is no more path to walk')
		// },
		...props,
		marshall(value) {
			if (!props.validateInput(value)) {
				throw new TypeError(
					`Invalid marshall payload provided. Expected ${props.type}. Received ${typeof value}`
				)
			}

			return props.marshall(value)
		},
		unmarshall(value) {
			if (typeof value !== 'object' || !props.validateOutput(value)) {
				throw new TypeError(
					`Invalid unmarshall payload provided. Expected ${props.type}. Received ${typeof value}`
				)
			}

			return props.unmarshall(value)
		},
	}
}
