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

export type SnsTopicSchema<S extends GenericSchema> = BaseSchema<
	InferInput<S> | InferInput<S>[] | { Records: { Sns: { Message: string | InferInput<S> } }[] },
	InferOutput<S>[],
	GenericIssue
>

export const snsTopic = <S extends GenericSchema>(
	schema: S,
	message: ErrorMessage<GenericIssue> = 'Invalid SNS Topic payload'
): SnsTopicSchema<S> => {
	return union(
		[
			// Prioritize the expected payload during production
			pipe(
				object({
					Records: array(
						object({
							Sns: object({
								Message: json(schema),
							}),
						})
					),
				}),
				transform(v => v.Records.map(r => r.Sns.Message))
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
