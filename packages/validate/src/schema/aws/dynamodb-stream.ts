import { AnyTable, Infer, PrimaryKey } from '@awsless/dynamodb'
import {
	array,
	BaseSchema,
	ErrorMessage,
	GenericIssue,
	object,
	optional,
	picklist,
	pipe,
	transform,
	unknown,
} from 'valibot'

type DynamoDBStreamInputRecord = {
	eventName: 'INSERT' | 'MODIFY' | 'REMOVE'
	dynamodb: {
		Keys: unknown
		OldImage?: unknown
		NewImage?: unknown
	}
}

type DynamoDBStreamOutputRecord<T extends AnyTable> = {
	event: 'insert' | 'modify' | 'remove'
	keys: PrimaryKey<T>
	old?: Infer<T>
	new?: Infer<T>
}

export type DynamoDBStreamSchema<T extends AnyTable> = BaseSchema<
	{ Records: DynamoDBStreamInputRecord[] },
	DynamoDBStreamOutputRecord<T>[],
	GenericIssue
>

export const dynamoDbStream = <T extends AnyTable>(
	table: T,
	message: ErrorMessage<GenericIssue> = 'Invalid DynamoDB Stream payload'
): DynamoDBStreamSchema<T> => {
	const unmarshallKeys = () =>
		pipe(
			unknown(),
			transform(v => table.unmarshall(v, table.keys))
		)

	const unmarshall = () =>
		pipe(
			unknown(),
			transform(v => table.unmarshall(v))
		)

	return pipe(
		object(
			{
				Records: array(
					object({
						eventName: picklist(['MODIFY', 'INSERT', 'REMOVE']),
						dynamodb: object({
							Keys: unmarshallKeys(),
							OldImage: optional(unmarshall()),
							NewImage: optional(unmarshall()),
						}),
					})
				),
			},
			message
		),
		transform(input => {
			return input.Records.map(record => {
				const item: Record<string, any> = {
					event: record.eventName.toLowerCase(),
					keys: record.dynamodb.Keys,
				}

				if ('OldImage' in record.dynamodb) {
					item.old = record.dynamodb.OldImage
				}

				if ('NewImage' in record.dynamodb) {
					item.new = record.dynamodb.NewImage
				}

				return item as DynamoDBStreamOutputRecord<T>
			})
		})
	)
}
