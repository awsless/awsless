import { Duration, DurationFormat } from '@awsless/duration'
import { BaseSchema, ErrorMessage, Pipe, defaultArgs, instance } from 'valibot'

export type DurationSchema = BaseSchema<DurationFormat | Duration, Duration>

export function duration(pipe?: Pipe<Duration>): DurationSchema
export function duration(error?: ErrorMessage, pipe?: Pipe<Duration>): DurationSchema
export function duration(arg1?: ErrorMessage | Pipe<Duration>, arg2?: Pipe<Duration>): DurationSchema {
	const [msg, pipe] = defaultArgs(arg1, arg2)
	const error = msg ?? 'Invalid duration'

	return instance(Duration, error, pipe)

	// return union([
	// 	instance(Duration, pipe),
	// 	transform(
	// 		string(error, [regex(/^[0-9]+ (milliseconds?|seconds?|minutes?|hours?|days?|weeks?)/, error)]),
	// 		value => {
	// 			return parse(value as DurationFormat)
	// 		},
	// 		pipe
	// 	) as BaseSchema<DurationFormat, Duration>,
	// ])
}
