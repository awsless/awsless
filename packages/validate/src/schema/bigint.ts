import { BaseSchema, bigint as base, defaultArgs, ErrorMessage, Pipe, regex, string, transform, union } from 'valibot'

export type BigIntSchema = BaseSchema<string | bigint, bigint>

export function bigint(pipe?: Pipe<bigint>): BigIntSchema
export function bigint(error?: ErrorMessage, pipe?: Pipe<bigint>): BigIntSchema
export function bigint(arg1?: ErrorMessage | Pipe<bigint>, arg2?: Pipe<bigint>): BigIntSchema {
	const [error, pipe] = defaultArgs(arg1, arg2)

	return union(
		[
			base(pipe),
			transform(
				string([regex(/^-?[0-9]+$/)]),
				input => {
					return BigInt(input)
				},
				base(pipe)
			),
		],
		error ?? 'Invalid BigInt'
	)
}
