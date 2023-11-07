import { ErrorMessage, Pipe, getDefaultArgs, date as base, string, union, transform, BaseSchema } from 'valibot'

export type DateSchema = BaseSchema<string | Date, Date>

export function date(pipe?: Pipe<Date>): DateSchema
export function date(error?: ErrorMessage, pipe?: Pipe<Date>): DateSchema
export function date(arg1?: ErrorMessage | Pipe<Date>, arg2?: Pipe<Date>): DateSchema {
	const [error, pipe] = getDefaultArgs(arg1, arg2)

	return union(
		[
			base(pipe),
			transform(
				string(),
				input => {
					return new Date(input)
				},
				base(pipe)
			),
		],
		error ?? 'Invalid date'
	)
}
