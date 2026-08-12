import { BaseSchema, SnsTopicSchema, snsTopic } from '@awsless/validate'
import { Handler, Loggers, lambda } from '@awsless/lambda'

export type TopicProps<H extends Handler<S>, S extends BaseSchema> = {
	handle: H
	schema?: S
	logger?: Loggers
}

export const topic = <H extends Handler<SnsTopicSchema<S>>, S extends BaseSchema>(props: TopicProps<H, S>) => {
	return lambda({
		logger: props.logger,
		schema: snsTopic(props.schema),
		handle: props.handle,
		logViewableErrors: true,
	})
}
