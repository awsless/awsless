import { Handler, lambda, Loggers } from '@awsless/lambda'
import { BaseSchema } from '@awsless/validate'

export type FunctionProps<H extends Handler<S>, S extends BaseSchema> = {
	handle: H
	schema?: S
	logger?: Loggers
	logViewableErrors?: boolean
}

export const func = <H extends Handler<S>, S extends BaseSchema>(props: FunctionProps<H, S>) => {
	return lambda(props)
}
