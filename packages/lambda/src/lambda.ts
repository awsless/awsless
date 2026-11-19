import { parse, patch, stringify, unpatch } from '@awsless/json'
import { applyRedaction } from '@awsless/validate'
import { Context } from 'aws-lambda'
import { enhanceError } from './errors/enhanced.js'
import { ExpectedError } from './errors/expected.js'
import { toErrorResponse } from './errors/response.js'
import { isTestEnv } from './helpers/env.js'
import { normalizeError } from './helpers/error.js'
import { runInvocation } from './invocation.js'
import { Handler, Input, Logger, Loggers, Output, Schema } from './type.js'

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
						// Without what the schema marks as secret or personal.
						input: options.schema ? applyRedaction(options.schema, event) : event,
					})
				})
			)
		}

		const isTest = isTestEnv()
		const raw = typeof event === 'undefined' || isTest ? event : patch(event)
		const invocation = await runInvocation({
			schema: options.schema,
			input: raw,
			raw,
			context,
			log,
			handle: (input, extendedContext) => options.handle(input as Output<S>, extendedContext),
		})

		let shouldThrowExpectedErrors: boolean | undefined

		// An expected error is returned as an error response, unless its caller wants it thrown.
		const isReturnedError = (error: unknown): error is ExpectedError => {
			// Asked once, so the log and the answer agree.
			shouldThrowExpectedErrors ??=
				typeof options.throwExpectedErrors === 'function'
					? options.throwExpectedErrors()
					: !!options.throwExpectedErrors

			return error instanceof ExpectedError && !shouldThrowExpectedErrors
		}

		const logThrownError = async (error: unknown) => {
			if (!isReturnedError(error)) {
				await log(error)
			}
		}

		// A finished invocation's error: returned as an error response, or thrown.
		const returnOrThrowError = (error: unknown) => {
			if (isTest) {
				throw error
			}

			if (isReturnedError(error)) {
				return toErrorResponse(error)
			}

			throw enhanceError(normalizeError(error), options.schema, event, context)
		}

		if (!invocation.isSuccessful) {
			try {
				await logThrownError(invocation.error)
			} finally {
				// After the log, so its spans go out with the traces.
				await invocation.finishInvocation({ error: invocation.error })
			}

			return returnOrThrowError(invocation.error)
		}

		try {
			await invocation.finishInvocation()
		} catch (error) {
			// A success callback failed the run, which is finished: the log's spans wait for the next flush.
			await logThrownError(error)

			return returnOrThrowError(error)
		}

		if (isTest) {
			return parse(
				stringify(invocation.result, {
					preserveUndefinedValues: true,
				})
			)
		}

		return unpatch(invocation.result)
	}) as LambdaFunction<H, S>
}
