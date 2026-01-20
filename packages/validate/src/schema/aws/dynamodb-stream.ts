import { AnyTable, Infer, PrimaryKey } from '@awsless/dynamodb'
import { array, BaseSchema, literal, object, transform, unknown, variant } from 'valibot'

export type DynamoDBStreamSchema<T extends AnyTable> = BaseSchema<
	{
		Records: Array<
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
		>
	},
	Array<
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
	>
>

export const dynamoDbStream = <T extends AnyTable>(table: T) => {
	const unmarshall = () => transform(unknown(), value => table.unmarshall(value))

	return transform(
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
			'Invalid DynamoDB Stream input'
		),
		input => {
			return input.Records.map(record => {
				const item: Record<string, any> = {
					event: record.eventName.toLowerCase(),
					keys: record.dynamodb.Keys as PrimaryKey<T>,
				}

				if ('OldImage' in record.dynamodb) {
					item.old = record.dynamodb.OldImage
				}

				if ('NewImage' in record.dynamodb) {
					item.new = record.dynamodb.NewImage
				}

				return item
			})
		}
	) as DynamoDBStreamSchema<T>
}
