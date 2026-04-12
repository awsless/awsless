import { Handler, lambda } from '@awsless/lambda'
import { GenericSchema, snsTopic, SnsTopicSchema } from '@awsless/validate'

export const topic = <S extends GenericSchema, H extends Handler<SnsTopicSchema<S>>>(schema: S, handle: H) => {
	return lambda({
		handle,
		schema: snsTopic(schema),
		throwExpectedErrors: true,
	})
}
