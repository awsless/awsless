import { AnyTable } from '@awsless/dynamodb'
import { Handler } from '@awsless/lambda'
import { DynamoDBStreamSchema, dynamoDbStream, InferOutput } from '@awsless/validate'
import { consumer } from './util.js'

// The array of parsed change records a stream handler receives.
export type StreamEvent<T extends AnyTable> = InferOutput<DynamoDBStreamSchema<T>>

export const stream = <T extends AnyTable, H extends Handler<DynamoDBStreamSchema<T>>>(table: T, handle: H) => {
	return consumer(dynamoDbStream(table), handle)
}
