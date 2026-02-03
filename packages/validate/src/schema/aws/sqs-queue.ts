import {
	BaseSchema,
	ErrorMessage,
	GenericIssue,
	GenericSchema,
	InferInput,
	InferOutput,
	array,
	object,
	pipe,
	transform,
	union,
} from 'valibot'
import { json } from '../json'

export type SqsQueueSchema<S extends GenericSchema> = BaseSchema<
	InferInput<S> | InferInput<S>[] | { Records: { body: string | InferInput<S> }[] },
	InferOutput<S>[],
	GenericIssue
>

export const sqsQueue = <S extends GenericSchema>(
	schema: S,
	message: ErrorMessage<GenericIssue> = 'Invalid SQS Queue payload'
): SqsQueueSchema<S> => {
	return union(
		[
			// Prioritize the expected payload during production
			pipe(
				object({
					Records: array(
						object({
							body: json(schema),
						})
					),
				}),
				transform(v => v.Records.map(r => r.body))
			),
			// These are allowed during testing
			pipe(
				schema,
				transform(v => [v])
			),
			array(schema),
		],
		message
	)
}
