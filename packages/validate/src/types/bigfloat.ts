
import { coerce, define, number, string, union, refine, Struct, object, bigint } from 'superstruct'
import { BigFloat, gt } from '@awsless/big-float'

export const bigfloat = ():Struct<BigFloat, null> => {
	const base = define<BigFloat>('bigfloat', (value) => {
		return (value instanceof BigFloat) || 'Invalid number'
	})

	const bigFloatLike = coerce(base, object({
		exponent: number(),
		coefficient: bigint(),
	}), (value) => {
		return new BigFloat(value)
	})

	return coerce(bigFloatLike, union([ string(), number() ]), (value): BigFloat | null => {
		if((typeof value === 'string' && value !== '') || typeof value === 'number') {
			if(!isNaN(Number(value))) {
				return new BigFloat(value)
			}
		}

		return null
	})
}

export const positive = <T extends BigFloat | number, S extends any>(struct:Struct<T, S>) => {
	const expected = `Expected a positive ${struct.type}`
	const ZERO = new BigFloat(0)

	return refine(struct, 'positive', (value:BigFloat | number) => {
		return gt(value, ZERO) || `${expected} but received '${value}'`
	})
}

export const precision = <T extends BigFloat | number, S extends any>(struct:Struct<T, S>, decimals:number) => {
	const expected = `Expected a ${struct.type}`

	return refine(struct, 'precision', (value:BigFloat | number) => {
		const big = new BigFloat(value.toString())
		return -big.exponent <= decimals || `${expected} with ${decimals} decimals`
	})
}
