import { AnyTable, Infer, PrimaryKey } from '@awsless/dynamodb'
import {
	array,
	BaseSchema,
	ErrorMessage,
	GenericIssue,
	literal,
	object,
	pipe,
	transform,
	unknown,
	variant,
} from 'valibot'

type DynamoDBStreamInputRecord =
	| {
			eventName: 'MODIFY'
			dynamodb: {
				Keys: unknown
				OldImage: unknown
				NewImage: unknown
			}
	  }
	| {
			eventName: 'INSERT'
			dynamodb: {
				Keys: unknown
				NewImage: unknown
			}
	  }
	| {
			eventName: 'REMOVE'
			dynamodb: {
				Keys: unknown
				OldImage: unknown
			}
	  }

type DynamoDBStreamOutputRecord<T extends AnyTable> =
	| {
			event: 'modify'
			keys: PrimaryKey<T>
			old: Infer<T>
			new: Infer<T>
	  }
	| {
			event: 'insert'
			keys: PrimaryKey<T>
			new: Infer<T>
	  }
	| {
			event: 'remove'
			keys: PrimaryKey<T>
			old: Infer<T>
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
	const unmarshall = () =>
		pipe(
			unknown(),
			transform(v => table.unmarshall(v))
		)

	return pipe(
		object(
			{
				Records: array(
					variant('eventName', [
						object({
							eventName: literal('MODIFY'),
							dynamodb: object({
								Keys: unmarshall(),
								OldImage: unmarshall(),
								NewImage: unmarshall(),
							}),
						}),
						object({
							eventName: literal('INSERT'),
							dynamodb: object({
								Keys: unmarshall(),
								NewImage: unmarshall(),
							}),
						}),
						object({
							eventName: literal('REMOVE'),
							dynamodb: object({
								Keys: unmarshall(),
								OldImage: unmarshall(),
							}),
						}),
					])
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
