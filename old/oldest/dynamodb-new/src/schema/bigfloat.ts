import { BigFloat, Numeric } from '@awsless/big-float'
import { createSchema } from './schema'

export const bigfloat = () =>
	createSchema<'N', Numeric, BigFloat>({
		type: 'N',
		encode: value => new BigFloat(value).toString(),
		decode: value => new BigFloat(value),
	})
