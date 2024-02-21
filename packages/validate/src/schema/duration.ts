import { BaseSchema, ErrorMessage, Pipe, defaultArgs, regex, string, transform } from 'valibot'
import { Duration, DurationFormat, parse } from '@awsless/duration'

export type DurationSchema = BaseSchema<DurationFormat, Duration>

export function duration(pipe?: Pipe<Duration>): DurationSchema
export function duration(error?: ErrorMessage, pipe?: Pipe<Duration>): DurationSchema
export function duration(arg1?: ErrorMessage | Pipe<Duration>, arg2?: Pipe<Duration>): DurationSchema {
	const [msg, pipe] = defaultArgs(arg1, arg2)
	const error = msg ?? 'Invalid duration'

	return transform(
		string(error, [regex(/^[0-9]+ (milliseconds?|seconds?|minutes?|hours?|days?)/, error)]),
		value => {
			return parse(value as DurationFormat)
		},
		pipe
	) as DurationSchema
}
