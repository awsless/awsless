import { BigFloat, floor, parse, PRECISION } from '@awsless/big-float'
import { NumberExpression } from '../expression/types'
import { BaseSchema, createSchema } from './schema'

export type BigFloatSchema = BaseSchema<
	//
	'N',
	BigFloat,
	NumberExpression<BigFloat>
>

// export const bigfloat = (): BigFloatSchema =>
// 	createSchema({
// 		type: 'N',
// 		encode: value => value.toString(),
// 		decode: value => parse(value),
// 		validate: value => value instanceof BigFloat,
// 	})

export const bigfloat = ({ precision = PRECISION } = {}): BigFloatSchema =>
	createSchema({
		name: 'bigfloat',
		type: 'N',
		marshall: value => ({ N: floor(value, precision).toString() }),
		unmarshall: value => parse(value.N),
		// validate: value => value instanceof BigFloat,
		validateInput: value => value instanceof BigFloat,
		validateOutput: value => !!(typeof value === 'object' && 'N' in value && typeof value.N === 'string'),
	})
