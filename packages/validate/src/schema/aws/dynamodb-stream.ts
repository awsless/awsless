import { AnyTable, PrimaryKey } from '@awsless/dynamodb'
import { array, BaseSchema, literal, object, optional, transform, union, unknown } from 'valibot'

type EventName = 'MODIFY' | 'INSERT' | 'REMOVE'

export type DynamoDBStreamSchema<T extends AnyTable> = BaseSchema<
	{
		Records: {
			eventName: EventName
			dynamodb: {
				Keys: unknown
				OldImage?: unknown
				NewImage?: unknown
			}
		}[]
	},
	{
		event: Lowercase<EventName>
		keys: PrimaryKey<T>
		old?: T['schema']['OUTPUT']
		new?: T['schema']['OUTPUT']
	}[]
>

export const dynamoDbStream = <T extends AnyTable>(table: T) => {
	const marshall = () => transform(unknown(), value => table.unmarshall(value))

	return transform(
		object(
			{
				Records: array(
					object({
						// For some reason picklist fails to build.
						// eventName: picklist(['MODIFY', 'INSERT', 'REMOVE']),
						eventName: union([literal('MODIFY'), literal('INSERT'), literal('REMOVE')]),
						dynamodb: object({
							Keys: marshall(),
							OldImage: optional(marshall()),
							NewImage: optional(marshall()),
						}),
					})
				),
			},
			'Invalid DynamoDB Stream input'
		),
		input => {
			return input.Records.map(record => {
				const item = record as unknown as {
					dynamodb: {
						Keys: PrimaryKey<T>
						OldImage: T['schema']['OUTPUT']
						NewImage: T['schema']['OUTPUT']
					}
				}
				return {
					event: record.eventName.toLowerCase(),
					keys: item.dynamodb.Keys,
					old: item.dynamodb.OldImage,
					new: item.dynamodb.NewImage,
				}
			})
		}
	) as DynamoDBStreamSchema<T>
}
