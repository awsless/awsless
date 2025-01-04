import { BigFloat } from '@awsless/big-float'
import { Serializable } from '..'

export const $bigfloat: Serializable<BigFloat, string> = {
	is: v => v instanceof BigFloat,
	parse: v => new BigFloat(v),
	stringify: v => v.toString(),
}
