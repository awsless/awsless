import { Handler } from '@awsless/lambda'
import { GenericSchema, InferOutput, SqsQueueSchema, sqsQueue } from '@awsless/validate'
import { consumer } from './util.js'

/** The array of parsed message bodies a queue handler receives. */
export type QueueEvent<S extends GenericSchema> = InferOutput<SqsQueueSchema<S>>

// The handler receives the array of parsed message bodies.
export const queue = <S extends GenericSchema, H extends Handler<SqsQueueSchema<S>>>(schema: S, handle: H) => {
	return consumer(sqsQueue(schema), handle)
}
