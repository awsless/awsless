import { parse, patch, stringify, unpatch } from '@awsless/json'
import { parse as valiParse } from '@awsless/validate'
import { Context } from 'aws-lambda'
import { eventContext } from './context/lambda-context.js'
import { enhanceError } from './errors/enhanced.js'
import { ExpectedError } from './errors/expected.js'
import { toErrorResponse } from './errors/response.js'
import { createTimeoutWrap } from './errors/timeout.js'
import { transformValidationErrors } from './errors/validation.js'
import { ViewableError } from './errors/viewable.js'
import { isTestEnv } from './helpers/env.js'
import { normalizeError } from './helpers/error.js'
import { Context as ExtendedContext, Handler, Input, Logger, Loggers, Output, Schema } from './type.js'

interface Options<H extends Handler<S>, S extends Schema = undefined> {
	/** A validation schema for the input. */
	schema?: S

	/** The handler, receiving the validated input & the extended context. */
	handle: H

	/** Logging functions called when an error is thrown. */
	logger?: Loggers

	/**
	 * Whether expected errors throw & log instead of returning as an
	 * error response. A function is evaluated per invocation.
	 * @default false
	 */
	throwExpectedErrors?: boolean | (() => boolean)
}

export type LambdaFactory = {
	<H extends Handler>(options: Options<H>): (event?: unknown, context?: Context) => Promise<Awaited<ReturnType<H>>>
	<H extends Handler<S>, S extends Schema>(
		options: Options<H, S>
	): (event: Input<S>, context?: Context) => Promise<Awaited<ReturnType<H>>>
}

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
				list.map(async logger => {
					await logger?.(error, {
						input: event,
					})
				})
			)
		}

		const isTest = isTestEnv()

		const successCallbacks: Array<(res: unknown) => unknown> = []
		const failureCallbacks: Array<(err: unknown) => unknown> = []
		const finallyCallbacks: Array<() => unknown> = []

		try {
			const result = await createTimeoutWrap(options.schema, event, context, log, () => {
				return transformValidationErrors(() => {
					const raw = typeof event === 'undefined' || isTest ? event : patch(event)
					const input: Output<S> = options.schema ? valiParse(options.schema, raw) : raw
					const extendedContext: ExtendedContext = {
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

			if (isTest) {
				return parse(
					stringify(result, {
						preserveUndefinedValues: true,
					})
				)
			}

			return unpatch(result)
		} catch (error) {
			await Promise.all(failureCallbacks.map(cb => cb(error)))

			const isExpectedError = error instanceof ViewableError || error instanceof ExpectedError
			const throwExpectedErrors =
				typeof options.throwExpectedErrors === 'function'
					? options.throwExpectedErrors()
					: !!options.throwExpectedErrors

			if (!isExpectedError || throwExpectedErrors) {
				await log(error)
			}

			if (!isTest && !throwExpectedErrors && isExpectedError) {
				return toErrorResponse(error)
			}

			if (!isTest) {
				throw enhanceError(normalizeError(error), options.schema, event, context)
			}

			throw error
		} finally {
			await Promise.all(finallyCallbacks.map(cb => cb()))
		}
	}) as LambdaFunction<H, S>
}
