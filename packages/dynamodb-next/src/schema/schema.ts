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
	name: string
	type?: A

	// validate(value: T): boolean

	validateInput(value: T): boolean
	validateOutput(value: AttributeOutput<A>): boolean

	// encode?(value: T): AttributeInputValue<A>
	// decode?(value: AttributeOutputValue<A>): T

	marshall(value: T, path: Array<string | number>): AttributeInput<A>
	unmarshall(value: AttributeOutput<A>, path: Array<string | number>): T

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

	readonly name: string
	readonly type?: A

	validateInput(value: T): boolean
	validateOutput(value: AttributeOutput<A>): boolean

	// encode(value: T): AttributeInputValue<A>
	// decode(value: AttributeOutputValue<A>): T

	marshall(value: T, path: Array<string | number>): AttributeInput<A>
	unmarshall(value: AttributeOutput<A>, path: Array<string | number>): T

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
		marshall(value, path) {
			if (!props.validateInput(value)) {
				throw new InvalidPayloadError('marshall', props, path, value)
			}

			return props.marshall(value, path)
		},
		unmarshall(value, path) {
			if (typeof value !== 'object' || !props.validateOutput(value)) {
				throw new InvalidPayloadError('unmarshall', props, path, value)
			}

			return props.unmarshall(value, path)
		},
	}
}

class InvalidPayloadError extends TypeError {
	constructor(type: string, schema: GenericSchema, path: Array<string | number>, value: unknown) {
		super(
			`Invalid ${type} payload provided for "${path.join('.')}". Expected ${schema.name}. Received ${typeof value}`
		)
	}
}
