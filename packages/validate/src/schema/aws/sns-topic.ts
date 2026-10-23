import {
	BaseSchema,
	ErrorMessage,
	GenericIssue,
	GenericSchema,
	InferInput,
	InferOutput,
	length,
	object,
	pipe,
	transform,
	tuple,
	union,
} from 'valibot'
import { json } from '../json'

export type SnsTopicSchema<S extends GenericSchema> = BaseSchema<
	InferInput<S> | { Records: { Sns: { Message: string } }[] },
	InferOutput<S>,
	GenericIssue
>

export const snsTopic = <S extends GenericSchema>(
	schema: S,
	message: ErrorMessage<GenericIssue> = 'Invalid SNS Topic payload'
): SnsTopicSchema<S> => {
	return union(
		[
			// SNS always delivers exactly one record per invocation.
			pipe(
				object({
					Records: pipe(
						tuple([
							object({
								Sns: object({
									Message: json(schema),
								}),
							}),
						]),
						length(1)
					),
				}),
				transform(v => v.Records[0].Sns.Message)
			),
			// The plain payload is allowed during testing
			schema,
		],
		message
	)
}
