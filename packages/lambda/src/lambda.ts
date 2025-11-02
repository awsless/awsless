import { parse, patch, stringify, unpatch } from '@awsless/json'
import { parse as valiParse } from '@awsless/validate'
import { Context } from 'aws-lambda'
// import { Jsonify } from 'type-fest'
import { eventContext } from './context/lambda-context.js'
import { createTimeoutWrap } from './errors/timeout.js'
import { transformValidationErrors } from './errors/validation.js'
// import { toViewableErrorResponse, ViewableError } from './errors/viewable.js'
import { ExpectedError } from './errors/expected.js'
import { toErrorResponse } from './errors/response.js'
import { ViewableError } from './errors/viewable.js'
import { normalizeError } from './helpers/error.js'
import { getWarmUpEvent, warmUp } from './helpers/warm-up.js'
import { Context as ExtendedContext, Handler, Input, Logger, Loggers, Output, Schema } from './type.js'

interface Options<H extends Handler<S>, S extends Schema = undefined> {
	/** A validation struct to validate the input. */
	schema?: S

	/** Array of middleware functions. */
	handle: H

	/** Array of logging functions that are called when an error is thrown. */
	logger?: Loggers

	/** Boolean to specify if viewable errors should be logged.
	 * @default false
	 */
	logViewableErrors?: boolean
}

export type LambdaFactory = {
	<H extends Handler>(
		options: Options<H, undefined>
	): (event?: unknown, context?: Context) => Promise<Awaited<ReturnType<H>>>
	<H extends Handler<S>, S extends Schema>(
		options: Options<H, S>
	): (event: Input<S>, context?: Context) => Promise<Awaited<ReturnType<H>>>
}

// type Response<T> = Promise<Awaited<ReturnType<T>>>

// type Response<T> = unknown extends T
// 	? unknown
// 	: void extends T
// 		? void
// 		: T extends undefined
// 			? Jsonify<T> | undefined
// 			: Jsonify<T>

export type LambdaFunction<H extends Handler<S>, S extends Schema = undefined> = S extends undefined
	? (event?: unknown, context?: Context) => Promise<Awaited<ReturnType<H>>>
	: (event: Input<S>, context?: Context) => Promise<Awaited<ReturnType<H>>>

/** Create a lambda handle function. */
export const lambda: LambdaFactory = <H extends Handler<S>, S extends Schema = undefined>(
	options: Options<H, S>
): LambdaFunction<H, S> => {
	return (async (event?: unknown, context?: Context) => {
		const log = async (maybeError: unknown) => {
			const error = normalizeError(maybeError)
			const list = [options.logger].flat(10) as Array<Logger | undefined>

			await Promise.all(
				list.map(logger => {
					return logger?.(error, {
						input: event,
					})
				})
			)
		}

		const isTestEnv = process.env.NODE_ENV === 'test'

		const successCallbacks: Array<(res: unknown) => void> = []
		const failureCallbacks: Array<(err: unknown) => void> = []
		const finallyCallbacks: Array<() => void> = []

		try {
			const warmUpEvent = getWarmUpEvent(event)

			if (warmUpEvent) {
				await warmUp(warmUpEvent)
				// @ts-ignore
				return undefined
			}

			const result = await createTimeoutWrap(context, log, () => {
				return transformValidationErrors(() => {
					const raw = typeof event === 'undefined' || isTestEnv ? event : patch(event)
					const input: Output<S> = options.schema ? valiParse(options.schema, raw) : raw
					const extendedContext: ExtendedContext = {
						// ...(context ?? {}),
						event: input,
						context,
						raw,
						log,
						onSuccess(cb) {
							successCallbacks.push(cb)
						},
						onFailure(cb) {
							failureCallbacks.push(cb)
						},
						onFinally(cb) {
							finallyCallbacks.push(cb)
						},
					}

					return eventContext.run(extendedContext, () => {
						return options.handle(input, extendedContext)
					})
				})
			})

			await Promise.all(successCallbacks.map(cb => cb(result)))

			if (isTestEnv) {
				return parse(stringify(result))
			}

			return unpatch(result)
		} catch (error) {
			await Promise.all(failureCallbacks.map(cb => cb(error)))

			if ((!(error instanceof ViewableError) && !(error instanceof ExpectedError)) || options.logViewableErrors) {
				await log(error)
			}

			if (!isTestEnv) {
				if (error instanceof ViewableError) {
					return toErrorResponse(error)
				}

				if (error instanceof ExpectedError) {
					return toErrorResponse(error)
				}
			}

			throw error
		} finally {
			await Promise.all(finallyCallbacks.map(cb => cb()))
		}
	}) as LambdaFunction<H, S>
}
