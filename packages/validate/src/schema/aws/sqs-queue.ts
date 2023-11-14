import { BaseSchema, Input, Output, UnknownSchema, array, object, transform, union, unknown } from 'valibot'
import { json } from '../json'

export type SqsQueueSchema<S extends BaseSchema = UnknownSchema> = BaseSchema<
	Input<S> | Input<S>[] | { Records: { body: string | Input<S> }[] },
	Output<S>[]
>

export const sqsQueue = <S extends BaseSchema = UnknownSchema>(body?: S): SqsQueueSchema<S> => {
	const schema = body ?? unknown()
	return union(
		[
			transform(schema, input => [input]),
			array(schema),
			transform(
				object({
					Records: array(
						object({
							body: json(schema),
						})
					),
				}),
				input =>
					input.Records.map(record => {
						return (record as { body: unknown }).body
					})
			),
		],
		'Invalid SQS Queue input'
	)
}

// const n1 = sqsQueue()
// const n2 = sqsQueue(object({ foo: string() }))

// type N1_I = Input<typeof n1>
// type N1_O = Output<typeof n1>

// type N2_I = Input<typeof n2>
// type N2_O = Output<typeof n2>

// const lol1 = json(number())
// const lol2 = parse(lol1, '')
