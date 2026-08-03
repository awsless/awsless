import { Handler, lambda, LambdaContext, LambdaFunction } from '@awsless/lambda'
import { GenericSchema } from '@awsless/validate'
import { consumer } from './util.js'

type HandlerContext = Parameters<Handler>[1]

// Handlers that take no event (or an optional one) are callable
// without arguments - only a required typed event stays required.
type SchemalessEntry<E, R> = [unknown] extends [E]
	? (event?: E, context?: LambdaContext) => Promise<Awaited<R>>
	: undefined extends E
		? (event?: E, context?: LambdaContext) => Promise<Awaited<R>>
		: (event: E, context?: LambdaContext) => Promise<Awaited<R>>

export function func<E, R>(handle: (event: E, context: HandlerContext) => R): SchemalessEntry<E, R>
export function func<S extends GenericSchema, H extends Handler<S>>(schema: S, handle: H): LambdaFunction<H, S>
export function func(arg1: GenericSchema | Handler, arg2?: Handler<GenericSchema>) {
	const schema = arg2 ? (arg1 as GenericSchema) : undefined
	const handle = (arg2 ?? arg1) as Handler<GenericSchema | undefined>

	return lambda({
		schema,
		handle,
		throwExpectedErrors: !!process.env.THROW_EXPECTED_ERRORS,
	})
}

export function task<E, R>(handle: (event: E, context: HandlerContext) => R): SchemalessEntry<E, R>
export function task<S extends GenericSchema, H extends Handler<S>>(schema: S, handle: H): LambdaFunction<H, S>
export function task(arg1: GenericSchema | Handler, arg2?: Handler<GenericSchema>) {
	const schema = arg2 ? (arg1 as GenericSchema) : undefined
	const handle = (arg2 ?? arg1) as Handler<GenericSchema | undefined>

	return consumer(schema, handle)
}

export const cron = <E, R>(handle: (event: E, context: HandlerContext) => R): SchemalessEntry<E, R> => {
	return consumer(undefined, handle as unknown as Handler) as SchemalessEntry<E, R>
}
