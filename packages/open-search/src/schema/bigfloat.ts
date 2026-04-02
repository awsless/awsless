import { BigFloat, Numeric, parse } from '@awsless/big-float'
import { Schema, SchemaProps } from './schema'

export const bigfloat = (props: SchemaProps = {}) =>
	new Schema<string, Numeric, BigFloat>(
		value => new BigFloat(value).toString(),
		value => parse(value),
		{ type: 'double', ...props }
	)
