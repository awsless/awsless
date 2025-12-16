import { Handler, Loggers, lambda } from '@awsless/lambda'
import { BaseSchema } from '@awsless/validate'

export type GraphqlProps<H extends Handler<S>, S extends BaseSchema> = {
	handle: H
	schema?: S
	logger?: Loggers
}

export const graphql = <H extends Handler<S>, S extends BaseSchema>(props: GraphqlProps<H, S>) => {
	return lambda({
		logger: props.logger,
		schema: schema(props.schema),
		handle: props.handle,
	})
}

const schema = <S extends BaseSchema>(s?: S) => {
	return s
}
