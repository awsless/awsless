import { BigFloat, parse } from '@awsless/big-float'
import {
	BaseSchema,
	ErrorMessage,
	GenericIssue,
	bigint,
	decimal,
	instance,
	number,
	pipe,
	string,
	transform,
	union,
} from 'valibot'

export type BigFloatSchema = BaseSchema<BigFloat | string | bigint | number, BigFloat, GenericIssue>

export function bigfloat(message: ErrorMessage<GenericIssue> = 'Invalid bigfloat'): BigFloatSchema {
	return union(
		[
			instance(BigFloat),
			pipe(
				string(),
				decimal(),
				transform(v => parse(v))
			),
			pipe(
				bigint(),
				transform(v => parse(v))
			),
			pipe(
				number(),
				transform(v => parse(v))
			),
		],
		message
	)
}
