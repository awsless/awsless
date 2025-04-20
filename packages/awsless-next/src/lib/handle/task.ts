import { Handler, lambda, LambdaFunction, Loggers } from '@awsless/lambda'
import { BaseSchema } from '@awsless/validate'

export type TaskProps<H extends Handler<S>, S extends BaseSchema> = {
	handle: H
	schema?: S
	logger?: Loggers
}

export const task = <H extends Handler<S>, S extends BaseSchema>(props: TaskProps<H, S>): LambdaFunction<H, S> => {
	return lambda({
		...props,
		logViewableErrors: true,
	})
}
