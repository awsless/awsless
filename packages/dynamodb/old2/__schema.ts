import { BigFloat, Numeric } from "@awsless/big-float"
import { AnyType, InferSchemaInput, InferSchemaMarshalled, InferSchemaOutput, InferTypeInput, InferTypeMarshalled, Schema, Type } from "./__types"

export const optional = <T extends AnyType>(type:T):T & { optional: true } => ({
	...type,
	optional: true
})

export const boolean = (): Type<'BOOL', boolean, boolean, boolean> => ({
	marshall: (value) => ({ BOOL: value }),
	unmarshall: (value) => value.BOOL
})

type BinaryValue = ArrayBuffer | Blob | Buffer | DataView | File | Int8Array | Uint8Array | Uint8ClampedArray | Int16Array | Uint16Array | Int32Array | Uint32Array | Float32Array | Float64Array | BigInt64Array | BigUint64Array

export const binary = <T extends BinaryValue>(): Type<'B', T, T, T> => ({
	marshall: (value) => ({ B: value }),
	unmarshall: (value) => value.B
})

export const string = (): Type<'S', string, string, string> => ({
	marshall: (value) => ({ S: String(value) }),
	unmarshall: (value) => value.S
})

export const number = (): Type<'N', string, number, number> => ({
	marshall: (value) => ({ N: value.toString() }),
	unmarshall: (value) => Number(value.N)
})

export const bigint = (): Type<'N', string, bigint, bigint> => ({
	marshall: (value) => ({ N: value.toString() }),
	unmarshall: (value) => BigInt(value.N)
})

export const bigfloat = (): Type<'N', string, Numeric, BigFloat> => ({
	marshall: (value) => ({ N: new BigFloat(value).toString() }),
	unmarshall: (value) => new BigFloat(value.N)
})

export const binarySet = <T extends BinaryValue>(): Type<'BS', T[], Set<T>, Set<T>> => ({
	marshall: (value) => ({ BS: Array.from(value) }),
	unmarshall: (value) => new Set(value.BS)
})

export const stringSet = (): Type<'SS', string[], Set<string>, Set<string>> => ({
	marshall: (value) => ({ SS: Array.from(value) }),
	unmarshall: (value) => new Set(value.SS)
})

export const numberSet = (): Type<'NS', string[], Set<number>, Set<number>> => ({
	marshall: (value) => ({ NS: Array.from(value).map(item => item.toString()) }),
	unmarshall: (value) => new Set(value.NS.map(item => Number(item)))
})

export const bigintSet = (): Type<'NS', string[], Set<bigint>, Set<bigint>> => ({
	marshall: (value) => ({ NS: Array.from(value).map(item => item.toString()) }),
	unmarshall: (value) => new Set(value.NS.map(item => BigInt(item)))
})

export const bigfloatSet = (): Type<'NS', string[], Set<Numeric>, Set<BigFloat>> => ({
	marshall: (value) => ({ NS: Array.from(value).map(item => String(item)) }),
	unmarshall: (value) => new Set(value.NS.map(item => new BigFloat(item)))
})

export const array = <I extends AnyType>(type: I): Type<'L', InferTypeMarshalled<I>[], InferTypeInput<I>[], InferTypeInput<I>[]> => ({
	marshall(unmarshalled) {
		return {
			L: unmarshalled.map(item => type.marshall(item)) as InferTypeMarshalled<I>[]
		}
	},
	unmarshall(marshalled) {
		return marshalled.L.map(item => type.unmarshall(item))
	}
})

export const object = <S extends Schema>(schema: S): Type<'M', InferSchemaMarshalled<S>, InferSchemaInput<S>, InferSchemaOutput<S>> => ({
	marshall(unmarshalled:Record<string, unknown>) {
		const marshalled:Record<string, unknown> = {}
		for(const [ key, type ] of Object.entries(schema)) {
			const value = unmarshalled[key]

			if(type.optional && typeof value === 'undefined') {
				continue
			}

			marshalled[key] = type.marshall(value)
		}

		return {
			M: marshalled as InferSchemaMarshalled<S>
		}
	},
	unmarshall(marshalled) {
		const unmarshalled:Record<string, unknown> = {}
		for(const [ key, type ] of Object.entries(schema)) {
			const value = (marshalled.M as Record<string, Record<string, any>>)[key]

			if(type.optional && typeof value === 'undefined') {
				continue
			}

			unmarshalled[key] = type.unmarshall(value)
		}

		return unmarshalled as InferSchemaOutput<S>
	}
})
