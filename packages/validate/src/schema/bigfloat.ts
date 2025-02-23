import { BigFloat } from '@awsless/big-float'
import {
	BaseSchema,
	ErrorMessage,
	Pipe,
	bigint,
	custom,
	defaultArgs,
	instance,
	number,
	object,
	string,
	transform,
	union,
} from 'valibot'

const make = (value: any) => new BigFloat(value)

export type BigFloatSchema = BaseSchema<
	| string
	| number
	| BigFloat
	| {
			exponent: number
			coefficient: bigint
	  },
	BigFloat
>

export function bigfloat(pipe?: Pipe<BigFloat>): BigFloatSchema
export function bigfloat(error?: ErrorMessage, pipe?: Pipe<BigFloat>): BigFloatSchema
export function bigfloat(arg1?: ErrorMessage | Pipe<BigFloat>, arg2?: Pipe<BigFloat>): BigFloatSchema {
	const [msg, pipe] = defaultArgs(arg1, arg2)
	const error = msg ?? 'Invalid bigfloat'

	return union(
		[
			instance(BigFloat, pipe),
			transform(string([custom(input => input !== '' && !isNaN(Number(input)), error)]), make, pipe),
			transform(number(), make, pipe),
			transform(
				object({
					exponent: number(),
					coefficient: bigint(),
				}),
				make,
				pipe
			),
		],
		error
	)
}
