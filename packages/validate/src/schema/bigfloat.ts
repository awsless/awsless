import { BigFloat } from '@awsless/big-float'
import {
	BaseSchema,
	ErrorMessage,
	Pipe,
	bigint,
	getDefaultArgs,
	instance,
	number,
	object,
	string,
	transform,
	union,
	getPipeIssues,
	getOutput,
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
	const [msg, pipe] = getDefaultArgs(arg1, arg2)
	const error = msg ?? 'Invalid bigfloat'

	return union(
		[
			instance(BigFloat, pipe),
			transform(
				string([
					input => {
						if (input === '' || isNaN(Number(input))) {
							return getPipeIssues('bigfloat', error, input)
						}

						return getOutput(input)
					},
				]),
				make,
				pipe
			),
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
