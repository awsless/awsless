import { BigFloat, Numeric } from '@awsless/big-float'
import { Schema } from './schema'

export const bigfloat = () =>
	new Schema<'N', Numeric, BigFloat>(
		'N',
		value => ({ N: new BigFloat(value).toString() }),
		value => new BigFloat(value.N)
	)
