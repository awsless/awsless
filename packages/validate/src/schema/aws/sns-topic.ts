import { BaseSchema, Input, Output, UnknownSchema, array, object, transform, union, unknown } from 'valibot'
import { json } from '../json'

export type SnsTopicSchema<S extends BaseSchema = UnknownSchema> = BaseSchema<
	Input<S> | Input<S>[] | { Records: { Sns: { Message: string | Input<S> } }[] },
	Output<S>[]
>

export const snsTopic = <S extends BaseSchema = UnknownSchema>(body?: S): SnsTopicSchema<S> => {
	const schema = body ?? unknown()
	return union(
		[
			transform(schema, input => [input]),
			array(schema),
			transform(
				object({
					Records: array(
						object({
							Sns: object({
								Message: json(schema),
							}),
						})
					),
				}),
				input =>
					input.Records.map(record => {
						return (
							record as {
								Sns: {
									Message: unknown
								}
							}
						).Sns.Message
					})
			),
		],
		'Invalid SNS Topic input'
	)
}
