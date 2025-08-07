import { BigFloat } from '@awsless/big-float'
import { NumberExpression } from '../expression/types'
import { BaseSchema, createSchema } from './schema'

export type BigFloatSchema = BaseSchema<
	//
	'N',
	BigFloat,
	NumberExpression<BigFloat>
>

export const bigfloat = (): BigFloatSchema =>
	createSchema({
		type: 'N',
		encode: value => value.toString(),
		decode: value => new BigFloat(value),
	})
