import { Handler, lambda, Loggers } from '@awsless/lambda'
import { BaseSchema, sqsQueue, SqsQueueSchema } from '@awsless/validate'

export type QueueProps<H extends Handler<S>, S extends BaseSchema> = {
	handle: H
	schema?: S
	logger?: Loggers
}

export const queue = <H extends Handler<SqsQueueSchema<S>>, S extends BaseSchema>(props: QueueProps<H, S>) => {
	return lambda({
		logger: props.logger,
		schema: sqsQueue(props.schema),
		handle: props.handle,
		logViewableErrors: true,
	})
}

// queue({
// 	schema: number(),
// 	handle(input) {

// 	}
// })
