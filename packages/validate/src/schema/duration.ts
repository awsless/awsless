import { Duration } from '@awsless/duration'
import { BaseSchema, ErrorMessage, GenericIssue, instance } from 'valibot'

export type DurationSchema = BaseSchema<Duration, Duration, GenericIssue>

export function duration(message: ErrorMessage<GenericIssue> = 'Invalid duration'): DurationSchema {
	return instance(Duration, message)
}
