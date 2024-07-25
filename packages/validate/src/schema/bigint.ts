import { BaseSchema, bigint as base, defaultArgs, ErrorMessage, Pipe, string, transform, union } from 'valibot'

export type BigIntSchema = BaseSchema<string | bigint, bigint>

export function bigint(pipe?: Pipe<bigint>): BigIntSchema
export function bigint(error?: ErrorMessage, pipe?: Pipe<bigint>): BigIntSchema
export function bigint(arg1?: ErrorMessage | Pipe<bigint>, arg2?: Pipe<bigint>): BigIntSchema {
	const [error, pipe] = defaultArgs(arg1, arg2)

	return union(
		[
			base(pipe),
			transform(
				string(),
				input => {
					return BigInt(input)
				},
				base(pipe)
			),
		],
		error ?? 'Invalid BigInt'
	)
}
