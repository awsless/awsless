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
	string,
	unknown,
} from 'valibot'
import { redact } from '../../action/redact.js'

type DynamoDBStreamInputRecord = {
	eventName: 'INSERT' | 'MODIFY' | 'REMOVE'
	dynamodb: {
		Keys: unknown
		OldImage?: unknown
		NewImage?: unknown
		SequenceNumber?: string
	}
}

type DynamoDBStreamOutputRecord<T extends AnyTable> = {
	/** The kind of change that produced this record. */
	event: 'insert' | 'modify' | 'remove'

	/** The primary key of the affected item. */
	keys: PrimaryKey<T>

	/** The item before the change, when the stream captures old images. */
	old?: Infer<T>

	/** The item after the change, when the stream captures new images. */
	new?: Infer<T>

	/**
	 * The record's place in its shard. A handler names the records that failed
	 * by it, returning `{ batchItemFailures: [{ itemIdentifier: sequenceNumber }] }`,
	 * so the stream retries from the first of them instead of the whole batch.
	 * Only set on records that came from a stream.
	 */
	sequenceNumber?: string
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

	// A whole item can hold anything personal, so a logged record shows its
	// keys only.
	const unmarshall = () =>
		pipe(
			unknown(),
			redact(),
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
							SequenceNumber: optional(string()),
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

				if (record.dynamodb.SequenceNumber !== undefined) {
					item.sequenceNumber = record.dynamodb.SequenceNumber
				}

				return item as DynamoDBStreamOutputRecord<T>
			})
		})
	)
}
