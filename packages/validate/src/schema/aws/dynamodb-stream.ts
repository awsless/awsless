import { BaseSchema, array, object, optional, picklist, transform, unknown } from 'valibot'
import { PrimaryKey, TableDefinition } from '@awsless/dynamodb'

export type EventName = 'MODIFY' | 'INSERT' | 'REMOVE'
export type DynamoDBStreamSchema<T extends TableDefinition<any, any, any, any>> = BaseSchema<
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

export const dynamoDbStream = <T extends TableDefinition<any, any, any, any>>(table: T) => {
	const marshall = () => transform(unknown(), value => table.unmarshall(value))

	return transform(
		object(
			{
				Records: array(
					object({
						eventName: picklist(['MODIFY', 'INSERT', 'REMOVE']),
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
