import { Handler, lambda } from '@awsless/lambda'
import { GenericSchema, sqsQueue, SqsQueueSchema } from '@awsless/validate'

export const queue = <S extends GenericSchema, H extends Handler<SqsQueueSchema<S>>>(schema: S, handle: H) => {
	return lambda({
		handle,
		schema: sqsQueue(schema),
		throwExpectedErrors: true,
	})
}
