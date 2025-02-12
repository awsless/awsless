import { BigFloat, Numeric } from '@awsless/big-float'
import { Schema, SchemaProps } from './schema'

export const bigfloat = (props: SchemaProps = {}) =>
	new Schema<string, Numeric, BigFloat>(
		value => new BigFloat(value).toString(),
		value => new BigFloat(value),
		{ type: 'double', ...props }
	)
