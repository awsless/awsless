
import { coerce, define, number, string, union, refine, Struct } from 'superstruct'
import { BigFloat, gt } from '@awsless/big-float'

export const bigfloat = ():Struct<BigFloat, null> => {
	const base = define<BigFloat>('bigfloat', (value) => {
		return (value instanceof BigFloat) || 'Invalid number'
	})

	return coerce(base, union([ string(), number() ]), (value): BigFloat | null => {
		if((typeof value === 'string' && value !== '') || typeof value === 'number') {
			if(!isNaN(Number(value))) {
				return new BigFloat(value)
			}
		}

		return null
	})
}

export const positive = <T extends BigFloat, S extends any>(struct:Struct<T, S>) => {
	const expected = `Expected a positive ${struct.type}`
	const zero = new BigFloat(0)

	return refine(struct, 'positive', (value:BigFloat) => {
		return gt(value, zero) || `${expected} but received '${value}'`
	})
}

export const precision = <T extends BigFloat, S extends any>(struct:Struct<T, S>, decimals:number) => {
	const expected = `Expected a ${struct.type}`

	return refine(struct, 'precision', (value:BigFloat) => {
		return -value.exponent <= decimals || `${expected} with ${decimals} decimals`
	})
}
