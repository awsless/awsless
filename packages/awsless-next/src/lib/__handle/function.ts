import { Handler, lambda, LambdaFunction } from '@awsless/lambda'
import { GenericSchema } from '@awsless/validate'

export function func<H extends Handler>(handle: H): LambdaFunction<H>
export function func<S extends GenericSchema, H extends Handler<S>>(schema: S, handle: H): LambdaFunction<H, S>
export function func(arg1: any, arg2?: any) {
	const [schema, handle] = arg2 ? [arg1, arg2] : [undefined, arg1]

	return lambda({
		schema,
		handle,
		throwExpectedErrors: !!process.env.THROW_EXPECTED_ERRORS,
	})
}
